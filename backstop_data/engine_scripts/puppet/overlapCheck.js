module.exports = async (page, scenario, vp) => {
  // Espera pequeños layouts y fuentes
  await new Promise(r=>setTimeout(r,800));

  const isReference = (process.env.BACKSTOP_COMMAND||'').includes('reference');
  const issues = await page.evaluate(() => {
    function isVisible(el) {
      const cs = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return cs && cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity || '1') > 0 && rect.width > 0 && rect.height > 0;
    }
    function intersects(a, b) {
      return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
    }
    function isAncestor(a, b) { // a contains b
      return a.contains(b) && a !== b;
    }
    const selectors = [
      'button, [role="button"], a[href], input, select, textarea, img',
      '.toolbar, .group, .group-header, .group-actions, .tile, .tile-main, .tile-text, .tile-right, .tile-actions, .list-row, .list-header',
      '.icon-btn, .btn, .badge, .tile-title, .tile-url, .group-title, .tile-title-static, .tile-url-static, .chips, .chip, .chip-input'
    ];
    const uniq = new Map();
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        if(!isVisible(el)) return;
        if(!uniq.has(el)) uniq.set(el, el.getBoundingClientRect());
      });
    });
    const nodes = Array.from(uniq.entries()).map(([el, rect]) => ({ el, rect }));
    const results = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        if (isAncestor(a.el, b.el) || isAncestor(b.el, a.el)) continue;
        if (intersects(a.rect, b.rect)) {
          const ixLeft = Math.max(a.rect.left, b.rect.left);
          const ixTop = Math.max(a.rect.top, b.rect.top);
          const ixRight = Math.min(a.rect.right, b.rect.right);
          const ixBottom = Math.min(a.rect.bottom, b.rect.bottom);
          const area = Math.max(0, ixRight - ixLeft) * Math.max(0, ixBottom - ixTop);
          if (area >= 6) {
            results.push({
              a: (a.el.className || a.el.tagName || '').toString().slice(0, 60),
              b: (b.el.className || b.el.tagName || '').toString().slice(0, 60),
              rectA: { x: a.rect.left, y: a.rect.top, w: a.rect.width, h: a.rect.height },
              rectB: { x: b.rect.left, y: b.rect.top, w: b.rect.width, h: b.rect.height },
              area
            });
          }
        }
      }
    }
    return results;
  });

  if (issues.length) {
    if (isReference) {
      console.warn('Solapes detectados (referencia):', issues.slice(0,5));
      return;
    }
    const sample = issues.slice(0, 8);
    throw new Error(`Solapes detectados (${issues.length}). Ejemplos: ` + JSON.stringify(sample));
  }
};
