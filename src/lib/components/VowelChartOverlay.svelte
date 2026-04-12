<script lang="ts">
  import { HILLENBRAND_VOWELS } from '../data/hillenbrand.ts';
  import type { SpeakerGroup } from '../data/hillenbrand.ts';

  interface Props {
    group: SpeakerGroup;
    f1Scale: (hz: number) => number;
    f2Scale: (hz: number) => number;
  }
  let { group, f1Scale, f2Scale }: Props = $props();

  /**
   * Compute convex hull of 2D points using Graham scan.
   * Returns points in counter-clockwise order.
   */
  function convexHull(points: { x: number; y: number }[]): { x: number; y: number }[] {
    if (points.length < 3) return [...points];

    // Find the bottom-most point (highest SVG y), then leftmost
    const sorted = [...points].sort((a, b) => b.y - a.y || a.x - b.x);
    const pivot = sorted[0];

    // Sort by polar angle relative to pivot
    const rest = sorted.slice(1).sort((a, b) => {
      const angleA = Math.atan2(a.y - pivot.y, a.x - pivot.x);
      const angleB = Math.atan2(b.y - pivot.y, b.x - pivot.x);
      if (angleA !== angleB) return angleA - angleB;
      // Same angle: closer point first
      const distA = (a.x - pivot.x) ** 2 + (a.y - pivot.y) ** 2;
      const distB = (b.x - pivot.x) ** 2 + (b.y - pivot.y) ** 2;
      return distA - distB;
    });

    const hull: { x: number; y: number }[] = [pivot];
    for (const p of rest) {
      while (hull.length >= 2) {
        const a = hull[hull.length - 2];
        const b = hull[hull.length - 1];
        const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
        if (cross <= 0) {
          hull.pop();
        } else {
          break;
        }
      }
      hull.push(p);
    }
    return hull;
  }

  // Overlay colors by group
  const GROUP_COLORS: Record<SpeakerGroup, string> = {
    men: '#3b82f6',
    women: '#f97316',
    child: '#22c55e',
  };

  // Derived: convex hull points as SVG polygon string
  let hullPoints = $derived.by(() => {
    const svgPoints = HILLENBRAND_VOWELS.map((v) => {
      const data = v[group];
      return { x: f2Scale(data.f2), y: f1Scale(data.f1) };
    });
    const hull = convexHull(svgPoints);
    return hull.map((p) => `${p.x},${p.y}`).join(' ');
  });

  let color = $derived(GROUP_COLORS[group]);
</script>

<g class="vowel-chart-overlay">
  <polygon
    points={hullPoints}
    fill={color}
    fill-opacity="0.1"
    stroke={color}
    stroke-opacity="0.3"
    stroke-width="1"
    stroke-dasharray="4 4"
  />
</g>
