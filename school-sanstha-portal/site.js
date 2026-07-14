(function () {
  const cfg = window.SCHOOL_SITE || {};

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

  document.querySelectorAll('[data-bind-href]').forEach((el) => {
    const key = el.getAttribute('data-bind-href');
    const value = cfg[key];
    if (!value) return;
    if (key === 'phone') {
      el.setAttribute('href', 'tel:' + String(value).replace(/\s/g, ''));
    } else if (key === 'email') {
      el.setAttribute('href', 'mailto:' + value);
    }
  });

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const titleBase = cfg.sansthaNameMr || cfg.sansthaName || 'School Website';
  document.title = titleBase + ' — शाळा वेबसाइट';

  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc && cfg.taglineMr) {
    metaDesc.setAttribute('content', cfg.taglineMr);
  }

  const toggle = document.getElementById('navToggle');
  const nav = document.getElementById('siteNav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const id = anchor.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
})();
