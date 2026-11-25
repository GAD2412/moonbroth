// Moonbroth's fixed numbers: the logical screen, the one palette every drawing uses,
// where each station sits in the kitchen, and how fast things cook.

export const SCREEN = { width: 1280, height: 720 };
export const STEP = 1 / 60;

/** Lantern Pier at night: indigo dark, lantern red and amber, cream paper, teal glaze, warm wood. */
export const PALETTE = {
  night: '#15122a',
  nightDeep: '#0d0b1c',
  indigo: '#2a2450',
  indigoLight: '#3d3570',
  lantern: '#e2513b',
  lanternDark: '#a83226',
  amber: '#f5b54a',
  amberLight: '#ffd98a',
  cream: '#f7ead0',
  paper: '#efe0bf',
  ink: '#2b2033',
  inkSoft: '#5b4a5e',
  teal: '#2f8f88',
  tealDark: '#1f5f5c',
  tealLight: '#58c2b4',
  wood: '#7a4a2c',
  woodDark: '#4e2d1b',
  woodLight: '#a8693e',
  steel: '#8d94a8',
  steelDark: '#4d5366',
  steelLight: '#c9cfdc',
  green: '#6cc04a',
  red: '#e5493a',
  white: '#ffffff',
};

export const FONT = '"Trebuchet MS", "Segoe UI", Verdana, sans-serif';
export const FONT_TITLE = 'Georgia, "Times New Roman", serif';

/** Every place you can click, as x, y, width, height on the 1280 x 720 screen. */
export const LAYOUT = {
  hud: { x: 0, y: 0, w: 1280, h: 60 },
  rail: { x: 16, y: 96, w: 868, h: 130 },
  window: { x: 900, y: 70, w: 364, h: 262 },
  shiftPanel: { x: 900, y: 342, w: 364, h: 258 },
  pot: { x: 16, y: 236, w: 250, h: 184 },
  grill: { x: 276, y: 236, w: 300, h: 184 },
  kettle: { x: 586, y: 236, w: 140, h: 184 },
  rice: { x: 736, y: 236, w: 148, h: 184 },
  board: { x: 16, y: 430, w: 220, h: 170 },
  bowls: [
    { x: 246, y: 430, w: 170, h: 170 },
    { x: 424, y: 430, w: 170, h: 170 },
    { x: 602, y: 430, w: 170, h: 170 },
  ],
  trash: { x: 782, y: 430, w: 102, h: 170 },
  crateRow: { x: 16, y: 610, w: 868, h: 100 },
  legend: { x: 900, y: 610, w: 364, h: 100 },
};

export const TICKET = { width: 208, height: 124, gap: 12, max: 4 };
export const CRATE = { width: 136, gap: 10 };
export const POT_SLOTS = 2;
export const GRILL_SLOTS = 3;
export const BOWL_MAX_ITEMS = 5;
export const CHOP_STROKES = 5;

/** Seconds a cooked item holds before the warning starts, and before it is ruined. */
export const HOLD_SECONDS = 4.5;
export const RUIN_SECONDS = 7.5;

/** Seconds a served bowl waits on the window shelf before the runner takes it. */
export const PICKUP_SECONDS = 1.4;
export const RUSH_TIP_MULTIPLIER = 1.5;
export const COMBO_MAX = 8;
