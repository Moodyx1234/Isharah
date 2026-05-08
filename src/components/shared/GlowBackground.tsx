import s from "./GlowBackground.module.css";

interface GlowBackgroundProps {
  /** Accent color for the ambient blobs */
  color?: "teal" | "amber";
  /** CSS position — "fixed" keeps blobs in place while page scrolls */
  position?: "absolute" | "fixed";
}

/**
 * Drop-in ambient background layer: two drifting radial glow blobs
 * and a subtle 60px grid texture. Renders at z-index 0.
 *
 * Usage: place as first children inside any page root with
 * `position: relative` (absolute) or standalone (fixed).
 */
export function GlowBackground({ color = "teal", position = "absolute" }: GlowBackgroundProps) {
  const isAmber = color === "amber";
  return (
    <>
      <div className={s.blobBg} style={{ position }} aria-hidden="true">
        <div className={`${s.blob} ${s.blob1} ${isAmber ? s.blob1Amber : s.blob1Teal}`} />
        <div className={`${s.blob} ${s.blob2} ${isAmber ? s.blob2Amber : s.blob2Teal}`} />
      </div>
      <div className={s.gridTex} style={{ position }} aria-hidden="true" />
    </>
  );
}
