// ─────────────────────────────────────────────────────────────
// WorldWheel.jsx — civilisational-wheel adapter
//
// Thin wrapper over the unified <Wheel> instrument so the planet wheel
// and the personal wheel render through the same code. Prop signature
// preserved ({ dimensions, current, placement, size, dark }) so the
// WorldView panel, Mission Control, and First Light keep working.
//
// The upgrade comes for free: graded reference rings and the Pass/Fail
// line now render on the planet wheel too. Headed (the collective
// desired-world web) is supported by <Wheel> via a `headed` prop — wire
// it through here once the aggregate signal is defined.
//
// dimensions: Array<{ slug, label, color? }>  — Wheel normalises slug→key.
// ─────────────────────────────────────────────────────────────

import Wheel from '../Wheel'

export default function WorldWheel({ dimensions, current = {}, placement = null, size = 320, dark = false }) {
  return (
    <Wheel
      domains={dimensions}
      now={current}
      placement={placement}
      size={size}
      dark={dark}
    />
  )
}
