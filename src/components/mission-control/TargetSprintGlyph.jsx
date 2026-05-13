// ─────────────────────────────────────────────────────────────
// TargetSprintGlyph — rail tile artwork for Target Sprint.
//
// Wraps /public/target-sprint-logo.png (the bullseye + compass
// rose + 13-week grid logo). The full logo carries: aim
// (bullseye), bearing (compass spokes), and time (the grid).
//
// Static — no animation. Only the Horizon State gauge animates,
// because state is its meaning. Target Sprint's surface meaning
// lives in the state line below the glyph (WEEK N / 13).
//
// Sizing matches the rail-glyph cascade: 28 / 24 / 22.
// ─────────────────────────────────────────────────────────────

export default function TargetSprintGlyph() {
  return (
    <>
      <img
        src="/target-sprint-logo.png"
        alt=""
        className="ts-glyph"
        style={{
          width: 28,
          height: 28,
          objectFit: 'contain',
          display: 'block',
        }}
      />
      <style>{`
        @media (max-width: 1024px) {
          .ts-glyph { width: 24px !important; height: 24px !important; }
        }
        @media (max-width: 640px) {
          .ts-glyph { width: 22px !important; height: 22px !important; }
        }
      `}</style>
    </>
  )
}
