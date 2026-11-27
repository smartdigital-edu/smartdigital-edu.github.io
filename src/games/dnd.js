/**
 * Pointer-based drag & drop that works with touch, mouse and pen,
 * plus a tap-to-select / tap-to-place fallback (also keyboard accessible).
 *
 *   const dnd = createDnD({ onDrop(tile, target) { return true /* accepted *\/ } });
 *   dnd.tile(node, data); dnd.target(node, data);
 */
export function createDnD({ onDrop, onTapTile } = {}) {
  const targets = new Set();
  let selected = null;

  function select(tile) {
    if (selected) selected.classList.remove('selected');
    selected = selected === tile ? null : tile;
    if (selected) selected.classList.add('selected');
  }

  function hitTarget(x, y) {
    const els = document.elementsFromPoint(x, y);
    for (const e of els) {
      const t = e.closest?.('[data-drop]');
      if (t && targets.has(t)) return t;
    }
    return null;
  }

  function tile(node, data) {
    node._data = data;
    node.dataset.tile = '';
    node.setAttribute('role', node.getAttribute('role') || 'button');
    if (!node.hasAttribute('tabindex')) node.tabIndex = 0;
    let start = null;
    let ghost = null;
    let over = null;

    node.addEventListener('pointerdown', (e) => {
      if (node.disabled || node.classList.contains('placed') || e.button > 0) return;
      start = { x: e.clientX, y: e.clientY, id: e.pointerId };
      node.setPointerCapture(e.pointerId);
    });
    node.addEventListener('pointermove', (e) => {
      if (!start || e.pointerId !== start.id) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (!ghost && Math.hypot(dx, dy) > 8) {
        const r = node.getBoundingClientRect();
        ghost = node.cloneNode(true);
        ghost.classList.add('dragging');
        ghost.classList.remove('selected');
        ghost.style.width = `${r.width}px`;
        ghost.style.height = `${r.height}px`;
        ghost.style.left = `${r.left}px`;
        ghost.style.top = `${r.top}px`;
        ghost._offset = { x: start.x - r.left, y: start.y - r.top };
        document.body.append(ghost);
        node.classList.add('ghost');
      }
      if (ghost) {
        ghost.style.left = `${e.clientX - ghost._offset.x}px`;
        ghost.style.top = `${e.clientY - ghost._offset.y}px`;
        const t = hitTarget(e.clientX, e.clientY);
        if (t !== over) { over?.classList.remove('hover'); over = t; over?.classList.add('hover'); }
      }
    });
    const endDrag = (e, cancelled) => {
      if (!start) return;
      const wasDrag = !!ghost;
      over?.classList.remove('hover');
      ghost?.remove();
      ghost = null;
      node.classList.remove('ghost');
      const target = wasDrag && !cancelled ? hitTarget(e.clientX, e.clientY) : null;
      start = null;
      over = null;
      if (wasDrag) {
        if (target) onDrop(node, target);
      } else if (!cancelled) {
        tap(node);
      }
    };
    node.addEventListener('pointerup', (e) => endDrag(e, false));
    node.addEventListener('pointercancel', (e) => endDrag(e, true));
    node.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(node); }
    });
  }

  function tap(node) {
    if (onTapTile && onTapTile(node) === true) return;
    select(node);
  }

  function target(node, data) {
    node._data = data;
    node.dataset.drop = '';
    targets.add(node);
    if (!node.hasAttribute('tabindex')) node.tabIndex = 0;
    const place = () => {
      if (!selected) return;
      const s = selected;
      select(s);
      onDrop(s, node);
    };
    node.addEventListener('click', (e) => { if (!e.target.closest('[data-tile]') || e.target.closest('[data-tile]') === node) place(); });
    node.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); place(); } });
  }

  return { tile, target, select, get selected() { return selected; }, removeTarget: (n) => targets.delete(n) };
}
