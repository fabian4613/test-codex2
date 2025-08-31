module.exports = {
  id: 'dashy-next-dashboard',
  viewports: [
    { name: 'mobile', width: 375, height: 812 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'wide', width: 1440, height: 900 }
  ],
  scenarios: [
    { label: 'Home', url: 'http://localhost:3000/', onReadyScript: 'puppet/overlapCheck.js' },
    { label: 'Admin', url: 'http://localhost:3000/admin', onReadyScript: 'puppet/overlapCheck.js' }
  ],
  paths: {
    bitmaps_reference: 'backstop_data/bitmaps_reference',
    bitmaps_test: 'backstop_data/bitmaps_test',
    engine_scripts: 'backstop_data/engine_scripts',
    html_report: 'backstop_data/html_report',
    ci_report: 'backstop_data/ci_report'
  },
  engine: 'puppeteer',
  report: ['browser'],
  asyncCaptureLimit: 3,
  asyncCompareLimit: 5
};





