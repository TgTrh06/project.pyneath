import type { ChatSuggestedAction } from '@pyneath/contracts';
import type { ChatLlmPort, ChatSynthesisInput, ChatSynthesisOutput } from '../application/rag.ports';

const SYSTEM_PROMPT = `Bạn là Marten — trợ lý phân tích công việc & tối ưu thời gian của Pyneath.
Nhiệm vụ của bạn:
1. Phân tích sâu vấn đề người dùng đang vướng mắc dựa trên câu hỏi và các đoạn ngữ cảnh truy xuất từ dữ liệu cá nhân (Planner, Habits, Focus Sessions, Study Steps, Open Seed, Ghi chú & Tài liệu đã tải lên).
2. Trả lời bằng tiếng Việt rõ ràng, súc tích, format Markdown đẹp mắt gồm các mục:
   - ### 🔍 Tóm tắt vấn đề
   - ### 🧩 Điểm nghẽn & Ngữ cảnh liên quan
   - ### ✅ Kế hoạch hành động từng bước (dùng checklist \`- [ ]\` hoặc bảng Markdown kèm ước lượng thời gian)
3. Trả về JSON thuần theo đúng schema: { "content": string, "suggestedActions": [{ "kind": "add_to_planner" | "start_focus", "title": string, "durationMinutes": number }] }.`;

export class EnvChatLlmProvider implements ChatLlmPort {
  async synthesize(input: ChatSynthesisInput): Promise<ChatSynthesisOutput> {
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || '';
    const isOpenRouter = Boolean(process.env.OPENROUTER_API_KEY);
    if (!apiKey) {
      return deterministicFallback(input);
    }

    const contextBlock =
      input.citations.length > 0
        ? input.citations
            .map((c, idx) => `[${idx + 1}] (${c.sourceType}) ${c.title}:\n${c.excerpt}`)
            .join('\n\n')
        : 'Chưa có tài liệu hoặc dữ liệu liên quan được truy xuất.';

    const endpoint = isOpenRouter
      ? 'https://openrouter.ai/api/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';
    const model = isOpenRouter
      ? process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini'
      : process.env.OPENAI_MODEL || 'gpt-4o-mini';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...input.history.slice(-6).map(m => ({ role: m.role, content: m.content })),
            {
              role: 'user',
              content: `Câu hỏi của người dùng:\n${input.userMessage}\n\nNgữ cảnh truy xuất (RAG):\n${contextBlock}`,
            },
          ],
        }),
        signal: AbortSignal.timeout(25_000),
      });
      if (!response.ok) return deterministicFallback(input);
      const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const raw = data.choices?.[0]?.message?.content;
      if (!raw) return deterministicFallback(input);
      const parsed = JSON.parse(raw) as { content?: string; suggestedActions?: ChatSuggestedAction[] };
      if (typeof parsed.content === 'string' && parsed.content.trim()) {
        return {
          content: parsed.content.trim(),
          suggestedActions: Array.isArray(parsed.suggestedActions) ? parsed.suggestedActions.slice(0, 4) : [],
        };
      }
      return deterministicFallback(input);
    } catch {
      return deterministicFallback(input);
    }
  }
}

function deterministicFallback(input: ChatSynthesisInput): ChatSynthesisOutput {
  const topCitations = input.citations.slice(0, 3);
  const contextLines =
    topCitations.length > 0
      ? topCitations.map(c => `- **${c.title}** (*${c.sourceType}*): ${c.excerpt.slice(0, 140)}…`).join('\n')
      : '- Hiện chưa tìm thấy tài liệu trùng khớp trong kho ngữ cảnh. Bạn có thể đồng bộ dữ liệu hoặc tải lên tài liệu PDF/DOCX/MD.';

  const shortTask = input.userMessage.slice(0, 80).trim();
  const content = [
    `### 🔍 Tóm tắt vấn đề`,
    `Bạn đang cần tháo gỡ: **"${shortTask}"**.`,
    ``,
    `### 🧩 Ngữ cảnh liên quan đã truy xuất`,
    contextLines,
    ``,
    `### ✅ Kế hoạch hành động đề xuất`,
    `| Bước | Việc cần làm | Thời lượng |`,
    `| --- | --- | --- |`,
    `| 1 | Khoanh vùng 1 đầu việc nhỏ nhất để bắt đầu ngay | 10 phút |`,
    `| 2 | Chạy 1 phiên Focus không gián đoạn và ghi lại vướng mắc | 25 phút |`,
    `| 3 | Cập nhật tiến độ vào Planner & đánh dấu thói quen cuối ngày | 5 phút |`,
    ``,
    `> **Gợi ý của Marten:** Hãy chọn một bước nhỏ bên dưới để đưa thẳng vào Planner hoặc mở phiên Focus ngay.`,
  ].join('\n');

  return {
    content,
    suggestedActions: [
      { kind: 'add_to_planner', title: `Xử lý bước đầu: ${shortTask.slice(0, 50)}`, durationMinutes: 25 },
      { kind: 'start_focus', title: shortTask.slice(0, 60), durationMinutes: 25 },
    ],
  };
}
