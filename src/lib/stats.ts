export interface ResponseCounts {
  understood: number;
  confused: number;
  lost: number;
}

/**
 * 학생별 가장 최근 응답만 추출하여 타입별 개수를 집계
 */
export function computeLatestStats(
  responses: { student_id: string; type: string }[]
): ResponseCounts {
  const latestByStudent = new Map<string, string>();
  for (const r of responses) {
    if (!latestByStudent.has(r.student_id)) {
      latestByStudent.set(r.student_id, r.type);
    }
  }

  const counts: ResponseCounts = { understood: 0, confused: 0, lost: 0 };
  for (const type of latestByStudent.values()) {
    counts[type as keyof ResponseCounts]++;
  }
  return counts;
}
