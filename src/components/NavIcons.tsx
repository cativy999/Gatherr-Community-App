/**
 * NavIcons — custom outline icon set matching the Figma community design.
 * All icons are 24×24 SVG, stroke-based, no fill.
 * Use `size` prop to scale, `className` for color overrides.
 */

interface IconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

const base = (strokeWidth = 1.5) => ({
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

// ── Home (pentagon + dash) ──────────────────────────────────────────────────
export const HomeIcon = ({ size = 24, className = "", strokeWidth = 1.5 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    className={className}
    aria-hidden="true"
  >
    <polygon
      points="12,3 20.5,9.2 17.3,19.3 6.7,19.3 3.5,9.2"
      {...base(strokeWidth)}
    />
    <line x1="9.5" y1="13.5" x2="14.5" y2="13.5" {...base(strokeWidth)} />
  </svg>
);

// ── Search / "Q" icon (magnifying glass) ────────────────────────────────────
export const SearchIcon = ({ size = 24, className = "", strokeWidth = 1.5 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    className={className}
    aria-hidden="true"
  >
    <circle cx="10.5" cy="10.5" r="6.5" {...base(strokeWidth)} />
    <line x1="15.5" y1="15.5" x2="20.5" y2="20.5" {...base(strokeWidth)} />
  </svg>
);

// ── Add (rounded square + cross) ────────────────────────────────────────────
export const AddIcon = ({ size = 24, className = "", strokeWidth = 1.5 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    className={className}
    aria-hidden="true"
  >
    <rect x="3" y="3" width="18" height="18" rx="4" {...base(strokeWidth)} />
    <line x1="12" y1="7.5" x2="12" y2="16.5" {...base(strokeWidth)} />
    <line x1="7.5" y1="12" x2="16.5" y2="12" {...base(strokeWidth)} />
  </svg>
);

// ── Chat (speech bubble + three dots) ───────────────────────────────────────
export const ChatIcon = ({ size = 24, className = "", strokeWidth = 1.5 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M20 3H4C3.4 3 3 3.4 3 4V14C3 14.6 3.4 15 4 15H8L7 21L13 15H20C20.6 15 21 14.6 21 14V4C21 3.4 20.6 3 20 3Z"
      {...base(strokeWidth)}
    />
    {/* three dots */}
    <circle cx="8.5" cy="9" r="1" fill="currentColor" stroke="none" />
    <circle cx="12"  cy="9" r="1" fill="currentColor" stroke="none" />
    <circle cx="15.5" cy="9" r="1" fill="currentColor" stroke="none" />
  </svg>
);

// ── Profile (circle + person silhouette) ────────────────────────────────────
export const ProfileIcon = ({ size = 24, className = "", strokeWidth = 1.5 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    className={className}
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" {...base(strokeWidth)} />
    <circle cx="12" cy="9.5" r="3" {...base(strokeWidth)} />
    <path d="M4.5 21Q7 16 12 16Q17 16 19.5 21" {...base(strokeWidth)} />
  </svg>
);
