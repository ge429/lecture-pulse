const STORAGE_KEY = "lecture-pulse-student-id";
const JOINED_KEY = "lecture-pulse-joined-sessions";

export function getStudentId(): string {
  if (typeof window === "undefined") return "";

  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

export function markSessionJoined(sessionId: string): void {
  if (typeof window === "undefined") return;
  const saved = localStorage.getItem(JOINED_KEY);
  const ids: string[] = saved ? JSON.parse(saved) : [];
  if (!ids.includes(sessionId)) {
    ids.push(sessionId);
    localStorage.setItem(JOINED_KEY, JSON.stringify(ids));
  }
}

export function getJoinedSessionIds(): string[] {
  if (typeof window === "undefined") return [];
  const saved = localStorage.getItem(JOINED_KEY);
  return saved ? JSON.parse(saved) : [];
}
