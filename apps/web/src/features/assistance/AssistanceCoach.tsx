import type { AssistanceInteraction, StuckMode } from '@pyneath/contracts';
import { SelectMenu } from '../../shared/components/SelectMenu';
import { assistanceDisclosure, assistanceFeedbackReasons, assistanceLabels } from './assistanceState';
import { useAssistance, type AssistanceOptions } from './useAssistance';
import './assistance.css';

export function AssistanceCoach(props: AssistanceOptions) {
  const { capability, value, disabled = false, breakDisabled = false, onTakeBreak, onValueChange } = props;
  const { available, config, toolsConfig,
    mode, setMode, visibleResult, draft, pending, error, feedbackReason, setFeedbackReason, trigger, proposalInput, ask, dismiss, choose, takeBreak, editDraft } = useAssistance(props);
  if (!available || !config) return null;
  return <section className="assistance-coach" aria-label={assistanceLabels[capability]}>
    <div className="assistance-coach__intro"><strong>Gợi ý khi cần</strong><p className="field-hint">{assistanceDisclosure(config.processing, toolsConfig?.provider)}</p></div>
    {capability === 'stuck_recovery' && onValueChange && <label>Việc đang vướng<textarea value={value} maxLength={280} onChange={event => onValueChange(event.target.value)} placeholder="Mô tả bước bạn đang muốn tiếp tục" /></label>}
    {capability === 'stuck_recovery' && <SelectMenu label="Điều gì đang làm bạn mắc kẹt?" value={mode} onChange={value => setMode(value as StuckMode)} disabled={disabled} options={[
      { value: 'too_large', label: 'Việc đang quá lớn' }, { value: 'unclear_next_step', label: 'Chưa rõ bước tiếp theo' },
      { value: 'distracted', label: 'Khó giữ tập trung' }, { value: 'low_energy', label: 'Đang ít năng lượng' }
    ]}/>}
    <div className="assistance-coach__request"><p className="field-hint">AI sẽ dùng nội dung bạn nhập, phiên tập trung hiện tại và điểm tiếp tục của bạn để tạo gợi ý.</p><p className="field-hint">Hãy nêu tên việc hoặc màn hình đang làm và điều bạn muốn làm tiếp; một câu ngắn là đủ.</p>
    <button ref={trigger} type="button" className="text-action" disabled={disabled || pending || !value.trim()} onClick={() => void ask()}>{pending ? 'Đang tạo gợi ý…' : visibleResult?.status === 'suggestion' ? 'Yêu cầu gợi ý khác' : assistanceLabels[capability]}</button>
    {pending && <p role="status">Đang tạo bản nháp. Bạn vẫn có thể tự viết tiếp.</p>}
    {error && <p role="alert">{error}</p>}
    {visibleResult?.status !== 'suggestion' && visibleResult?.output.message && <p role="status">{
      visibleResult.status === 'boundary' ? visibleResult.output.message
        : visibleResult.reason === 'quota' ? 'Hôm nay đã hết lượt gợi ý. Nội dung bạn nhập vẫn ở đây; hãy tự viết tiếp.'
          : visibleResult.reason === 'context_unavailable' ? 'Chưa đọc được ngữ cảnh nên AI chưa tạo gợi ý. Hãy thử lại; nội dung bạn nhập vẫn ở đây.'
            : visibleResult.reason === 'invalid_output' ? 'Gợi ý vừa tạo chưa dùng được. Nội dung bạn nhập vẫn ở đây; hãy tự viết tiếp hoặc yêu cầu gợi ý mới.'
              : visibleResult.reason === 'timeout' ? 'Dịch vụ AI phản hồi quá lâu. Nội dung bạn nhập vẫn ở đây; hãy tự viết tiếp hoặc thử lại.'
                : visibleResult.reason === 'unavailable' ? 'Dịch vụ AI đang không khả dụng. Nội dung bạn nhập vẫn ở đây; hãy tự viết tiếp hoặc thử lại sau.'
                : 'Chưa đủ thông tin để gợi ý một bước cụ thể. Hãy thêm một câu về việc đang làm hoặc tiếp tục viết thủ công; nội dung bạn nhập vẫn ở đây.'
    }</p>}</div>
    {visibleResult?.status === 'suggestion' && <div className="assistance-coach__proposal" aria-live="polite">
      {visibleResult.output.recoveryAction === 'take_break' ? <>
        <p>Bạn có thể nghỉ ngắn 2 phút. Đồng hồ Focus vẫn chạy.</p>
        <button type="button" className="secondary" disabled={disabled || breakDisabled || !onTakeBreak} onClick={takeBreak}>Nghỉ 2 phút</button>
      </> : <>
        <label>Bản nháp gợi ý<textarea ref={proposalInput} value={draft} maxLength={capability === 'open_seed_draft' ? 500 : 280} onChange={event => editDraft(event.target.value)} /></label>
        {visibleResult.output.estimatedMinutes && <p className="field-hint">Bước gợi ý: khoảng {visibleResult.output.estimatedMinutes} phút. Thời lượng Focus bạn đã chọn không thay đổi.</p>}
        <button type="button" className="secondary" disabled={disabled || !draft.trim()} onClick={choose}>Dùng bản nháp</button>
      </>}
      <SelectMenu label="Lý do bỏ gợi ý (không bắt buộc)" value={feedbackReason ?? ''} onChange={value => setFeedbackReason(value ? value as AssistanceInteraction['reason'] : undefined)}
        options={[{ value: '', label: 'Không chọn' }, ...assistanceFeedbackReasons]}/>
      <button type="button" className="text-action" onClick={dismiss}>Bỏ gợi ý</button>
    </div>}
  </section>;
}
