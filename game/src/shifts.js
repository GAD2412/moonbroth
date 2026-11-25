// The six shifts of one night at the Moonbroth stall. Each one adds exactly one new thing,
// and the pressure (ticket rate, patience) climbs a step every shift.

export const SHIFTS = [
  {
    number: 1, name: 'First Lantern', time: '6:00 pm',
    adds: 'The pot, the board and the kettle',
    tip: 'Boil noodles, chop scallion, ladle broth, ring them out.',
    seconds: 150, spawnStart: 16, spawnEnd: 12, patience: 70, stars: [250, 500, 800],
    tutorial: true, rush: [], critics: false,
  },
  {
    number: 2, name: 'Coal Hour', time: '7:00 pm',
    adds: 'The grill: pork belly chars, then burns',
    tip: 'Watch the red ring. Pull pork before it smokes.',
    seconds: 150, spawnStart: 13, spawnEnd: 9, patience: 62, stars: [350, 700, 1100],
    tutorial: false, rush: [], critics: false,
  },
  {
    number: 3, name: 'Tide Market', time: '8:00 pm',
    adds: 'Tide shrimp and chili oil',
    tip: 'Shrimp cook fast. Chili oil needs no prep.',
    seconds: 160, spawnStart: 12, spawnEnd: 8, patience: 58, stars: [400, 800, 1200],
    tutorial: false, rush: [], critics: false,
  },
  {
    number: 4, name: 'Rice Tide', time: '9:00 pm',
    adds: 'The rice cooker: bowls with no broth',
    tip: 'Rice bowls skip the pot. Read each ticket twice.',
    seconds: 160, spawnStart: 11, spawnEnd: 7.5, patience: 55, stars: [400, 800, 1250],
    tutorial: false, rush: [], critics: false,
  },
  {
    number: 5, name: 'Lantern Rush', time: '10:00 pm',
    adds: 'Rush waves: tickets pour in, tips x1.5',
    tip: 'When the lanterns flare, prep ahead and keep the pot full.',
    seconds: 170, spawnStart: 10, spawnEnd: 7, patience: 52, stars: [450, 900, 1400],
    tutorial: false, rush: [[40, 62], [112, 138]], critics: false,
  },
  {
    number: 6, name: 'Festival Night', time: '11:00 pm',
    adds: 'Gold critic tickets: short fuse, triple tips',
    tip: 'Critics leave fast and pay big. Serve them first.',
    seconds: 180, spawnStart: 9.5, spawnEnd: 6.5, patience: 50, stars: [600, 1200, 1900],
    tutorial: false, rush: [[50, 72], [128, 152]], critics: true,
  },
];

/** True when `shift` has the station or crate called `feature` open. */
export function shiftHas(shift, feature) {
  const opensAt = { grill: 2, pork: 2, shrimp: 3, chili: 3, rice: 4 }[feature] ?? 1;
  return shift.number >= opensAt;
}

/** Seconds between tickets at `elapsed` seconds into the shift: it tightens as the shift goes on. */
export function spawnIntervalAt(shift, elapsed) {
  const progress = Math.min(1, elapsed / shift.seconds);
  return shift.spawnStart + (shift.spawnEnd - shift.spawnStart) * progress;
}

/** The rush window [start, end] in progress at `elapsed`, or null. */
export function rushAt(shift, elapsed) {
  return shift.rush.find(([start, end]) => elapsed >= start && elapsed < end) ?? null;
}

/** Stars (0 to 3) a score earns on `shift`. */
export function starsFor(shift, score) {
  return shift.stars.filter((needed) => score >= needed).length;
}
