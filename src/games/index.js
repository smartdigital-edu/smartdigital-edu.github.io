/** Engine registry: lazy-loaded so each activity only downloads what it needs. */
const ENGINES = {
  learnCards: () => import('./learnCards.js'),
  multipleChoice: () => import('./multipleChoice.js'),
  findIt: () => import('./findIt.js'),
  matchLines: () => import('./matchLines.js'),
  dragToSlot: () => import('./dragToSlot.js'),
  dragToCount: () => import('./dragToCount.js'),
  sortBuckets: () => import('./sortBuckets.js'),
  swapToMatch: () => import('./swapToMatch.js'),
  popBalloon: () => import('./popBalloon.js'),
  tracing: () => import('./tracing.js'),
  colouring: () => import('./colouring.js'),
  spelling: () => import('./spelling.js'),
  buildSentence: () => import('./buildSentence.js'),
  arithmetic: () => import('./arithmetic.js'),
  lessonPage: () => import('./lessonPage.js'),
  quiz: () => import('./quiz.js'),
};

export const engineNames = Object.keys(ENGINES);

export async function loadEngine(name) {
  if (!ENGINES[name]) throw new Error(`Unknown engine: ${name}`);
  const mod = await ENGINES[name]();
  return mod.default;
}
