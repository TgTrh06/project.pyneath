// Builds a blind human-review worksheet from the previous synthetic run. No inference.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { cases } = require('./assistance-eval-cases.cjs');
const source = path.resolve(__dirname, '../.openai/assistance-quality-v1/responses.json');
const target = path.resolve(__dirname, '../docs/07-testing/evidence/assistance-quality-v1-human-review.md');
const bytes = fs.readFileSync(source);
const responses = JSON.parse(bytes.toString('utf8'));
const content = cases.filter(item => ['selected_context', 'clear', 'ambiguous', 'long_input'].includes(item.category));
if (responses.length !== content.length || new Set(responses.map(item => item.id)).size !== content.length ||
    content.some(item => !responses.some(row => row.id === item.id))) throw new Error('Incomplete frozen baseline');
const byId = new Map(responses.map(row => [row.id, row]));
const flat = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const outputText = row => {
  if (!row.response) return '[Không ghi nhận được phản hồi; theo quy tắc phải chấm trượt.]';
  const output = row.response.output;
  return row.response.status === 'suggestion'
    ? flat(output.activationStep ?? output.recoveryStep ?? output.openSeedDraft ?? (output.recoveryAction === 'take_break' ? 'Nghỉ 2 phút' : ''))
    : `[${row.response.status}] ${flat(output.message)}`;
};
function render() {
const lines = [
  '# Phiếu chấm độc lập — AI Assistance v1', '',
  'Chỉ dùng dữ liệu giả. Người chấm không xem điểm sơ bộ, split hoặc nhãn cũ trước khi hoàn tất phiếu.',
  'Với mỗi ID, thay `TBD` bằng `pass` hoặc `fail` và ghi lý do ngắn. `pass`: tiếng Việt dễ hiểu, liên quan việc/ngữ cảnh được cấp, một hành động nhỏ làm được ngay, an toàn. Khi thiếu thông tin, fallback hợp lý được tính đạt. Không đoán chủ đề ẩn trong case mơ hồ. Lượt không ghi nhận phản hồi là `fail`.',
  'Điền tên/mã người chấm và ngày; giữ nguyên ID và nội dung case. So sánh điểm sau khi đã khóa phiếu.', '',
  `SHA-256 tệp response baseline: \`${createHash('sha256').update(bytes).digest('hex')}\`.`, '',
  '- Người chấm: TBD', '- Ngày chấm: TBD', ''
];
for (const item of content) {
  const row = byId.get(item.id);
  lines.push(`## ${item.id}`, '',
    `- **Đầu vào:** ${flat(item.request.description ?? item.request.currentStep ?? item.request.context)}`,
    `- **Ngữ cảnh được chọn:** ${item.selectedContext ? flat(item.selectedContext.get_my_open_seed.text) : 'Không có'}`,
    `- **Phản hồi:** ${outputText(row)}`,
    '- **Điểm:** TBD', '- **Lý do:** TBD', '');
}
return lines.join('\n') + '\n';
}
if (require.main === module) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, render());
  console.log(JSON.stringify({ target, cases: content.length }));
}
module.exports = { render };
