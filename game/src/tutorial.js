// Shift 1's walkthrough: Grandma Tam talks the new cook through one Scallion Moon bowl.
// The clock and the ticket's patience wait until the first bowl is rung out.

function bowlHas(kitchen, kind) {
  const carried = kitchen.hand && kitchen.hand.type === 'bowl' ? [kitchen.hand.bowl] : [];
  return [...kitchen.bowls, ...carried].some((bowl) => bowl && bowl.items.includes(kind));
}

function handHas(kitchen, kind) {
  return Boolean(kitchen.hand && kitchen.hand.type === 'item' && kitchen.hand.item.kind === kind);
}

function potHas(kitchen, kind) {
  return kitchen.pot.some((item) => item && item.kind === kind);
}

/** Each step: what Tam says, the place the arrow points at, and when the step is done. */
export const TUTORIAL_STEPS = [
  { text: 'Grab noodles from the crate (click it, or press 1).', target: 'crate:noodles',
    done: (k) => handHas(k, 'noodles') || potHas(k, 'noodles') || bowlHas(k, 'noodles') },
  { text: 'Drop them in the pot (click it, or A). They ding when done.', target: 'pot',
    done: (k) => potHas(k, 'noodles') || bowlHas(k, 'noodles') },
  { text: 'While they boil, grab a scallion (2).', target: 'crate:scallion',
    done: (k) => handHas(k, 'scallion') || k.board !== null || bowlHas(k, 'scallion') },
  { text: 'Lay it on the board (F), then chop: click it or tap SPACE.', target: 'board',
    done: (k) => (k.board && k.board.stage === 'ready') || (handHas(k, 'scallion') && k.hand.item.stage === 'ready') || bowlHas(k, 'scallion') },
  { text: 'Slide the slices into a bowl (click it, or Z).', target: 'bowl:0',
    done: (k) => bowlHas(k, 'scallion') },
  { text: 'Ladle moon broth: click the kettle (D), then the bowl.', target: 'kettle',
    done: (k) => bowlHas(k, 'broth') },
  { text: 'Noodles ready? Lift them from the pot into the bowl.', target: 'pot',
    done: (k) => bowlHas(k, 'noodles') },
  { text: 'Pick up the bowl and ring it out at the window (ENTER).', target: 'window',
    done: (k) => k.served > 0 },
];

/** A walkthrough at its first step. */
export function createTutorial() {
  return { step: 0, done: false, flash: 0 };
}

/** Move past every step already finished; the shift's clock starts after the last. */
export function stepTutorial(kitchen) {
  const tutorial = kitchen.tutorial;
  if (tutorial.done) return;
  while (tutorial.step < TUTORIAL_STEPS.length && TUTORIAL_STEPS[tutorial.step].done(kitchen)) {
    tutorial.step += 1;
    tutorial.flash = 1;
  }
  if (tutorial.step >= TUTORIAL_STEPS.length) {
    tutorial.done = true;
    kitchen.events.push({ type: 'tutorialDone', x: 640, y: 360 });
  }
}

/** The step showing now, or null once the walkthrough is over. */
export function currentTutorialStep(kitchen) {
  const tutorial = kitchen.tutorial;
  if (!tutorial || tutorial.done) return null;
  return TUTORIAL_STEPS[tutorial.step];
}
