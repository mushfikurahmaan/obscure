// root/src/lib/slateToHtml.ts
export function slateToHtml(slateValue: any[]): string {
  if (!Array.isArray(slateValue)) return '';
  return slateValue.map((block: any) => {
    let html = '';
    switch (block.type) {
      case 'heading-one':
        html = `<h1 style="color: #111; font-size: 2.2em; font-weight: bold; margin: 0.67em 0;">${childrenToHtml(block.children)}</h1>`;
        break;
      case 'heading-two':
        html = `<h2 style="color: #111; font-size: 1.6em; font-weight: bold; margin: 0.75em 0;">${childrenToHtml(block.children)}</h2>`;
        break;
      case 'heading-three':
        html = `<h3 style="color: #111; font-size: 1.2em; font-weight: bold; margin: 0.8em 0;">${childrenToHtml(block.children)}</h3>`;
        break;
      case 'code-block':
        html = `<pre style="background: #f5f5f5; color: #111; padding: 8px; border-radius: 4px; font-family: monospace; font-size: 1em; white-space: pre-wrap; word-break: break-word;"><code>${childrenToHtml(block.children, true)}</code></pre>`;
        break;
      case 'bulleted-list':
        html = `<ul style="color: #111; margin-left: 1.5em;">${block.children.map((li: any) => `<li>${childrenToHtml(li.children)}</li>`).join('')}</ul>`;
        break;
      case 'numbered-list':
        html = `<ol style="color: #111; margin-left: 1.5em;">${block.children.map((li: any) => `<li>${childrenToHtml(li.children)}</li>`).join('')}</ol>`;
        break;
      case 'block-quote':
        html = `<blockquote style="color: #111; border-left: 4px solid #aaa; margin: 1em 0; padding-left: 1em; font-style: italic;">${childrenToHtml(block.children)}</blockquote>`;
        break;
      default:
        html = `<p style="color: #111; margin: 0.5em 0;">${childrenToHtml(block.children)}</p>`;
    }
    return html;
  }).join('');
}

function childrenToHtml(children: any[], isCodeBlock = false): string {
  return children.map((child: any) => {
    if (isCodeBlock && child.children) {
      // Recursively handle nested paragraphs in code blocks
      return childrenToHtml(child.children, isCodeBlock);
    }
    let text = child.text || '';
    let style = 'color: #111;';
    if (child.color) style += `color: ${child.color};`;
    if (child.highlightColor) style += `background: ${child.highlightColor};`;
    if (isCodeBlock) style += 'font-family: monospace;';
    if (child.bold) text = `<strong>${text}</strong>`;
    if (child.italic) text = `<em>${text}</em>`;
    if (child.underline) text = `<u>${text}</u>`;
    if (child.code) text = `<code>${text}</code>`;
    return `<span style="${style}">${text}</span>`;
  }).join(isCodeBlock ? '\n' : '');
} 