const { test } = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('./assistance-eval-review-template.cjs');
const { parseBaselineReview, probeIds } = require('./assistance-eval-v2-run.cjs');

test('paid v2 stages require a complete frozen human baseline before inference', () => {
  assert.equal(probeIds.size, 12);
  assert.throws(() => parseBaselineReview(render()), /Human baseline reviewer and date/);
  const filled = render().replace('- Người chấm: TBD', '- Người chấm: Reviewer A')
    .replace('- Ngày chấm: TBD', '- Ngày chấm: 2026-11-13')
    .replaceAll('- **Điểm:** TBD', '- **Điểm:** pass')
    .replaceAll('- **Lý do:** TBD', '- **Lý do:** Đạt rubric.');
  assert.throws(() => parseBaselineReview(filled), /unobserved response/);
  const complete = filled.replace(/(## stuck_recovery-12[\s\S]*?- \*\*Điểm:\*\* )pass/, '$1fail');
  assert.equal(parseBaselineReview(complete).grades.length, 48);
  assert.throws(() => parseBaselineReview(complete.replace('Tôi đang làm mục tiêu báo cáo thực tập.', 'Đã sửa dữ liệu.')), /changed frozen case/);
});
