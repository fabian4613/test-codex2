module.exports = async (page, scenario, vp) => {
  const overlap = require('./overlapCheck');
  const lint = require('./visualLint');
  await overlap(page, scenario, vp);
  await lint(page, scenario, vp);
};

