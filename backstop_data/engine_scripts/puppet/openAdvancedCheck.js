module.exports = async (page, scenario, vp) => {
  try { await page.addStyleTag({ content: `*{animation:none!important;transition:none!important}` }); } catch {}
  await new Promise(r => setTimeout(r, 300));
  await page.evaluate(() => {
    var btn = document.querySelector('.more-btn');
    if (btn && 'click' in btn) btn.click();
  });
  const combo = require('./comboCheck');
  await combo(page, scenario, vp);
};
