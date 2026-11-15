import { expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StudyStepFields } from './StudyStepFields';

it('offers honest optional self-reported outcomes without inferring completion', () => {
  const html = renderToStaticMarkup(<StudyStepFields step="Ôn khóa ngoại" setStep={vi.fn()} status="" setStatus={vi.fn()} note="" setNote={vi.fn()}/>);
  expect(html).toContain('Bỏ qua ghi nhận');
  expect(html).toContain('Đã hoàn thành');
  expect(html).toContain('Đã làm một phần');
  expect(html).toContain('Chưa thực hiện');
  expect(html).toContain('Ôn khóa ngoại');
});
