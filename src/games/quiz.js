/**
 * quiz – mixed question types in one run (Grammar Hub):
 *   mc | fill  -> choose an option   (fill shows a sentence with a blank)
 *   spot       -> tap the wrong word
 *   spelling   -> hear the word and spell it
 *   build      -> build the sentence
 */
import { engineFrom } from './runner.js';
import { renderChoice, renderSpot } from './multipleChoice.js';
import { renderSpelling } from './spelling.js';
import { renderBuild } from './buildSentence.js';

const RENDERERS = { mc: renderChoice, fill: renderChoice, spot: renderSpot, spelling: renderSpelling, build: renderBuild };

export function renderAny(q, view, ctx) {
  const r = RENDERERS[q.type] || renderChoice;
  return r(q, view, ctx);
}

export default engineFrom(renderAny);
