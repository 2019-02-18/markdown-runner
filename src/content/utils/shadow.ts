/**
 * Create a closed Shadow DOM host and attach a stylesheet.
 * Returns the shadow root for DOM operations.
 */
export function createShadowContainer(
  tag: string = 'markdown-runner-ui',
  styles?: string,
): { host: HTMLElement; shadow: ShadowRoot } {
  const host = document.createElement(tag);
  const shadow = host.attachShadow({ mode: 'closed' });

  if (styles) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(styles);
    shadow.adoptedStyleSheets = [sheet];
  }

  return { host, shadow };
}

/**
 * Wrap an element with a shadow DOM container and inject styles.
 * Useful for per-code-block UI injection.
 */
export function wrapWithShadow(
  styles: string,
  ...children: Node[]
): { host: HTMLElement; shadow: ShadowRoot } {
  const { host, shadow } = createShadowContainer('mr-widget', styles);
  for (const child of children) {
    shadow.appendChild(child);
  }
  return { host, shadow };
}
