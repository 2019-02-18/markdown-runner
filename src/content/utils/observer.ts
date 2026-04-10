/**
 * Observe the DOM for code blocks (SPA support).
 * Detects multiple patterns:
 *   - <pre><code>...</code></pre> (standard Markdown renderers)
 *   - <pre>...</pre> inside .highlight (GitHub)
 *   - <pre class="...">...</pre> standalone code blocks
 */
export function observeCodeBlocks(
  handler: (codeBlock: HTMLElement) => void,
): MutationObserver {
  const processed = new WeakSet<HTMLElement>();

  function isCodePre(pre: HTMLElement): boolean {
    if (pre.querySelector('code')) return true;
    if (pre.closest('.highlight')) return true;
    if (pre.querySelector('span[class^="pl-"]')) return true;
    const text = pre.textContent ?? '';
    return text.includes('\n') && text.trim().length > 10;
  }

  function scanAndProcess(root: ParentNode): void {
    const pres = root.querySelectorAll<HTMLElement>('pre');
    for (const pre of pres) {
      if (!processed.has(pre) && isCodePre(pre)) {
        processed.add(pre);
        handler(pre);
      }
    }
  }

  scanAndProcess(document.body);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) {
          if (node.tagName === 'PRE' && isCodePre(node)) {
            if (!processed.has(node)) {
              processed.add(node);
              handler(node);
            }
          } else {
            scanAndProcess(node);
          }
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return observer;
}
