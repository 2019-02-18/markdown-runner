import type { OutputEntry } from '@shared/types';

interface ExecMessage {
  type: 'EXECUTE_CODE';
  payload: {
    code: string;
    lang: string;
    id: string;
  };
}

window.addEventListener('message', (event: MessageEvent<ExecMessage>) => {
  const data = event.data;
  if (data?.type !== 'EXECUTE_CODE') return;

  const { code, lang, id } = data.payload;
  const output: OutputEntry[] = [];

  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
  };

  function capture(type: OutputEntry['type']) {
    return (...args: unknown[]) => {
      output.push({
        type,
        args: args.map((a) =>
          typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a),
        ),
      });
    };
  }

  console.log = capture('log');
  console.warn = capture('warn');
  console.error = capture('error');
  console.info = capture('info');

  try {
    let executableCode = code;

    if (lang === 'typescript' || lang === 'ts') {
      executableCode = stripTypeAnnotations(code);
    }

    const fn = new Function(executableCode);
    const result = fn();

    if (result !== undefined) {
      output.push({
        type: 'result',
        args: [typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)],
      });
    }

    sendResult(id, output);
  } catch (err) {
    sendResult(id, output, err instanceof Error ? err.message : String(err));
  } finally {
    Object.assign(console, originalConsole);
  }
});

function sendResult(id: string, output: OutputEntry[], error?: string): void {
  window.parent.postMessage(
    {
      type: 'EXECUTION_RESULT',
      payload: { id, output, error },
    },
    '*',
  );
}

/**
 * Naive TypeScript → JavaScript stripping for basic type annotations.
 * For production, integrate sucrase or esbuild-wasm.
 */
function stripTypeAnnotations(code: string): string {
  return code
    .replace(/:\s*\w+(\[\])?\s*(?=[=,;\)\n\r}])/g, '')
    .replace(/\b(interface|type)\s+\w+\s*\{[^}]*\}/g, '')
    .replace(/<\w+(\s*,\s*\w+)*>/g, '')
    .replace(/\bas\s+\w+/g, '');
}
