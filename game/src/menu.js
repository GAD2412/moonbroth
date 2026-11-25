// The stall's menu: every ingredient, how it is prepared, and the bowls the pier orders.

/**
 * prep says where an ingredient becomes ready to plate:
 *  pot   - boil in a basket until it dings (and do not leave it too long),
 *  grill - char on the grill (it burns if forgotten),
 *  chop  - slice on the board with five strokes,
 *  none  - ready the moment you take it (broth from the kettle, rice from the cooker, chili oil).
 */
export const INGREDIENTS = {
  noodles: { name: 'Noodles', ready: 'Boiled noodles', prep: 'pot', cook: 5.5, source: 'crate', key: '1' },
  scallion: { name: 'Scallion', ready: 'Sliced scallion', prep: 'chop', cook: 0, source: 'crate', key: '2' },
  pork: { name: 'Pork belly', ready: 'Charred pork', prep: 'grill', cook: 6, source: 'crate', key: '3' },
  shrimp: { name: 'Tide shrimp', ready: 'Grilled shrimp', prep: 'grill', cook: 4.5, source: 'crate', key: '4' },
  chili: { name: 'Chili oil', ready: 'Chili oil', prep: 'none', cook: 0, source: 'crate', key: '5' },
  broth: { name: 'Moon broth', ready: 'Moon broth', prep: 'none', cook: 0, source: 'kettle', key: 'D' },
  rice: { name: 'Lantern rice', ready: 'Lantern rice', prep: 'none', cook: 0, source: 'rice', key: 'G' },
};

/** The crates along the front of the counter, left to right. */
export const CRATE_ORDER = ['noodles', 'scallion', 'pork', 'shrimp', 'chili'];

/** Bowls in the order they join the menu; shift is the first shift that serves them. */
export const RECIPES = [
  { id: 'scallion-moon', name: 'Scallion Moon', items: ['noodles', 'broth', 'scallion'], shift: 1, value: 30 },
  { id: 'ember-pork', name: 'Ember Pork', items: ['noodles', 'broth', 'pork', 'scallion'], shift: 2, value: 45 },
  { id: 'tidecatcher', name: 'Tidecatcher', items: ['noodles', 'broth', 'shrimp', 'chili'], shift: 3, value: 45 },
  { id: 'lantern-rice', name: 'Lantern Rice', items: ['rice', 'pork', 'chili'], shift: 4, value: 40 },
  { id: 'harbor-rice', name: 'Harbor Rice', items: ['rice', 'shrimp', 'scallion'], shift: 4, value: 40 },
  { id: 'full-moon', name: 'Full Moon', items: ['noodles', 'broth', 'pork', 'shrimp', 'scallion'], shift: 5, value: 70 },
];

/** The recipes a given shift can deal. */
export function recipesForShift(shiftNumber) {
  return RECIPES.filter((recipe) => recipe.shift <= shiftNumber);
}

/** The recipe whose items are exactly `kinds` (any order), or null. */
export function recipeMatching(kinds) {
  const sorted = [...kinds].sort().join(',');
  return RECIPES.find((recipe) => [...recipe.items].sort().join(',') === sorted) ?? null;
}

/** True when a bowl holding `kinds` could still become `recipe` by adding more. */
export function bowlFitsRecipe(kinds, recipe) {
  return kinds.every((kind) => recipe.items.includes(kind));
}
