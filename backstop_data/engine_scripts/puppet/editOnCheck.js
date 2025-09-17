module.exports = async (page, scenario, vp) => {
  try { await page.addStyleTag({ content: `*{animation:none!important;transition:none!important}` }); } catch {}
  await new Promise(r => setTimeout(r, 300));
  await page.evaluate(() => {
    var btns = Array.from(document.querySelectorAll('.primary-btn'));
    var edit = btns.find(function(b){ return /editar|salir edición/i.test((b.textContent||'')); });
    if (edit && /editar/i.test((edit.textContent||'')) && 'click' in edit) edit.click();
  });
  const combo = require('./comboCheck');
  await combo(page, scenario, vp);
};
