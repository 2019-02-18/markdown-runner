/**
 * Observe the DOM for dynamically added <pre><code> blocks (SPA support).
 * Calls the handler for each new code block found.
 */
export function observeCodeBlocks(
  handler: (codeBlock: HTMLElement) => void,
): MutationObserver {
  const processed = new WeakSet<HTMLElement>();

  function scanAndProcess(root: ParentNode): void {
    const blocks = root.querySelectorAll<HTMLElement>('pre > code');
    for (const block of blocks) {
      const pre = block.parentElement as HTMLPreElement;
      if (pre && !processed.has(pre)) {
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
          if (node.matches('pre') && node.querySelector('code')) {
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
