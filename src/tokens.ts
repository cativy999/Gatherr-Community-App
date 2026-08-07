// ─── Design Tokens ──────────────────────────────────────────────────────────
// Single source of truth for all CE design system values.
// Import what you need: import { CE_TEAL, CE_BG } from '../tokens';

// Colors — core
export const CE_DARK       = "#2C2523";  // primary text
export const CE_TEAL       = "#1F4E5B";  // brand teal (buttons, icons, accents)
export const CE_MID        = "#635C59";  // secondary text
export const CE_DIV        = "#E4DCCF";  // dividers, borders
export const CE_GOLD       = "#C8973A";  // gold accent

// Colors — extended
export const CE_BG         = "#FAF6F0";  // cream background
export const CE_LIGHT      = "#D9D4CC";  // light warm gray (secondary borders, inputs)
export const CE_MUTED      = "#7C7370";  // muted warm gray (placeholder text, captions)
export const CE_SURFACE      = "#EFECE6";  // subtle surface fill — section backgrounds, calendar range

// Colors — button states
export const CE_TEAL_HOVER = "#2D6B7F";  // primary button hover
export const CE_TEAL_PRESS = "#14333E";  // primary button pressed / RSVP going active / selected avatar border
export const CE_FOCUS      = "#48A4A9";  // keyboard focus ring

// Colors — accent
export const CE_GOLD_LIGHT = "#F1E6C6";  // gold-tinted cream — avatar stack borders, section fills
export const CE_BROWN      = "#6B553F";  // warm brown — steps/distance text, map pin icons

// Colors — semantic / status
export const CE_ERROR           = "#DC2626";  // error state, delete actions, destructive buttons
export const CE_SUCCESS         = "#228B4A";  // success — confirmed RSVP, check icons
export const CE_SUCCESS_BG      = "#DCEAE5";  // success background — confirmed/offered state
export const CE_SUCCESS_BG_LIGHT= "#EBEFEB";  // success background light — selected card state
export const CE_SUCCESS_TEXT    = "#5B8A7A";  // success text — status labels, dot indicators

// Colors — surfaces
export const CE_SIDEBAR    = "#FDFBF9";  // near-white — desktop sidebar background

// Typography
export const CE_SANS       = "'Inter', sans-serif";
export const CE_SERIF      = "'Cormorant Garamond', Georgia, serif";
