// Shared semantic renderers for the Structural Acoustics visual system.

const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));

const classNames = (...values) => values.filter(Boolean).join(' ');

export function renderPageShell(content, { variant = '', className = '' } = {}) {
  const variantClass = variant ? `site-page-shell-${variant}` : '';
  return `<div class="${classNames('page-shell', 'site-page-shell', variantClass, className)}">${content}</div>`;
}

export function renderBreadcrumbs(items, { label = 'Breadcrumb' } = {}) {
  return `<nav class="breadcrumbs site-breadcrumbs" aria-label="${esc(label)}">${items.map((item, index) => {
    const node = item.href
      ? `<a href="${esc(item.href)}">${esc(item.label)}</a>`
      : `<span ${index === items.length - 1 ? 'aria-current="page"' : ''}>${esc(item.label)}</span>`;
    return `${index ? '<span class="site-breadcrumb-separator" aria-hidden="true">›</span>' : ''}${node}`;
  }).join('')}</nav>`;
}

export function renderSectionHeader({ number = '', eyebrow = '', title, summary = '', action = null, id = '' }) {
  return `<header class="section-heading site-section-header"${id ? ` id="${esc(id)}"` : ''}>${number ? `<span class="section-number">${esc(number)}</span>` : ''}<div><p class="eyebrow">${esc(eyebrow)}</p><h2>${esc(title)}</h2>${summary ? `<p>${esc(summary)}</p>` : ''}${action ? `<a class="concept-tool-link site-inline-link" href="${esc(action.href)}">${esc(action.label)} <span aria-hidden="true">→</span></a>` : ''}</div></header>`;
}

export function renderCallout({ tone = 'note', label, body, bodyHtml = '' }) {
  const safeTone = ['note', 'warning', 'assumption'].includes(tone) ? tone : 'note';
  const calloutBody = bodyHtml || esc(body);
  return `<aside class="site-callout site-callout-${safeTone}"><strong>${esc(label)}</strong><p>${calloutBody}</p></aside>`;
}

export function renderLinkCollection({ label, items, variant = 'related', className = '' }) {
  const safeVariant = variant === 'hardware' ? 'hardware' : 'related';
  return `<nav class="${classNames('site-link-collection', `site-${safeVariant}-links`, className)}" aria-label="${esc(label)}"><p class="site-component-label">${esc(label)}</p><div>${items.map(item => `<a href="${esc(item.href)}"><span>${esc(item.title)}</span>${item.description ? `<small>${esc(item.description)}</small>` : ''}<b aria-hidden="true">→</b></a>`).join('')}</div></nav>`;
}

export const siteComponentInventory = Object.freeze([
  'page-shell',
  'section-header',
  'concept-card',
  'tool-card',
  'equation-panel',
  'engineering-note',
  'warning-callout',
  'assumption-callout',
  'breadcrumbs',
  'related-concept-links',
  'hardware-topic-links',
  'demo-container',
  'chart-container',
  'calculator-container'
]);
