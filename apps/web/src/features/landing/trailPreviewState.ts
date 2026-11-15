export const trails = [
  { label: "Báo cáo dang dở", step: "Mở báo cáo. Viết một gạch đầu dòng.", smaller: "Chỉ mở tài liệu báo cáo." },
  { label: "Bài tập chưa bắt đầu", step: "Mở đề bài. Đọc câu hỏi đầu tiên.", smaller: "Chỉ mở đề bài." },
  { label: "Chưa biết bắt đầu", step: "Viết xuống một việc đang ở trong đầu.", smaller: "Viết vài từ về điều đang vướng." },
] as const;
export type PreviewState = { selected: number | null; small: boolean };
export type PreviewAction = { type: "select"; index: number } | { type: "shrink" };
export function previewReducer(state: PreviewState, action: PreviewAction): PreviewState {
  if (action.type === "select") return action.index >= 0 && action.index < trails.length ? { selected: action.index, small: false } : state;
  return state.selected === null ? state : { ...state, small: true };
}
