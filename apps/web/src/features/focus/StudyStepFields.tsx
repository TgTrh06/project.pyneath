import type { StudyStepInput } from '@pyneath/contracts';

export function StudyStepFields({ step, setStep, status, setStatus, note, setNote }: {
  step: string; setStep: (value: string) => void;
  status: StudyStepInput['stepStatus'] | ''; setStatus: (value: StudyStepInput['stepStatus'] | '') => void;
  note: string; setNote: (value: string) => void;
}) {
  return <fieldset className="session-checkout-fields"><legend>Ghi nhận bước học (không bắt buộc)</legend>
    <label>Bước bạn đã chọn<textarea maxLength={280} value={step} onChange={event => setStep(event.target.value)} /></label>
    <label>Kết quả<select value={status} onChange={event => setStatus(event.target.value as StudyStepInput['stepStatus'] | '')}>
      <option value="">Bỏ qua ghi nhận</option><option value="completed">Đã hoàn thành</option>
      <option value="partial">Đã làm một phần</option><option value="not_started">Chưa thực hiện</option>
    </select></label>
    {status && <label>Ghi chú riêng (không bắt buộc)<textarea maxLength={500} value={note} onChange={event => setNote(event.target.value)} /></label>}
  </fieldset>;
}
