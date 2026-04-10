/**
 * Generates preview HTML that matches the selectors found in a CSS string.
 *
 * Algorithm:
 *  1. Strip comments, extract every `selector { props }` rule
 *  2. Parse each selector into a chain of element descriptors
 *  3. Merge chains that share ancestors into a tree
 *  4. Render the tree to HTML with sensible placeholder content
 */

interface SelectorPart {
  tag: string;
  classes: string[];
  id: string;
  key: string;
}

interface TreeNode {
  tag: string;
  classes: string[];
  id: string;
  key: string;
  children: Map<string, TreeNode>;
  props: string;
}

const HTML_TAGS = new Set([
  'a', 'abbr', 'address', 'article', 'aside', 'audio', 'b', 'blockquote',
  'body', 'br', 'button', 'canvas', 'caption', 'code', 'col', 'dd', 'del',
  'details', 'dialog', 'div', 'dl', 'dt', 'em', 'fieldset', 'figcaption',
  'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header',
  'hr', 'i', 'iframe', 'img', 'input', 'ins', 'kbd', 'label', 'legend', 'li',
  'main', 'mark', 'nav', 'ol', 'optgroup', 'option', 'output', 'p', 'pre',
  'progress', 'q', 's', 'samp', 'section', 'select', 'small', 'span',
  'strong', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'textarea',
  'tfoot', 'th', 'thead', 'time', 'tr', 'u', 'ul', 'var', 'video',
]);

const SELF_CLOSING = new Set(['img', 'input', 'br', 'hr', 'col']);

const TAG_PLACEHOLDER: Record<string, string> = {
  h1: 'Main Heading',
  h2: 'Section Heading',
  h3: 'Sub Heading',
  h4: 'Heading',
  h5: 'Heading',
  h6: 'Heading',
  p: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  a: 'Link Text',
  button: 'Button',
  span: 'Text',
  label: 'Label',
  li: 'List item',
  td: 'Cell',
  th: 'Header',
  blockquote: 'Quoted text goes here.',
  code: 'code()',
  pre: 'preformatted text',
  small: 'Small text',
  strong: 'Bold text',
  em: 'Emphasized text',
  figcaption: 'Figure caption',
  summary: 'Details summary',
  textarea: '',
  option: 'Option',
};

function humanize(name: string): string {
  return name
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function parseSelectorPart(raw: string): SelectorPart {
  const part = raw.replace(/::?[\w-]+(\([^)]*\))?/g, '').trim();
  if (!part) return { tag: 'div', classes: [], id: '', key: 'div' };

  let tag = '';
  const classes: string[] = [];
  let id = '';

  const tagMatch = part.match(/^([a-zA-Z][a-zA-Z0-9]*)/);
  if (tagMatch && HTML_TAGS.has(tagMatch[1].toLowerCase())) {
    tag = tagMatch[1].toLowerCase();
  }

  for (const m of part.matchAll(/\.([a-zA-Z_-][\w-]*)/g)) {
    classes.push(m[1]);
  }

  const idMatch = part.match(/#([a-zA-Z_-][\w-]*)/);
  if (idMatch) id = idMatch[1];

  if (!tag) tag = id || classes.length ? 'div' : 'div';

  const key = id ? `#${id}` : classes.length ? `.${classes.join('.')}` : tag;
  return { tag, classes, id, key };
}

function extractRules(css: string): Array<{ selector: string; props: string }> {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const results: Array<{ selector: string; props: string }> = [];
  const ruleRe = /([^{}]+?)\s*\{([^}]*)\}/g;
  let m: RegExpExecArray | null;

  while ((m = ruleRe.exec(clean)) !== null) {
    const raw = m[1].trim();
    if (raw.startsWith('@')) continue;

    for (const s of raw.split(',')) {
      let sel = s.trim().replace(/::?[\w-]+(\([^)]*\))?/g, '').trim();
      if (sel && sel !== '*' && !sel.startsWith(':')) {
        results.push({ selector: sel, props: m[2].trim() });
      }
    }
  }
  return results;
}

function buildTree(rules: Array<{ selector: string; props: string }>): Map<string, TreeNode> {
  const roots = new Map<string, TreeNode>();

  for (const { selector, props } of rules) {
    const parts = selector.split(/\s*[>+~]\s*|\s+/).filter(Boolean).map(parseSelectorPart);
    if (parts.length === 0) continue;

    let level = roots;

    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];

      if (!level.has(p.key)) {
        level.set(p.key, {
          tag: p.tag,
          classes: [...p.classes],
          id: p.id,
          key: p.key,
          children: new Map(),
          props: '',
        });
      }

      const node = level.get(p.key)!;
      for (const c of p.classes) {
        if (!node.classes.includes(c)) node.classes.push(c);
      }

      if (i === parts.length - 1) {
        node.props = props;
      }

      level = node.children;
    }
  }

  return roots;
}

function inferPlaceholder(node: TreeNode): string {
  const { tag, classes, id, props } = node;

  if (TAG_PLACEHOLDER[tag] !== undefined) return TAG_PLACEHOLDER[tag];

  if (props.includes('background') && /width|height/.test(props)) {
    const w = props.match(/width\s*:\s*(\d+)/);
    const h = props.match(/height\s*:\s*(\d+)/);
    if (w && h && parseInt(w[1]) < 120 && parseInt(h[1]) < 120) {
      return humanize(classes[0] || id || '');
    }
  }

  if (classes.length) return humanize(classes[0]);
  if (id) return humanize(id);
  return 'Content';
}

function needsListWrapper(nodes: Map<string, TreeNode>): string | null {
  const allLi = Array.from(nodes.values()).every((n) => n.tag === 'li');
  return allLi && nodes.size > 0 ? 'ul' : null;
}

function renderNode(node: TreeNode): string {
  const { tag, classes, id, children } = node;

  let attrs = '';
  if (classes.length) attrs += ` class="${classes.join(' ')}"`;
  if (id) attrs += ` id="${id}"`;

  if (SELF_CLOSING.has(tag)) {
    if (tag === 'img') {
      return `<img${attrs} alt="placeholder" style="width:120px;height:80px;background:#e0e0e0;display:block;border-radius:4px">`;
    }
    if (tag === 'input') {
      return `<input${attrs} placeholder="${humanize(classes[0] || 'text')}">`;
    }
    return `<${tag}${attrs}>`;
  }

  if (children.size > 0) {
    const wrapper = needsListWrapper(children);
    let inner = Array.from(children.values()).map(renderNode).join('\n');
    if (wrapper && tag !== 'ul' && tag !== 'ol') {
      inner = `<${wrapper}>\n${inner}\n</${wrapper}>`;
    }
    return `<${tag}${attrs}>\n${inner}\n</${tag}>`;
  }

  const text = inferPlaceholder(node);
  return `<${tag}${attrs}>${text}</${tag}>`;
}

/**
 * Generate a list of `<li>` elements if the selector set includes repeated
 * items (e.g. `.nav-item` with no children), to create a more realistic
 * preview with multiple siblings.
 */
function maybeRepeat(node: TreeNode): string {
  const needsRepeat =
    node.children.size === 0 &&
    node.tag !== 'body' &&
    !['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'blockquote'].includes(node.tag) &&
    (node.classes.some((c) => /item|card|row|col|cell|entry|slide|tab/i.test(c)) ||
      node.tag === 'li');

  if (!needsRepeat) return renderNode(node);

  const copies = [1, 2, 3].map((i) => {
    const text = inferPlaceholder(node) + (node.tag === 'li' ? ` ${i}` : '');
    let attrs = '';
    if (node.classes.length) attrs += ` class="${node.classes.join(' ')}"`;
    if (node.id) attrs += ` id="${node.id}${i > 1 ? '-' + i : ''}"`;
    return `<${node.tag}${attrs}>${text}</${node.tag}>`;
  });
  return copies.join('\n');
}

export function generateHtmlFromCss(css: string): string {
  const rules = extractRules(css);
  if (rules.length === 0) return '<div class="preview">CSS Preview</div>';

  const roots = buildTree(rules);
  if (roots.size === 0) return '<div class="preview">CSS Preview</div>';

  const fragments: string[] = [];

  for (const node of roots.values()) {
    if (node.children.size > 0) {
      fragments.push(renderNode(node));
    } else {
      fragments.push(maybeRepeat(node));
    }
  }

  return fragments.join('\n');
}
