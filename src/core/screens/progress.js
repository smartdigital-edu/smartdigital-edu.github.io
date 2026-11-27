/**
 * Learning Progress (kids apps): a parent report built from saved attempts.
 * Read top to bottom: what to practise next, every activity once (tap for its tries),
 * then progress over time for one activity.
 * Filters live in the URL: #/scores?p=<profileId>&d=7|30|all&a=<module/activity>
 */
import { el, clear, button, loader, confirmDialog, toast } from '../ui.js';
import { t, tx, getLang } from '../i18n/index.js';
import { session, setActiveProfile } from '../session.js';
import { navigate } from '../router.js';
import { show } from '../shell.js';
import {
  periodStart, groupByActivity, itemSummary, series, distinctDays, axisLabels, bestAndLatest,
  laterResult, suggestNext, topicsExplored, joinList, dayKey,
} from '../progress.js';

const PERIODS = ['7', '30', 'all'];
const TRIES_SHOWN = 10;
/** Activity titles too vague on their own: shown as "Topic – activity type". Keyed by the English title. */
const GENERIC = { learn: 'progress.typeLearn', find: 'progress.typeFind', quiz: 'progress.typeQuiz', play: 'progress.typePlay' };

export async function progressScreen({ query }) {
  const app = session.app;
  const pid = query.p || session.profile?.id || session.profiles[0]?.id;
  const profile = session.profiles.find((p) => p.id === pid);
  const period = PERIODS.includes(query.d) ? query.d : '7';
  const go = (changes) => {
    const q = new URLSearchParams({ p: pid || '', d: period, ...(query.a ? { a: query.a } : {}), ...changes });
    for (const [k, v] of [...q]) if (!v) q.delete(k);
    navigate(`/scores?${q}`, { replace: true });
  };

  const learner = el('select#pg-learner', { onchange: (e) => go({ p: e.target.value, a: '' }) },
    session.profiles.map((p) => el('option', { value: p.id, selected: p.id === pid }, `${p.avatar} ${p.name}`)));
  const periodSel = el('select#pg-period', { onchange: (e) => go({ d: e.target.value }) },
    PERIODS.map((d) => el('option', { value: d, selected: d === period }, t(`progress.period${d}`))));
  const body = el('div.pg-body', {}, loader(t('app.loading')));

  show(el('section.screen.pg-screen', {},
    el('div.pg-panel', {},
      el('header.pg-head', {},
        el('div.pg-title', {}, el('h1', { tabindex: '-1' }, t('progress.title')), el('p.pg-explain', t('progress.explain'))),
        el('div.pg-filters', {},
          el('label.pg-filter', {}, el('span.sr-only', t('progress.learner')), learner),
          el('label.pg-filter', {}, el('span.sr-only', t('progress.period')), periodSel))),
      body)));

  if (!profile) { clear(body).append(el('p.pg-empty', t('profiles.empty'))); return; }

  let all = [];
  try { all = await session.backend.listAttempts(session.user.uid, profile.id); } catch (e) { console.warn(e); }
  all = all.filter((r) => (!r.app || r.app === app.id) && Number.isFinite(r.timestamp));
  const rows = all.filter((r) => r.timestamp >= periodStart(period));

  /* ---------- formatting (one date style everywhere: "27 Nov"; time only when needed) ---------- */
  const locale = getLang() === 'ms' ? 'ms-MY' : 'en-MY';
  const fDay = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
  const fWeek = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const fTime = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' });
  const day = (ts) => fDay.format(ts);
  const time = (ts) => fTime.format(ts);
  const full = (ts) => `${fWeek.format(ts)} ${day(ts)}, ${time(ts)}`;
  const secs = (s) => (s < 60 ? t('progress.sec', { s }) : s % 60 ? t('progress.minSec', { m: Math.floor(s / 60), s: s % 60 }) : t('progress.min', { m: s / 60 }));
  const list = (items) => joinList(items, t('progress.and'));
  const isToday = (ts) => dayKey(ts) === dayKey(Date.now());

  /** Display name without repeats: "Colouring" once, "Body Parts – Learn the words", topic only when it adds something. */
  const names = (info, r = {}) => {
    const parts = String(r.title || '').split(' – ');
    const topic = info.mod ? tx(info.mod.title) : (parts.length > 1 ? parts[0] : '');
    if (!info.act) return { name: parts[parts.length - 1] || r.activity || '', topic: parts.length > 1 && parts[0] !== parts[1] ? topic : '' };
    const generic = GENERIC[tx(info.act.title, 'en').trim().toLowerCase()];
    if (generic) return { name: `${topic} – ${t(generic)}`, topic: '' };
    const name = tx(info.act.title);
    return { name, topic: name.trim().toLowerCase() === topic.trim().toLowerCase() ? '' : topic };
  };
  const playButton = (route, label, variant = 'primary small') => button(label, {
    variant, icon: '▶',
    onClick: () => { setActiveProfile(profile); location.hash = route; }, // play as the learner shown here
  });

  const cards = [tryNextCard()];
  if (!rows.length) {
    cards.push(el('div.pg-card', {},
      el('p.pg-empty', t(all.length ? 'progress.emptyPeriod' : 'progress.emptyAll')),
      all.length && period !== 'all' ? button(t('progress.showAll'), { variant: 'secondary small', onClick: () => go({ d: 'all' }) }) : null));
  } else {
    const groups = groupByActivity(rows, app);
    cards.push(activitiesCard(groups), chartCard(groups));
  }
  cards.push(settingsCard());
  clear(body).append(...cards.filter(Boolean));

  /* ---------- Try next ---------- */
  function tryNextCard() {
    const s = suggestNext(rows, app);
    if (!s) return null;
    const { name } = names(s.group, s.group.latest);
    let why;
    if (s.kind === 'practise') {
      const r = s.group.latest;
      why = t('progress.gotFirstTry', { correct: r.correct, total: r.total });
      if (s.items.length) why += ` ${t('progress.stillLearning', { items: list(s.items) })}`;
      if (s.more) why += ` ${t('progress.nMore', { n: s.more })}`;
    } else why = t(`progress.why_${s.kind}`);
    const mascot = (app.decor || []).find((d) => d.side === 'left')?.src;
    return el('div.pg-card.pg-next', {},
      el('div.pg-next-text', {},
        el('p.pg-kicker', t('progress.tryNext')),
        el('h2', t(`progress.title_${s.kind}`, { activity: name })),
        el('p.pg-why', why),
        playButton(s.group.route, t('progress.go'), 'primary')),
      mascot ? el('img.pg-cici', { src: mascot, alt: '', draggable: 'false' }) : null);
  }

  /* ---------- Activities: one row per activity, tap for its tries ---------- */
  function activitiesCard(groups) {
    const topics = topicsExplored(rows, app).map((x) => (x.mod ? tx(x.mod.title) : x.label || x.id));
    return el('div.pg-card', {},
      el('h2', t('progress.activities')),
      el('p.pg-topics', t(topics.length === 1 ? 'progress.topics1' : 'progress.topicsN', { n: topics.length, list: list(topics) })),
      el('div.pg-acts', {}, groups.map(activityRow)));
  }

  function activityRow(g) {
    const { name, topic } = names(g, g.latest);
    const n = g.rows.length;
    const sub = [topic, n === 1 ? t('progress.try1') : t('progress.tries', { n }), t('progress.lastPlayed', { date: day(g.latest.timestamp) })].filter(Boolean).join(' · ');
    const best = g.best.score;
    const latest = g.latest.score;
    const right = g.scored
      ? el('span.pg-act-score', {},
        el('span.pg-bar', { 'aria-hidden': 'true' }, el('span', { style: { width: `${best}%` } })),
        el('span.pg-act-nums', {},
          el('b', t('progress.best', { score: best })),
          latest !== best ? el('small', t('progress.latest', { score: latest })) : null))
      : el('span.pg-free', {}, el('span.pg-done', t('progress.completed')), el('small', t('progress.noScore')));
    const tries = el('ul.pg-tries');
    let shown = 0;
    const more = button(t('progress.more'), { variant: 'secondary small', onClick: () => addTries() });
    const addTries = () => {
      g.rows.slice(shown, shown + TRIES_SHOWN).forEach((r) => tries.append(tryItem(r, g.scored)));
      shown += TRIES_SHOWN;
      more.hidden = shown >= g.rows.length;
    };
    addTries();
    return el('details.pg-row', {},
      el('summary', {}, el('span.pg-row-name', {}, el('strong', name), el('small', sub)), right),
      el('div.pg-row-body', {}, tries,
        el('div.pg-row-actions', {},
          more,
          g.route ? playButton(g.route, t('progress.again'), 'secondary small') : null,
          g.scored && g.rows.length > 1 ? button(t('progress.seeProgress'), { variant: 'ghost small', icon: '📈', onClick: () => go({ a: g.key }) }) : null)));
  }

  function tryItem(r, scored) {
    const line = [full(r.timestamp),
      scored && r.total ? t('progress.correctFirst', { correct: r.correct, total: r.total }) : (scored ? null : t('progress.completed')),
      r.duration ? secs(r.duration) : null].filter(Boolean).join(' · ');
    const sum = scored ? itemSummary(r) : null;
    let detail = null;
    if (sum?.practise.length) {
      const shownItems = sum.practise.slice(0, 6);
      detail = el('small.pg-try-detail', t('progress.stillLearning', { items: list(shownItems) })
        + (sum.practise.length > shownItems.length ? ` ${t('progress.nMore', { n: sum.practise.length - shownItems.length })}` : ''));
    } else if (scored && !sum) detail = el('small.pg-note', t('progress.noDetail'));
    return el('li', {},
      el('span.pg-try-main', {}, el('span', line), scored ? el('b.pg-pill', `${r.score}%`) : null),
      detail,
      r.pending ? el('small.pg-note', t('scores.pending')) : null);
  }

  /* ---------- Progress over time ---------- */
  function chartCard(groups) {
    const scored = groups.filter((g) => g.scored);
    const card = el('div.pg-card.pg-chart-card', {}, el('h2', t('progress.overTime')));
    if (!scored.length) { card.append(el('p.pg-empty', t('progress.noScored'))); return card; }
    const g = scored.find((x) => x.key === query.a) || scored[0];
    if (scored.length > 1) {
      card.append(el('label.pg-filter.pg-act-pick', {}, el('span.sr-only', t('progress.activity')),
        el('select', { onchange: (e) => go({ a: e.target.value }) }, scored.map((x) => el('option', { value: x.key, selected: x === g }, names(x, x.latest).name)))));
    } else card.append(el('p.pg-sub', names(g, g.latest).name));

    const pts = series(g.rows);
    const bl = bestAndLatest(pts);
    if (distinctDays(pts) < 2) {
      // Same-day tries: a plain summary, not a line that looks like a trend.
      const when = isToday(pts[0].t) ? t('progress.today') : t('progress.onDay', { date: day(pts[0].t) });
      const scores = pts.map((p) => `${p.score}%`);
      const text = pts.length === 1
        ? t('progress.oneTry', { when, score: pts[0].score, correct: pts[0].correct, total: pts[0].total })
        : t('progress.sameDay', { n: pts.length, when, scores: scores.length === 2 ? t('progress.then2', { a: scores[0], b: scores[1] }) : t('progress.thenN', { list: scores.slice(0, -1).join(', '), last: scores[scores.length - 1] }) });
      card.append(el('p.pg-summary', text), el('p.pg-note', t('progress.anotherDay')));
    } else {
      card.append(chartSvg(pts));
      const later = laterResult(pts);
      if (later) card.append(el('p.pg-later', t('progress.later', { date: day(later.last.t), score: later.last.score, firstDate: day(later.first.t), first: later.first.score })));
    }
    if (pts.length > 1) card.append(el('p.pg-bestlatest', bl.best === bl.latest ? t('progress.bestIsLatest', { score: bl.best }) : t('progress.bestLatest', { best: bl.best, latest: bl.latest })));
    if (bl.dip) card.append(el('p.pg-dip', t('progress.dip')));
    return card;
  }

  function chartSvg(pts) {
    const W = 320; const H = 150; const L = 34; const R = 14; const T = 10; const B = 26;
    const x = (i) => L + (i * (W - L - R)) / (pts.length - 1);
    const y = (s) => T + ((100 - s) * (H - T - B)) / 100;
    const kinds = axisLabels(pts);
    const step = Math.ceil(pts.length / 6);
    const grid = [0, 50, 100].map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="g"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v}%</text>`).join('');
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.score).toFixed(1)}`).join(' ');
    const dots = pts.map((p, i) => {
      const label = kinds[i] === 'date' ? day(p.t) : time(p.t);
      const showLabel = i === 0 || i === pts.length - 1 || i % step === 0;
      return `<circle cx="${x(i)}" cy="${y(p.score)}" r="5"><title>${full(p.t)}: ${p.score}% (${p.correct}/${p.total})</title></circle>${
        showLabel ? `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${label}</text>` : ''}`;
    }).join('');
    const summary = pts.map((p, i) => `${kinds[i] === 'date' ? day(p.t) : time(p.t)} ${p.score}%`).join(', ');
    return el('div.pg-chart', { role: 'img', 'aria-label': summary, html: `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">${grid}<path d="${line}" class="l"/>${dots}</svg>` });
  }

  /* ---------- Parent settings (clear history) ---------- */
  function settingsCard() {
    const clearBtn = button(t('scores.clear'), {
      variant: 'danger small', icon: '🗑️',
      onClick: async () => {
        if (!(await confirmDialog(t('scores.confirmClear', { name: profile.name })))) return;
        await session.backend.clearAttempts(session.user.uid, profile.id);
        toast(t('scores.cleared'));
        progressScreen({ query });
      },
    });
    clearBtn.disabled = !all.length;
    return el('details.pg-settings', {}, el('summary', t('progress.settings')),
      el('p.pg-note', t('progress.clearNote', { name: profile.name })), clearBtn);
  }
}
