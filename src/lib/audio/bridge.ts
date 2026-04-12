import { bandwidthToQ } from './dsp/formant-utils.ts';
import { voiceParams } from './state.svelte.ts';

/**
 * AudioBridge: connects the Svelte VoiceParams store to the Web Audio graph.
 *
 * Responsibilities:
 * - Creates AudioContext and loads the glottal worklet processor
 * - Builds a parallel formant filter chain (4 BiquadFilterNodes, D-08)
 * - Forwards all parameter changes via setTargetAtTime (AUDIO-06, no zipper noise)
 * - Handles AudioContext resume on user gesture (AUDIO-08, D-06)
 * - Start/stop playback control
 */
export class AudioBridge {
  private ctx: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private formants: BiquadFilterNode[] = [];
  private formantGains: GainNode[] = [];
  private sumGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private initialized = false;

  /**
   * Initialize the audio context, load the worklet, and build the graph.
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    this.ctx = new AudioContext();

    // Load worklet processor with TS fallback (RESEARCH.md Q1)
    try {
      const workletUrl = new URL('./worklet/glottal-processor.ts', import.meta.url);
      await this.ctx.audioWorklet.addModule(workletUrl);
    } catch (primaryErr) {
      // Fallback: Vite did not transpile .ts for addModule — try .js
      try {
        const fallbackUrl = new URL('./worklet/glottal-processor.js', import.meta.url);
        await this.ctx.audioWorklet.addModule(fallbackUrl);
      } catch (fallbackErr) {
        console.error('Primary worklet load failed:', primaryErr);
        throw fallbackErr;
      }
    }

    // Create the glottal source worklet node
    this.workletNode = new AudioWorkletNode(this.ctx, 'glottal-processor');

    // Build the parallel formant chain (D-08)
    this.buildFormantChain();

    this.initialized = true;
  }

  /**
   * Build the parallel formant filter topology:
   *
   * GlottalWorkletNode --+--> BiquadF1 --> GainF1 --+
   *                      +--> BiquadF2 --> GainF2 --+--> SumGain --> MasterGain --> destination
   *                      +--> BiquadF3 --> GainF3 --+
   *                      +--> BiquadF4 --> GainF4 --+
   */
  private buildFormantChain(): void {
    if (!this.ctx || !this.workletNode) return;

    const now = this.ctx.currentTime;

    // Sum node: collects all formant outputs
    this.sumGain = this.ctx.createGain();
    this.sumGain.gain.setTargetAtTime(1.0, now, 0.01);

    // Master volume control
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setTargetAtTime(voiceParams.masterGain, now, 0.01);
    this.masterGain.connect(this.ctx.destination);
    this.sumGain.connect(this.masterGain);

    // Default formant values: male /a/ (per D-01)
    const formantDefaults = [
      { freq: voiceParams.f1Freq, bw: voiceParams.f1BW, gain: voiceParams.f1Gain },
      { freq: voiceParams.f2Freq, bw: voiceParams.f2BW, gain: voiceParams.f2Gain },
      { freq: voiceParams.f3Freq, bw: voiceParams.f3BW, gain: voiceParams.f3Gain },
      { freq: voiceParams.f4Freq, bw: voiceParams.f4BW, gain: voiceParams.f4Gain },
    ];

    this.formants = [];
    this.formantGains = [];

    for (let i = 0; i < 4; i++) {
      const { freq, bw, gain } = formantDefaults[i];

      // Create bandpass filter for this formant
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setTargetAtTime(freq, now, 0.02);
      filter.Q.setTargetAtTime(bandwidthToQ(freq, bw), now, 0.02);
      this.formants.push(filter);

      // Create per-formant gain node
      const gainNode = this.ctx.createGain();
      gainNode.gain.setTargetAtTime(gain, now, 0.01);
      this.formantGains.push(gainNode);

      // Wire: worklet --> filter --> gain --> sum
      this.workletNode.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.sumGain);
    }
  }

  /**
   * Resume AudioContext (required for cross-browser support).
   * Must be called from a user gesture handler (AUDIO-08, D-06).
   */
  async resume(): Promise<AudioContextState> {
    if (!this.ctx) throw new Error('AudioBridge not initialized');
    await this.ctx.resume();
    return this.ctx.state;
  }

  /**
   * Synchronize all VoiceParams to the Web Audio graph.
   * Uses setTargetAtTime for all AudioParam changes (AUDIO-06).
   */
  syncParams(): void {
    if (!this.ctx || !this.workletNode || this.formants.length === 0 || !this.masterGain) return;

    const now = this.ctx.currentTime;

    // Forward formant parameters (F1-F4) via setTargetAtTime
    const formantData = [
      { freq: voiceParams.f1Freq, bw: voiceParams.f1BW, gain: voiceParams.f1Gain },
      { freq: voiceParams.f2Freq, bw: voiceParams.f2BW, gain: voiceParams.f2Gain },
      { freq: voiceParams.f3Freq, bw: voiceParams.f3BW, gain: voiceParams.f3Gain },
      { freq: voiceParams.f4Freq, bw: voiceParams.f4BW, gain: voiceParams.f4Gain },
    ];

    for (let i = 0; i < 4; i++) {
      const { freq, bw, gain } = formantData[i];
      this.formants[i].frequency.setTargetAtTime(freq, now, 0.02);
      this.formants[i].Q.setTargetAtTime(bandwidthToQ(freq, bw), now, 0.02);
      this.formantGains[i].gain.setTargetAtTime(gain, now, 0.01);
    }

    // Mute: gain 0 via fast ramp. Volume slider position preserved in store (D-14).
    const effectiveGain = voiceParams.muted ? 0 : voiceParams.masterGain;
    this.masterGain.gain.setTargetAtTime(effectiveGain, now, 0.005);

    // Forward worklet params via postMessage (f0, aspiration, OQ, vibrato, jitter, tilt)
    this.workletNode.port.postMessage({
      type: 'params',
      f0: voiceParams.f0,
      aspirationLevel: voiceParams.aspirationLevel,
      openQuotient: voiceParams.openQuotient,
      vibratoRate: voiceParams.vibratoRate,
      vibratoExtent: voiceParams.vibratoExtent,
      jitterAmount: voiceParams.jitterAmount,
      spectralTilt: voiceParams.spectralTilt,
    });
  }

  /**
   * Start audio playback. Ensures context is resumed first.
   */
  async start(): Promise<void> {
    if (!this.ctx || !this.masterGain) throw new Error('AudioBridge not initialized');
    await this.resume();
    // Cancel any in-flight stop ramp before restoring gain (WR-03)
    this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
    // syncParams to ensure current state is applied
    this.syncParams();
  }

  /**
   * Stop audio playback. Ramps master gain to 0, then disconnects.
   */
  stop(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    // Fast ramp to 0 to avoid click
    this.masterGain.gain.setTargetAtTime(0, now, 0.005);
  }

  /**
   * Close the AudioContext and clean up all nodes.
   */
  async destroy(): Promise<void> {
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    for (const filter of this.formants) {
      filter.disconnect();
    }
    for (const gain of this.formantGains) {
      gain.disconnect();
    }
    if (this.sumGain) {
      this.sumGain.disconnect();
      this.sumGain = null;
    }
    if (this.masterGain) {
      this.masterGain.disconnect();
      this.masterGain = null;
    }
    if (this.ctx) {
      await this.ctx.close();
      this.ctx = null;
    }
    this.formants = [];
    this.formantGains = [];
    this.initialized = false;
  }
}
