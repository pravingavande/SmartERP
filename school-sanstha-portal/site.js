(function () {
  const cfg = window.SITE_CONFIG || {};

  document.querySelectorAll('[data-bind]').forEach((el) => {
    const key = el.getAttribute('data-bind');
    const value = cfg[key];
    if (value != null && value !== '') el.textContent = value;
  });

  document.querySelectorAll('[data-href]').forEach((el) => {
    const key = el.getAttribute('data-href');
    const url = cfg[key];
    if (url) el.setAttribute('href', url);
  });

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const title = (cfg.brandName || 'eOffice Desk') + ' — ' + (cfg.productName || 'SmartERP');
  document.title = title;

  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc && cfg.tagline) {
    metaDesc.setAttribute('content', cfg.tagline + ' Login at ' + (cfg.loginUrl || ''));
  }
})();
