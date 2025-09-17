module.exports = async (page, scenario, vp) => {
  // Disable animations to reduce noise
  try { await page.addStyleTag({ content: `*{animation:none!important;transition:none!important}` }); } catch {}
  await new Promise(r => setTimeout(r, 400));

  const issues = await page.evaluate(() => {
    function rect(el){ const r = el.getBoundingClientRect(); return {x:r.left,y:r.top,w:r.width,h:r.height,cy:r.top+r.height/2}; }
    function label(el){ return (el.getAttribute('aria-label')||el.textContent||el.className||el.tagName||'').toString().trim().slice(0,40); }
    function rgb(s){ const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(s||''); return m? [parseInt(m[1]),parseInt(m[2]),parseInt(m[3]), m[4]?parseFloat(m[4]):1]: null; }
    function relLum([r,g,b]){ const a=[r,g,b].map(v=>{v/=255;return v<=0.03928? v/12.92: Math.pow((v+0.055)/1.055,2.4)}); return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2]; }
    function contrast(c1,c2){ const L1=Math.max(relLum(c1),relLum(c2)); const L2=Math.min(relLum(c1),relLum(c2)); return (L1+0.05)/(L2+0.05); }
    const out = [];
    const toolbar = document.querySelector('.toolbar');
    if (!toolbar) return out;
    const chips = Array.from(toolbar.querySelectorAll('.toolbar-chip'));
    chips.forEach((chip, idx) => {
      const items = Array.from(chip.querySelectorAll('.control, .btn, .icon-btn, .select-trigger'))
        .filter(el => el.offsetParent !== null);
      if (items.length < 2) return;
      // check center alignment within chip
      const centers = items.map(rect).map(r=>r.cy);
      const minC = Math.min(...centers), maxC = Math.max(...centers);
      if (maxC - minC > 3) {
        out.push({ type: 'center-misaligned', chip: idx, delta: +(maxC-minC).toFixed(2), sample: items.slice(0,3).map(label) });
      }
      // check height consistency
      const heights = items.map(rect).map(r=>r.h);
      const med = heights.slice().sort((a,b)=>a-b)[Math.floor(heights.length/2)];
      heights.forEach((h,i)=>{ if (Math.abs(h - med) > 20) out.push({ type:'height-variance', chip: idx, by:+(h-med).toFixed(2), el: label(items[i]) }); });

      // border-radius consistency within chip
      const radii = items
        .map(el => parseFloat(getComputedStyle(el).borderTopLeftRadius || '0'))
        .filter(v => v >= 2); // ignore elements without rounding (labels, sliders)
      if (radii.length > 1) {
        const rmin = Math.min(...radii), rmax = Math.max(...radii);
        if (rmax - rmin > 4) out.push({ type:'radius-variance', chip: idx, delta:+(rmax-rmin).toFixed(2) });
      }
    });
    // global icon shelf spacing
    const shelf = toolbar.querySelector('.icon-shelf');
    if (shelf) {
      const btns = Array.from(shelf.querySelectorAll('.icon-btn')).filter(el=>el.offsetParent!==null);
      for (let i=1;i<btns.length;i++){
        const a = rect(btns[i-1]); const b = rect(btns[i]);
        const gap = Math.round(b.x - (a.x + a.w));
        if (Math.abs(gap - 6) > 3) out.push({ type: 'gap-inconsistent', gap, at: i });
      }
    }

    // contrast check on key controls
    const targets = Array.from(toolbar.querySelectorAll('.btn, .icon-btn, .select-trigger'));
    targets.forEach(el => {
      const cs = getComputedStyle(el);
      const fg = rgb(cs.color);
      let bg = rgb(cs.backgroundColor);
      // if transparent, try parent
      if (!bg || (bg && bg[3] < 0.01)) {
        let p = el.parentElement; let bgs = null;
        while(p && (!bgs || (bgs && rgb(bgs.backgroundColor) && rgb(bgs.backgroundColor)[3] < 0.01))){ bgs = getComputedStyle(p); p = p.parentElement; }
        bg = rgb((bgs && bgs.backgroundColor) || 'rgb(0,0,0)');
      }
      if (fg && bg && !(bg[3] !== undefined && bg[3] < 0.2)) { // skip very translucent backgrounds
        const ratio = contrast(fg,bg);
        if (ratio < 3) out.push({ type:'low-contrast', el: label(el), ratio:+ratio.toFixed(2) });
      }
    });
    return out;
  });
  if (issues.length) {
    throw new Error('Visual Lint: ' + JSON.stringify(issues.slice(0,8)));
  }
};
