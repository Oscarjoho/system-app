interface Props { size?: 'sm' | 'md' }

export default function CharacterFigure({ size = 'md' }: Props) {
  const [w, h] = size === 'sm' ? [55, 116] : [90, 190]
  return (
    <svg
      viewBox="0 0 200 420"
      width={w}
      height={h}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ── Head ── */}
      <ellipse cx="100" cy="30" rx="22" ry="26" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.5" />

      {/* ── Neck ── */}
      <rect x="90" y="54" width="20" height="16" rx="4" fill="#1e293b" stroke="#94a3b8" strokeWidth="1" />

      {/* ── Traps ── */}
      <ellipse cx="70" cy="72" rx="18" ry="10" fill="#1e3a5f" stroke="#60a5fa" strokeWidth="1" />
      <ellipse cx="130" cy="72" rx="18" ry="10" fill="#1e3a5f" stroke="#60a5fa" strokeWidth="1" />

      {/* ── Chest / Pecs ── */}
      <ellipse cx="83" cy="100" rx="24" ry="20" fill="#1e3a5f" stroke="#60a5fa" strokeWidth="1.2" />
      <ellipse cx="117" cy="100" rx="24" ry="20" fill="#1e3a5f" stroke="#60a5fa" strokeWidth="1.2" />

      {/* ── Shoulders ── */}
      <ellipse cx="57" cy="90" rx="18" ry="16" fill="#1e3a5f" stroke="#60a5fa" strokeWidth="1" />
      <ellipse cx="143" cy="90" rx="18" ry="16" fill="#1e3a5f" stroke="#60a5fa" strokeWidth="1" />

      {/* ── Upper abs (6-pack) ── */}
      <rect x="83" y="118" width="15" height="13" rx="4" fill="#1d3d2f" stroke="#475569" strokeWidth="1" />
      <rect x="102" y="118" width="15" height="13" rx="4" fill="#1d3d2f" stroke="#475569" strokeWidth="1" />
      <rect x="83" y="134" width="15" height="13" rx="4" fill="#1d3d2f" stroke="#475569" strokeWidth="1" />
      <rect x="102" y="134" width="15" height="13" rx="4" fill="#1d3d2f" stroke="#475569" strokeWidth="1" />
      <rect x="83" y="150" width="15" height="13" rx="4" fill="#1d3d2f" stroke="#475569" strokeWidth="1" />
      <rect x="102" y="150" width="15" height="13" rx="4" fill="#1d3d2f" stroke="#475569" strokeWidth="1" />

      {/* ── Lower abs ── */}
      <ellipse cx="91" cy="174" rx="9" ry="8" fill="#152b22" stroke="#475569" strokeWidth="1" />
      <ellipse cx="109" cy="174" rx="9" ry="8" fill="#152b22" stroke="#475569" strokeWidth="1" />

      {/* ── Upper arms (bicep) ── */}
      <ellipse cx="42" cy="130" rx="12" ry="22" fill="#1a3a1a" stroke="#4ade80" strokeWidth="1" opacity="0.85" />
      <ellipse cx="158" cy="130" rx="12" ry="22" fill="#1a3a1a" stroke="#4ade80" strokeWidth="1" opacity="0.85" />

      {/* ── Forearms ── */}
      <rect x="30" y="155" width="22" height="38" rx="8" fill="#1e293b" stroke="#94a3b8" strokeWidth="1" />
      <rect x="148" y="155" width="22" height="38" rx="8" fill="#1e293b" stroke="#94a3b8" strokeWidth="1" />

      {/* ── Hands ── */}
      <ellipse cx="41" cy="203" rx="10" ry="8" fill="#1e293b" stroke="#94a3b8" strokeWidth="1" />
      <ellipse cx="159" cy="203" rx="10" ry="8" fill="#1e293b" stroke="#94a3b8" strokeWidth="1" />

      {/* ── Hips / Pelvis ── */}
      <rect x="76" y="184" width="48" height="28" rx="8" fill="#0f172a" stroke="#334155" strokeWidth="1" />

      {/* ── Quads ── */}
      <ellipse cx="88" cy="255" rx="20" ry="46" fill="#2a1f0e" stroke="#78716c" strokeWidth="1.2" />
      <ellipse cx="112" cy="255" rx="20" ry="46" fill="#2a1f0e" stroke="#78716c" strokeWidth="1.2" />

      {/* ── Knees ── */}
      <ellipse cx="88" cy="303" rx="13" ry="10" fill="#1e293b" stroke="#475569" strokeWidth="1" />
      <ellipse cx="112" cy="303" rx="13" ry="10" fill="#1e293b" stroke="#475569" strokeWidth="1" />

      {/* ── Calves ── */}
      <ellipse cx="88" cy="345" rx="13" ry="34" fill="#2d0a0a" stroke="#7f1d1d" strokeWidth="1" />
      <ellipse cx="112" cy="345" rx="13" ry="34" fill="#2d0a0a" stroke="#7f1d1d" strokeWidth="1" />

      {/* ── Feet ── */}
      <ellipse cx="88" cy="385" rx="14" ry="7" fill="#1e293b" stroke="#94a3b8" strokeWidth="1" />
      <ellipse cx="112" cy="385" rx="14" ry="7" fill="#1e293b" stroke="#94a3b8" strokeWidth="1" />
    </svg>
  )
}
