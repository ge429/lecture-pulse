// options가 배열(수동 퀴즈) 또는 {choices, _answer} 객체(AI 퀴즈)일 수 있음
export function getChoices(options: unknown): string[] {
  if (Array.isArray(options)) return options;
  if (options && typeof options === "object" && "choices" in options) {
    return (options as { choices: string[] }).choices;
  }
  return [];
}

export function getAnswer(options: unknown): string | null {
  if (options && typeof options === "object" && "_answer" in options) {
    return (options as { _answer: string })._answer;
  }
  return null;
}
