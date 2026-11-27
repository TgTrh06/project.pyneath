import type { ReactNode } from 'react';

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={idx} className="md-inline-code">{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={idx}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

/** Safe, dependency-free Markdown renderer for structured analytical chatbot output. */
export function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trimEnd();
    if (!line.trim()) {
      i += 1;
      continue;
    }

    // Markdown table
    if (line.startsWith('|') && i + 1 < lines.length && /^\|[\s:-]+\|/.test(lines[i + 1].trim())) {
      const headers = line.split('|').slice(1, -1).map(c => c.trim());
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(lines[i].trim().split('|').slice(1, -1).map(c => c.trim()));
        i += 1;
      }
      blocks.push(
        <div key={blocks.length} className="md-table-wrap">
          <table className="md-table">
            <thead>
              <tr>{headers.map((h, idx) => <th key={idx}>{renderInline(h)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, rIdx) => (
                <tr key={rIdx}>{row.map((cell, cIdx) => <td key={cIdx}>{renderInline(cell)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      if (level <= 2) blocks.push(<h3 key={blocks.length} className="md-h">{renderInline(text)}</h3>);
      else blocks.push(<h4 key={blocks.length} className="md-h">{renderInline(text)}</h4>);
      i += 1;
      continue;
    }

    // Blockquote
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith('>')) {
        quoteLines.push(lines[i].trimStart().replace(/^>\s?/, ''));
        i += 1;
      }
      blocks.push(
        <blockquote key={blocks.length} className="md-quote">
          {quoteLines.map((q, idx) => <p key={idx}>{renderInline(q)}</p>)}
        </blockquote>,
      );
      continue;
    }

    // Lists / Checklists
    if (/^[-*]\s+/.test(line.trimStart())) {
      const items: Array<{ checked: boolean | null; text: string }> = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trimStart())) {
        const raw = lines[i].trimStart().replace(/^[-*]\s+/, '');
        const checkMatch = raw.match(/^\[( |x|X)\]\s+(.+)$/);
        if (checkMatch) {
          items.push({ checked: checkMatch[1].toLowerCase() === 'x', text: checkMatch[2] });
        } else {
          items.push({ checked: null, text: raw });
        }
        i += 1;
      }
      blocks.push(
        <ul key={blocks.length} className="md-list">
          {items.map((item, idx) => (
            <li key={idx} className={item.checked !== null ? 'md-check-item' : undefined}>
              {item.checked !== null && (
                <span className="md-checkbox" aria-hidden="true">{item.checked ? '☑' : '☐'}</span>
              )}
              <span>{renderInline(item.text)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // Paragraph
    blocks.push(<p key={blocks.length} className="md-p">{renderInline(line)}</p>);
    i += 1;
  }

  return <div className="md-body">{blocks}</div>;
}
