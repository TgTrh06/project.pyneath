import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProgressCharts, summarize } from './ProgressCharts';

it('separates the selected period from the preceding period and exposes daily values as a table', () => {
  const empty = { completed: 0, partial: 0, notStarted: 0, soloSessions: 0, campSessions: 0 };
  const days = Array.from({ length: 14 }, (_, index) => ({ date: new Date(Date.UTC(2026, 10, index + 1)).toISOString().slice(0, 10), ...empty }));
  days[0].completed = 2;
  days[7].completed = 3;
  days[13].partial = 1;
  days[13].campSessions = 2;
  expect(summarize(days.slice(-7))).toEqual({ completed: 3, partial: 1, notStarted: 0, soloSessions: 0, campSessions: 2 });
  const html = renderToStaticMarkup(<ProgressCharts progress={{ periodDays: 7, today: '2026-11-14', days }} timezone="Asia/Ho_Chi_Minh"/>);
  expect(html).toContain('Tăng 1 so với kỳ trước');
  expect(html).toContain('Xem số liệu từng ngày');
  expect(html).toContain('<table>');
  expect(html).toContain('Cùng Camp');
});
