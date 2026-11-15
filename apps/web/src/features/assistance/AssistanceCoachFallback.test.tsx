import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const state = vi.hoisted(() => ({ result: null as null | { status: string; reason?: string; output: { message: string } } }));
vi.mock('./useAssistance', () => ({
  useAssistance: () => ({
    available: true, config: { enabled: true, processing: 'external', capabilities: ['assisted_start'] },
    toolsConfig: null, context: null, contextPending: false, contextError: '', selectedTools: [],
    loadContext: () => {}, toggleTool: () => {}, mode: 'too_large', setMode: () => {},
    visibleResult: state.result, draft: '', pending: false, error: '', feedbackReason: undefined,
    setFeedbackReason: () => {}, trigger: { current: null }, proposalInput: { current: null },
    ask: () => {}, dismiss: () => {}, choose: () => {}, takeBreak: () => {}, editDraft: () => {}
  })
}));

describe('Assistance fallback guidance', () => {
  it('asks for a concrete task on an unreasoned fallback and keeps quota wording distinct', async () => {
    const { AssistanceCoach } = await import('./AssistanceCoach');
    state.result = { status: 'fallback', output: { message: 'Chưa thể tạo gợi ý.' } };
    const missing = renderToStaticMarkup(<AssistanceCoach capability="assisted_start" value="Tôi chưa biết làm gì" onChoose={() => {}} />);
    expect(missing).toContain('Hãy thêm một câu về việc đang làm');
    expect(missing).toContain('nội dung bạn nhập vẫn ở đây');
    expect(missing).toContain('role="status"');
    state.result = { status: 'fallback', reason: 'quota', output: { message: 'Chưa thể tạo gợi ý.' } };
    const quota = renderToStaticMarkup(<AssistanceCoach capability="assisted_start" value="Tôi đang viết báo cáo" onChoose={() => {}} />);
    expect(quota).toContain('Hôm nay đã hết lượt gợi ý');
    expect(quota).not.toContain('Chưa đủ thông tin để gợi ý');
  });
});
