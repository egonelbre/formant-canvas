import { bandwidthToQ } from './dsp/formant-utils.ts';
import { voiceParams } from './state.svelte.ts';
import type { GlottalModel } from '../types.ts';
import glottalProcessorUrl from './worklet/glottal-processor.ts?worker&url';

/**
 * AudioBridge: connects the Svelte VoiceParams store to the Web Audio graph.
 *
 * Responsibilities:
 * - Creates AudioContext and loads the glottal worklet processor
 * - Builds a parallel formant filter chain (5 BiquadFilterNodes, D-08, D-13)
 * - Forwards all parameter changes via setTargetAtTime (AUDIO-06, no zipper noise)
 * - Handles AudioContext resume on user gesture (AUDIO-08, D-06)
 * - Start/stop playback control
 */
export class AudioBridge {
  private ctx: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private formantBiquadsA: BiquadFilterNode[] = [];
  private formantBiquadsB: BiquadFilterNode[] = [];  // Secondary biquads (4th-order)
  private formantGains: GainNode[] = [];
  private sumGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private convolver: ConvolverNode | null = null;
  private initialized = false;

  /**
   * Initialize the audio context, load the worklet, and build the graph.
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    this.ctx = new AudioContext();

    // Load worklet processor via Vite ?url import (transpiled to JS in production)
    await this.ctx.audioWorklet.addModule(glottalProcessorUrl);

    // Create the glottal source worklet node
    this.workletNode = new AudioWorkletNode(this.ctx, 'glottal-processor');

    // Build the parallel formant chain (D-08)
    this.buildFormantChain();

    this.initialized = true;
  }

  /**
   * Build all formant filter nodes and wire in parallel topology (default).
   * Creates both A and B biquad pools upfront; B pool used only in 4th-order mode.
   */
  private buildFormantChain(): void {
    if (!this.ctx || !this.workletNode) return;

    const now = this.ctx.currentTime;

    // Sum node: collects all formant outputs (parallel mode)
    this.sumGain = this.ctx.createGain();
    this.sumGain.gain.setTargetAtTime(1.0, now, 0.01);

    // Master volume control
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setTargetAtTime(voiceParams.masterGain, now, 0.01);

    // Reverb: dry/wet send from masterGain
    this.dryGain = this.ctx.createGain();
    this.dryGain.gain.setTargetAtTime(0.85, now, 0.01);

    this.wetGain = this.ctx.createGain();
    this.wetGain.gain.setTargetAtTime(0.15, now, 0.01);

    this.convolver = this.ctx.createConvolver();
    this.convolver.buffer = this.generateReverbIR(this.ctx, 1.2, 2.5);

    // masterGain --> dryGain --> destination
    //           \-> convolver --> wetGain --> destination
    this.masterGain.connect(this.dryGain);
    this.dryGain.connect(this.ctx.destination);
    this.masterGain.connect(this.convolver);
    this.convolver.connect(this.wetGain);
    this.wetGain.connect(this.ctx.destination);

    const formantDefaults = [
      { freq: voiceParams.f1Freq, bw: voiceParams.f1BW, gain: voiceParams.f1Gain },
      { freq: voiceParams.f2Freq, bw: voiceParams.f2BW, gain: voiceParams.f2Gain },
      { freq: voiceParams.f3Freq, bw: voiceParams.f3BW, gain: voiceParams.f3Gain },
      { freq: voiceParams.f4Freq, bw: voiceParams.f4BW, gain: voiceParams.f4Gain },
      { freq: voiceParams.f5Freq, bw: voiceParams.f5BW, gain: voiceParams.f5Gain },
    ];

    this.formantBiquadsA = [];
    this.formantBiquadsB = [];
    this.formantGains = [];

    for (let i = 0; i < 5; i++) {
      const { freq, bw, gain } = formantDefaults[i];
      const q = bandwidthToQ(freq, bw);

      // Primary biquad (always active)
      const filterA = this.ctx.createBiquadFilter();
      filterA.type = 'bandpass';
      filterA.frequency.setTargetAtTime(freq, now, 0.02);
      filterA.Q.setTargetAtTime(q, now, 0.02);
      this.formantBiquadsA.push(filterA);

      // Secondary biquad (4th-order only — same params, created but not connected)
      const filterB = this.ctx.createBiquadFilter();
      filterB.type = 'bandpass';
      filterB.frequency.setTargetAtTime(freq, now, 0.02);
      filterB.Q.setTargetAtTime(q, now, 0.02);
      this.formantBiquadsB.push(filterB);

      // Per-formant gain node (parallel mode only)
      const gainNode = this.ctx.createGain();
      gainNode.gain.setTargetAtTime(gain, now, 0.01);
      this.formantGains.push(gainNode);
    }

    // Wire in parallel topology by default
    this.buildParallelChain();
  }

  /**
   * Wire parallel topology: worklet fans out to each biquad -> gain -> sumGain.
   * If 4th-order, B biquads are inserted between A and gain.
   */
  private buildParallelChain(): void {
    if (!this.ctx || !this.workletNode || !this.sumGain || !this.masterGain) return;

    // Disconnect all formant-related nodes
    this.disconnectFormantNodes();

    this.sumGain.connect(this.masterGain);

    const fourthOrder = voiceParams.filterOrder === 4;
    for (let i = 0; i < 5; i++) {
      this.workletNode.connect(this.formantBiquadsA[i]);
      if (fourthOrder) {
        this.formantBiquadsA[i].connect(this.formantBiquadsB[i]);
        this.formantBiquadsB[i].connect(this.formantGains[i]);
      } else {
        this.formantBiquadsA[i].connect(this.formantGains[i]);
      }
      this.formantGains[i].connect(this.sumGain);
    }
  }

  /**
   * Disconnect all formant-related nodes so the chain can be rewired.
   */
  private disconnectFormantNodes(): void {
    if (this.workletNode) {
      try { this.workletNode.disconnect(); } catch { /* already disconnected */ }
    }
    for (const f of this.formantBiquadsA) {
      try { f.disconnect(); } catch { /* ok */ }
    }
    for (const f of this.formantBiquadsB) {
      try { f.disconnect(); } catch { /* ok */ }
    }
    for (const g of this.formantGains) {
      try { g.disconnect(); } catch { /* ok */ }
    }
    if (this.sumGain) {
      try { this.sumGain.disconnect(); } catch { /* ok */ }
    }
  }

  /**
   * Toggle filter order with mute-crossfade (no clicks).
   * Rebuilds parallel chain with new order.
   */
  async toggleFilterOrder(newOrder: 2 | 4): Promise<void> {
    if (!this.ctx || !this.masterGain) {
      voiceParams.filterOrder = newOrder;
      return;
    }
    const now = this.ctx.currentTime;
    const prevGain = voiceParams.masterGain;

    this.masterGain.gain.setTargetAtTime(0, now, 0.015);

    setTimeout(() => {
      voiceParams.filterOrder = newOrder;
      this.buildParallelChain();
      this.syncParams();
      if (this.ctx && this.masterGain) {
        const t = this.ctx.currentTime;
        const effectiveGain = (!voiceParams.playing || voiceParams.muted) ? 0 : prevGain;
        this.masterGain.gain.setTargetAtTime(effectiveGain, t, 0.015);
      }
    }, 50);
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
    if (!this.ctx || !this.workletNode || this.formantBiquadsA.length === 0 || !this.masterGain) return;

    const now = this.ctx.currentTime;

    // Forward formant parameters (F1-F5) via setTargetAtTime
    const formantData = [
      { freq: voiceParams.f1Freq, bw: voiceParams.f1BW, gain: voiceParams.f1Gain },
      { freq: voiceParams.f2Freq, bw: voiceParams.f2BW, gain: voiceParams.f2Gain },
      { freq: voiceParams.f3Freq, bw: voiceParams.f3BW, gain: voiceParams.f3Gain },
      { freq: voiceParams.f4Freq, bw: voiceParams.f4BW, gain: voiceParams.f4Gain },
      { freq: voiceParams.f5Freq, bw: voiceParams.f5BW, gain: voiceParams.f5Gain },
    ];

    // Time constant for formant frequency/Q smoothing (STRAT-03: smooth transitions)
    const formantTC = 0.06;
    for (let i = 0; i < 5; i++) {
      const { freq, bw, gain } = formantData[i];
      const q = bandwidthToQ(freq, bw);

      // Update both A and B biquads (keep B in sync even when disconnected)
      this.formantBiquadsA[i].frequency.setTargetAtTime(freq, now, formantTC);
      this.formantBiquadsA[i].Q.setTargetAtTime(q, now, formantTC);
      this.formantBiquadsB[i].frequency.setTargetAtTime(freq, now, formantTC);
      this.formantBiquadsB[i].Q.setTargetAtTime(q, now, formantTC);

      this.formantGains[i].gain.setTargetAtTime(gain, now, 0.01);
    }

    // Mute or stopped: gain 0. Volume slider position preserved in store (D-14).
    const effectiveGain = (!voiceParams.playing || voiceParams.muted) ? 0 : voiceParams.masterGain;
    this.masterGain.gain.setTargetAtTime(effectiveGain, now, 0.005);

    // Forward worklet params via postMessage (f0, aspiration, OQ, vibrato, jitter, tilt, model, rd)
    this.workletNode.port.postMessage({
      type: 'params',
      f0: voiceParams.f0,
      aspirationLevel: voiceParams.aspirationLevel,
      openQuotient: voiceParams.openQuotient,
      vibratoRate: voiceParams.vibratoRate,
      vibratoExtent: voiceParams.vibratoExtent,
      jitterAmount: voiceParams.jitterAmount,
      spectralTilt: voiceParams.spectralTilt,
      glottalModel: voiceParams.glottalModel,
      rd: voiceParams.rd,
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
   * Switch glottal model with mute-crossfade (D-02).
   * Fades out over ~50ms, swaps model, fades back in.
   * This is the ONLY path for model changes — UI must not set voiceParams.glottalModel directly.
   */
  async switchModel(newModel: GlottalModel): Promise<void> {
    if (!this.ctx || !this.masterGain || !this.workletNode) {
      // Not initialized yet — just set the state directly
      voiceParams.glottalModel = newModel;
      return;
    }
    const now = this.ctx.currentTime;
    const prevGain = voiceParams.masterGain;

    // Fade out over ~50ms (timeConstant ~0.015 gives 3*tau = 45ms to ~95% attenuation)
    this.masterGain.gain.setTargetAtTime(0, now, 0.015);

    // After 50ms, send model switch and fade back in
    setTimeout(() => {
      voiceParams.glottalModel = newModel;
      this.syncParams();
      if (this.ctx && this.masterGain) {
        const t = this.ctx.currentTime;
        const effectiveGain = (!voiceParams.playing || voiceParams.muted) ? 0 : prevGain;
        this.masterGain.gain.setTargetAtTime(effectiveGain, t, 0.015);
      }
    }, 50);
  }

  /**
   * Generate a synthetic reverb impulse response.
   * Exponentially decaying noise — simple but effective for a small room feel.
   */
  private generateReverbIR(ctx: AudioContext, duration: number, decay: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate / decay));
      }
    }
    return buffer;
  }

  /**
   * Close the AudioContext and clean up all nodes.
   */
  async destroy(): Promise<void> {
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    for (const filter of this.formantBiquadsA) {
      filter.disconnect();
    }
    for (const filter of this.formantBiquadsB) {
      filter.disconnect();
    }
    for (const gain of this.formantGains) {
      gain.disconnect();
    }
    if (this.sumGain) {
      this.sumGain.disconnect();
      this.sumGain = null;
    }
    if (this.convolver) {
      this.convolver.disconnect();
      this.convolver = null;
    }
    if (this.dryGain) {
      this.dryGain.disconnect();
      this.dryGain = null;
    }
    if (this.wetGain) {
      this.wetGain.disconnect();
      this.wetGain = null;
    }
    if (this.masterGain) {
      this.masterGain.disconnect();
      this.masterGain = null;
    }
    if (this.ctx) {
      await this.ctx.close();
      this.ctx = null;
    }
    this.formantBiquadsA = [];
    this.formantBiquadsB = [];
    this.formantGains = [];
    this.initialized = false;
  }
}

/** Singleton AudioBridge instance — shared across components */
export const audioBridge = new AudioBridge();
