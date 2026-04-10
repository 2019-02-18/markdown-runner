/**
 * Extract the language identifier from a code block's class name.
 * Looks for patterns like "language-javascript", "lang-js", "highlight-python", etc.
 */
export function detectLanguage(pre: HTMLElement): string | null {
  const code = pre.querySelector('code');
  if (!code) return null;

  const classNames = [...(code.classList ?? []), ...(pre.classList ?? [])];

  for (const cls of classNames) {
    const match = cls.match(/^(?:language|lang|highlight)-(.+)$/);
    if (match) return match[1].toLowerCase();
  }

  const dataLang = code.getAttribute('data-language') ?? pre.getAttribute('data-language');
  if (dataLang) return dataLang.toLowerCase();

  return null;
}

/**
 * Extract clean code text from a <pre> element,
 * stripping line numbers and language badge text that some sites inject.
 */
export function extractCleanCode(pre: HTMLElement): string {
  const code = pre.querySelector('code');
  const target = code ?? pre;

  const clone = target.cloneNode(true) as HTMLElement;

  clone.querySelectorAll(
    '.line-number, .linenumber, .hljs-ln-numbers, .rouge-gutter, [data-line-number]',
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
