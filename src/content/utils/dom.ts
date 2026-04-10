/**
 * Extract the language identifier from a code block's class name.
 * Handles multiple patterns:
 *   - class="language-javascript" (standard)
 *   - class="lang-js" (some renderers)
 *   - parent div class="highlight highlight-source-javascript" (GitHub)
 *   - data-language attribute
 */
export function detectLanguage(pre: HTMLElement): string | null {
  const code = pre.querySelector('code');

  const elements: HTMLElement[] = [pre];
  if (code) elements.unshift(code);

  const parent = pre.parentElement;
  if (parent) elements.push(parent);

  for (const el of elements) {
    for (const cls of el.classList) {
      const langMatch = cls.match(/^(?:language|lang)-(.+)$/);
      if (langMatch) return langMatch[1].toLowerCase();

      const ghMatch = cls.match(/^highlight-source-(.+)$/);
      if (ghMatch) return ghMatch[1].toLowerCase();
    }
  }

  for (const el of elements) {
    const dataLang = el.getAttribute('data-language') ?? el.getAttribute('data-lang');
    if (dataLang) return dataLang.toLowerCase();
  }

  return null;
}

/**
 * Extract clean code text from a <pre> element,
 * stripping line numbers, language badges, and injected UI elements.
 */
export function extractCleanCode(pre: HTMLElement): string {
  const code = pre.querySelector('code');
  const target = code ?? pre;

  const clone = target.cloneNode(true) as HTMLElement;

  clone.querySelectorAll(
    '.line-number, .linenumber, .hljs-ln-numbers, .rouge-gutter, [data-line-number], ' +
    '.mr-copy-btn, .mr-lang-label, .mr-line-numbers, button',
  ).forEach((el) => el.remove());

  return clone.textContent?.replace(/^\n+|\n+$/g, '') ?? '';
}

/**
 * Count the number of lines in a code block.
 */
export function countLines(pre: HTMLElement): number {
  const code = extractCleanCode(pre);
  return code.split('\n').length;
}

/**
 * Generate a unique ID for a code block based on its position in the DOM.
 */
let blockCounter = 0;
export function generateBlockId(): string {
  return `mr-block-${++blockCounter}`;
}

/**
 * Get the outermost container for a code block.
 * On GitHub: the .highlight div wrapping the pre.
 * On other sites: the pre itself.
 */
export function getCodeBlockContainer(pre: HTMLElement): HTMLElement {
  const highlight = pre.closest('.highlight') as HTMLElement | null;
  return highlight ?? pre;
}
