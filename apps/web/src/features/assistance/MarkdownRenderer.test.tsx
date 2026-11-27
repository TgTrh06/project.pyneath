import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MarkdownRenderer } from './MarkdownRenderer';

describe('MarkdownRenderer', () => {
  it('renders headings, tables, checklists, and escapes raw HTML safely', () => {
    const md = [
      '### 🔍 Phân tích',
      '- [ ] Bước 1: Đọc **chương 3**',
      '- [x] Bước 2: Tạo `note`',
      '',
      '| Mục | Thời lượng |',
      '| --- | --- |',
      '| Ôn tập | 25 phút |',
      '',
      '<script>alert(1)</script>',
    ].join('\n');

    const html = renderToStaticMarkup(<MarkdownRenderer content={md} />);
    expect(html).toContain('<h4 class="md-h">🔍 Phân tích</h4>');
    expect(html).toContain('<strong>chương 3</strong>');
    expect(html).toContain('<code class="md-inline-code">note</code>');
    expect(html).toContain('<table class="md-table">');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
  });
});
