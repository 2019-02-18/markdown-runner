let bar: HTMLElement | null = null;
let scrollHandler: (() => void) | null = null;

export function initProgressBar() {
  return {
    enable() {
      if (bar) {
        bar.style.display = '';
        if (scrollHandler) window.addEventListener('scroll', scrollHandler, { passive: true });
      } else {
        createProgressBar();
      }
    },
    disable() {
      if (bar) {
        bar.style.display = 'none';
        if (scrollHandler) window.removeEventListener('scroll', scrollHandler);
      }
    },
  };
}

function createProgressBar(): void {
  bar = document.createElement('div');
  bar.id = 'mr-progress-bar';

  Object.assign(bar.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    height: '3px',
    width: '0%',
    background: 'linear-gradient(90deg, #4A90D9, #67B8F7)',
    zIndex: '99999',
    transition: 'width 0.1s linear',
    pointerEvents: 'none',
  });

  document.body.appendChild(bar);

  scrollHandler = () => updateProgress();
  window.addEventListener('scroll', scrollHandler, { passive: true });
  updateProgress();
}

function updateProgress(): void {
  if (!bar) return;
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0;
  bar.style.width = `${progress}%`;
}
