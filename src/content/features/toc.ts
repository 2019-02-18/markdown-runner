import { t } from '@shared/i18n';

interface TocEntry {
  level: number;
  text: string;
  element: HTMLElement;
}

let tocContainer: HTMLElement | null = null;
let scrollHandler: (() => void) | null = null;
let tocEntries: TocEntry[] = [];
let activeLink: HTMLElement | null = null;

export function initToc() {
  return {
    enable() {
      if (tocContainer) {
        tocContainer.style.display = '';
        if (scrollHandler) window.addEventListener('scroll', scrollHandler, { passive: true });
      } else {
        buildToc();
      }
    },
    disable() {
      if (tocContainer) {
        tocContainer.style.display = 'none';
        if (scrollHandler) window.removeEventListener('scroll', scrollHandler);
      }
    },
  };
}

/**
 * Find the main content container, avoiding navigation/sidebar headings.
 * Tries common selectors used by GitHub, dev.to, Medium, etc.
 */
function findContentRoot(): Element {
  const selectors = [
    'article',
    '.markdown-body',
    '[role="main"] .entry-content',
    '.post-content',
    '.article-content',
    '#readme',
    'main .content',
    '[role="main"]',
    'main',
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el && el.querySelectorAll('h1, h2, h3, h4').length >= 2) {
      return el;
    }
  }

  return document.body;
}

function buildToc(): void {
  const contentRoot = findContentRoot();
  const headings = contentRoot.querySelectorAll<HTMLElement>('h1, h2, h3, h4');
  if (headings.length < 3) return;

  tocEntries = Array.from(headings).map((el) => ({
    level: parseInt(el.tagName[1], 10),
    text: el.textContent?.trim() ?? '',
    element: el,
  }));

  tocContainer = document.createElement('div');
  tocContainer.id = 'mr-toc-sidebar';

  Object.assign(tocContainer.style, {
    position: 'fixed',
    top: '80px',
    right: '16px',
    width: '220px',
    maxHeight: 'calc(100vh - 120px)',
    overflow: 'auto',
    padding: '12px 0',
    fontSize: '13px',
    fontFamily: 'system-ui, sans-serif',
    background: 'rgba(255,255,255,0.95)',
    border: '1px solid rgba(128,128,128,0.15)',
    borderRadius: '8px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    zIndex: '9999',
    transition: 'opacity 0.2s',
  });

  const title = document.createElement('div');
  title.textContent = t('content.tocTitle');
  Object.assign(title.style, {
    padding: '0 14px 8px',
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: 'rgba(128,128,128,0.7)',
    borderBottom: '1px solid rgba(128,128,128,0.1)',
    marginBottom: '6px',
  });
  tocContainer.appendChild(title);

  for (const entry of tocEntries) {
    const link = document.createElement('a');
    link.textContent = entry.text;
    link.href = '#';
    Object.assign(link.style, {
      display: 'block',
      padding: '4px 14px',
      paddingLeft: `${14 + (entry.level - 1) * 12}px`,
      color: 'inherit',
      textDecoration: 'none',
      lineHeight: '1.5',
      borderLeft: '2px solid transparent',
      transition: 'all 0.15s',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    });

    link.addEventListener('click', (e) => {
      e.preventDefault();
      entry.element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    link.addEventListener('mouseenter', () => { link.style.background = 'rgba(128,128,128,0.06)'; });
    link.addEventListener('mouseleave', () => {
      if (link !== activeLink) link.style.background = 'transparent';
    });

    link.dataset.tocIndex = String(tocEntries.indexOf(entry));
    tocContainer.appendChild(link);
  }

  document.body.appendChild(tocContainer);

  scrollHandler = () => updateActiveHeading();
  window.addEventListener('scroll', scrollHandler, { passive: true });
  updateActiveHeading();
}

function updateActiveHeading(): void {
  if (!tocContainer) return;

  const scrollTop = window.scrollY + 100;
  let current: TocEntry | null = null;

  for (const entry of tocEntries) {
    if (entry.element.offsetTop <= scrollTop) {
      current = entry;
    }
  }

  const links = tocContainer.querySelectorAll<HTMLElement>('a');
  for (const link of links) {
    const idx = parseInt(link.dataset.tocIndex ?? '-1', 10);
    const isActive = current === tocEntries[idx];

    link.style.borderLeftColor = isActive ? '#4A90D9' : 'transparent';
    link.style.color = isActive ? '#4A90D9' : 'inherit';
    link.style.fontWeight = isActive ? '600' : 'normal';
    link.style.background = isActive ? 'rgba(74,144,217,0.06)' : 'transparent';

    if (isActive) activeLink = link;
  }
}
