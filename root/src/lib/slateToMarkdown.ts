// root/src/lib/slateToMarkdown.ts
export function slateToMarkdown(slateValue: any[]): string {
  if (!Array.isArray(slateValue)) return '';
  return slateValue.map((block: any) => {
    let md = '';
    switch (block.type) {
      case 'heading-one':
        md = `# ${childrenToMarkdown(block.children)}`;
        break;
      case 'heading-two':
        md = `## ${childrenToMarkdown(block.children)}`;
        break;
      case 'heading-three':
        md = `### ${childrenToMarkdown(block.children)}`;
        break;
      case 'code-block':
        md = `\n\n\`\`\`\n${childrenToMarkdown(block.children, true)}\n\`\`\`\n`;
        break;
      case 'bulleted-list':
        md = block.children.map((li: any) => `- ${childrenToMarkdown(li.children)}`).join('\n');
        break;
      case 'numbered-list':
        md = block.children.map((li: any, i: number) => `${i + 1}. ${childrenToMarkdown(li.children)}`).join('\n');
        break;
      case 'block-quote':
        md = `> ${childrenToMarkdown(block.children)}`;
        break;
      default:
        md = childrenToMarkdown(block.children);
    }
    return md;
  }).join('\n\n');
}

function childrenToMarkdown(children: any[], isCodeBlock = false): string {
  return children.map((child: any) => {
    if (isCodeBlock && child.children) {
      // Recursively handle nested paragraphs in code blocks
      return childrenToMarkdown(child.children, isCodeBlock);
    }
    let text = child.text || '';
    // Inline styles
    if (child.bold) text = `**${text}**`;
    if (child.italic) text = `*${text}*`;
    if (child.underline) text = `<u>${text}</u>`; // Markdown doesn't support underline natively
    if (child.code || isCodeBlock) text = '`' + text + '`';
    // Color and highlight as HTML span for Markdown
    let style = '';
    if (child.color) style += `color: ${child.color};`;
    if (child.highlightColor) style += `background: ${child.highlightColor};`;
    if (style) text = `<span style=\"${style}\">${text}</span>`;
    return text;
  }).join(isCodeBlock ? '\n' : '');
} 