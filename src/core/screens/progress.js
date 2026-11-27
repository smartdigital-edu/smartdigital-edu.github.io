/**
 * Learning Progress (kids apps): a parent dashboard built from saved attempts.
 * Filters (learner, period) live in the URL: #/scores?p=<profileId>&d=7|30|all&a=<module/activity>
 */
import { el, clear, button, loader, confirmDialog, toast } from '../ui.js';
import { t, tx, getLang } from '../i18n/index.js';
import { session, setActiveProfile } from '../session.js';
import { navigate } from '../router.js';
import { show } from '../shell.js';
import { formatDuration as fmtDur } from '../scoring.js';
import {
  periodStart, describe, groupByActivity, itemSummary, series, laterResult, suggestNext, topicsExplored,
} from '../progress.js';

const PERIODS = ['7', '30', 'all'];
const PAGE = 15;

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
        el('h1', { tabindex: '-1' }, t('progress.title')),
        el('div.pg-filters', {},
          el('label.pg-filter', {}, el('span.sr-only', t('progress.learner')), learner),
          el('label.pg-filter', {}, el('span.sr-only', t('progress.period')), periodSel))),
      body)));

  if (!profile) { clear(body).append(el('p.pg-empty', t('profiles.empty'))); return; }

  let all = [];
  try { all = await session.backend.listAttempts(session.user.uid, profile.id); } catch (e) { console.warn(e); }
  all = all.filter((r) => (!r.app || r.app === app.id) && Number.isFinite(r.timestamp));
  const from = periodStart(period);
  const rows = all.filter((r) => r.timestamp >= from);

  const locale = getLang() === 'ms' ? 'ms-MY' : 'en-MY';
  const fmtDay = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
  const fmtFull = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const names = (info, r) => ({
    activity: info.act ? tx(info.act.title) : r.title,
    skill: info.mod ? tx(info.mod.title) : '',
  });
  const playButton = (route, label, variant = 'primary small') => button(label, {
    variant, icon: '▶',
    onClick: () => { setActiveProfile(profile); location.hash = route; }, // play as the learner shown here
  });

  const cards = [tryNextCard()];
  if (!rows.length) {
    cards.push(el('div.pg-card.pg-wide', {},
      el('p.pg-empty', t(all.length ? 'progress.emptyPeriod' : 'scores.empty')),
      all.length && period !== 'all' ? button(t('progress.showAll'), { variant: 'secondary small', onClick: () => go({ d: 'all' }) }) : null));
  } else {
    const groups = groupByActivity(rows, app);
    cards.push(el('div.pg-grid', {}, latestCard(groups), chartCard(groups)), exploredCard(), recentCard());
  }
  cards.push(settingsCard());
  clear(body).append(...cards);

  /* ---------- Try next ---------- */
  function tryNextCard() {
    const s = suggestNext(rows, app);
    if (!s) return null;
    const g = s.group;
    const activity = tx(g.act.title);
    const skill = tx(g.mod.title);
    const label = { practise: 'progress.goodToPractise', new: 'progress.tryNew', keep: 'progress.keepGoing', start: 'progress.start' }[s.kind];
    let why;
    if (s.kind === 'practise') {
      const r = g.latest;
      why = t('progress.whyScore', { score: r.score, correct: r.correct, total: r.total });
      if (s.items.length) why += ` ${t('progress.whyMissed', { items: s.items.join(', ') })}`;
    } else why = t({ new: 'progress.whyNew', keep: 'progress.whyAllGood', start: 'progress.whyStart' }[s.kind]);
    const mascot = (app.decor || []).find((d) => d.side === 'left')?.src;
    return el('div.pg-card.pg-next', {},
      el('div.pg-next-text', {},
        el('p.pg-kicker', t('progress.tryNext')),
        el('h2', t(label, { activity: `${skill} · ${activity}` })),
        el('p.pg-why', why),
        playButton(g.route, t('progress.go'), 'primary')),
      mascot ? el('img.pg-cici', { src: mascot, alt: '', draggable: 'false' }) : null);
  }

  /* ---------- Latest results ---------- */
  function latestCard(groups) {
    const list = el('ul.pg-results');
    groups.forEach((g) => {
      const { activity, skill } = names(g, g.latest);
      const n = g.rows.length;
      list.append(el('li', {},
        el('div.pg-res-name', {}, el('strong', activity), el('small', [skill, n > 1 ? t('progress.tries', { n }) : t('progress.try1')].filter(Boolean).join(' · '))),
        g.scored
          ? el('div.pg-res-score', {},
            el('span.pg-bar', { role: 'img', 'aria-label': `${g.latest.score}%` }, el('span', { style: { width: `${g.latest.score}%` } })),
            el('b', `${g.latest.score}%`))
          : el('span.pg-done', t('progress.completed'))));
    });
    return el('div.pg-card', {}, el('h2', t('progress.latest')), list);
  }

  /* ---------- Progress over time ---------- */
  function chartCard(groups) {
    const scored = groups.filter((g) => g.scored);
    const card = el('div.pg-card.pg-chart-card', {}, el('h2', t('progress.overTime')));
    if (!scored.length) { card.append(el('p.pg-empty', t('progress.noScored'))); return card; }
    const g = scored.find((x) => x.key === query.a) || scored[0];
    if (scored.length > 1) {
      card.append(el('label.pg-filter.pg-act-pick', {}, el('span.sr-only', t('progress.activity')),
        el('select', { onchange: (e) => go({ a: e.target.value }) }, scored.map((x) => el('option', { value: x.key, selected: x === g }, names(x, x.latest).activity)))));
    } else card.append(el('p.pg-sub', names(g, g.latest).activity));
    const pts = series(g.rows);
    if (pts.length === 1) {
      card.append(el('div.pg-single', {}, el('b', `${pts[0].score}%`), el('span', t('progress.questions', { correct: pts[0].correct, total: pts[0].total })), el('p', t('progress.oneAttempt'))));
      return card;
    }
    card.append(chartSvg(pts));
    const first = pts[0];
    const last = pts[pts.length - 1];
    card.append(el('p.pg-change', t('progress.change', { first: first.score, last: last.score, n: pts.length })));
    const later = laterResult(pts);
    if (later) card.append(el('p.pg-later', t('progress.later', { firstDate: fmtDay.format(later.first.t), first: later.first.score, date: fmtDay.format(later.last.t), score: later.last.score })));
    return card;
  }

  function chartSvg(pts) {
    const W = 320; const H = 150; const L = 34; const R = 10; const T = 10; const B = 26;
    const x = (i) => L + (pts.length === 1 ? 0 : (i * (W - L - R)) / (pts.length - 1));
    const y = (s) => T + ((100 - s) * (H - T - B)) / 100;
    const grid = [0, 50, 100].map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="g"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v}%</text>`).join('');
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.score).toFixed(1)}`).join(' ');
    const step = Math.ceil(pts.length / 6);
    const dots = pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.score)}" r="5"><title>${fmtDay.format(p.t)}: ${p.score}% (${p.correct}/${p.total})</title></circle>${
      i % step === 0 || i === pts.length - 1 ? `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${fmtDay.format(p.t)}</text>` : ''}`).join('');
    const summary = pts.map((p) => `${fmtDay.format(p.t)} ${p.score}%`).join(', ');
    return el('div.pg-chart', { role: 'img', 'aria-label': summary, html: `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">${grid}<path d="${line}" class="l"/>${dots}</svg>` });
  }

  /* ---------- Topics explored ---------- */
  function exploredCard() {
    const topics = topicsExplored(rows, app);
    return el('div.pg-card', {}, el('h2', t('progress.explored')),
      el('ul.pg-chips', {}, topics.map((x) => el('li', {}, x.mod ? tx(x.mod.title) : x.label || x.id, el('small', ` ×${x.n}`)))));
  }

  /* ---------- Recent activity ---------- */
  function recentCard() {
    const list = el('div.pg-recent');
    let shown = 0;
    const more = button(t('progress.more'), { variant: 'secondary small', onClick: () => addRows() });
    const addRows = () => {
      rows.slice(shown, shown + PAGE).forEach((r) => list.append(recentRow(r)));
      shown += PAGE;
      more.hidden = shown >= rows.length;
    };
    addRows();
    return el('div.pg-card', {}, el('h2', t('progress.recent')), list, el('div.pg-more', {}, more));
  }

  function recentRow(r) {
    const info = describe(r, app);
    const { activity, skill } = names(info, r);
    const sum = itemSummary(r);
    const details = [
      el('li', fmtFull.format(r.timestamp)),
      skill ? el('li', t('progress.skill', { skill })) : null,
      info.scored && r.total ? el('li', t('progress.questions', { correct: r.correct, total: r.total })) : null,
      r.duration ? el('li', t('progress.time', { t: fmtDur(r.duration) })) : null,
      sum && info.scored ? el('li', [
        t('progress.firstTry', { n: sum.first }),
        sum.retry ? t('progress.afterRetry', { n: sum.retry }) : null,
        sum.wrong ? t('progress.notYet', { n: sum.wrong }) : null,
      ].filter(Boolean).join(' · ')) : null,
      sum?.practise.length && info.scored ? el('li.pg-practise', t('progress.practiseItems', { items: sum.practise.slice(0, 8).join(', ') })) : null,
      !sum && info.scored ? el('li.pg-note', t('progress.noDetail')) : null,
      r.pending ? el('li.pg-note', t('scores.pending')) : null,
    ];
    return el('details.pg-row', {},
      el('summary', {},
        el('span.pg-row-name', {}, el('strong', activity), el('small', `${skill ? `${skill} · ` : ''}${fmtDay.format(r.timestamp)}`)),
        info.scored ? el('span.pg-pill', `${r.score}%`) : el('span.pg-done', t('progress.completed'))),
      el('div.pg-row-body', {}, el('ul', {}, details), info.route ? playButton(info.route, t('progress.again'), 'secondary small') : null));
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
