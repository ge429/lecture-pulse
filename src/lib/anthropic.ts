const MODEL = "claude-haiku-4-5-20251001";
const API_VERSION = "2023-06-01";

export async function callClaude(
  messages: { role: string; content: unknown }[],
  maxTokens = 2048
): Promise<{ text: string | null; error?: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { text: null, error: "ANTHROPIC_API_KEY가 설정되지 않았습니다." };
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": API_VERSION,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        messages,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Claude API failed:", res.status, errText);
      return { text: null, error: `Claude API 오류 (${res.status}): ${errText.slice(0, 200)}` };
    }

    const data = await res.json();
    return { text: data.content?.[0]?.text ?? null };
  } catch (err) {
    console.error("Claude API error:", err);
    return { text: null, error: `API 호출 실패: ${String(err).slice(0, 200)}` };
  }
}
