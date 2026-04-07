import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// ── AI 요약 (선택) ───────────────────────────────────────────────────────────

async function generateAISummary(context: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20241022",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `아래는 한 수업의 실시간 피드백 데이터입니다. 교수님을 위한 간결한 수업 리포트를 한국어로 작성해주세요.

포함할 내용:
1. 전체 이해도 요약 (한 줄)
2. 주요 혼란 구간 분석 (시간대별 변화가 있다면)
3. 학생 질문에서 드러나는 핵심 어려움 포인트
4. 다음 수업을 위한 제안 (2~3개)

데이터:
${context}`,
          },
        ],
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.content?.[0]?.text ?? null;
  } catch {
    return null;
  }
}

// ── GET handler ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  // 세션 정보
  const { data: session } = await supabase
    .from("sessions")
    .select("id, name, code, created_at, is_active")
    .eq("id", sessionId)
    .single();

  if (!session) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }

  // 전체 응답
  const { data: responses } = await supabase
    .from("responses")
    .select("student_id, type, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  // 전체 질문
  const { data: questions } = await supabase
    .from("questions")
    .select("text, cluster_id, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  const allResponses = responses ?? [];
  const allQuestions = questions ?? [];

  // ── 통계 계산 ──

  // 고유 학생 수
  const uniqueStudents = new Set(allResponses.map((r) => r.student_id)).size;

  // 전체 타입 분포
  const typeCounts = { understood: 0, confused: 0, lost: 0 };
  for (const r of allResponses) {
    typeCounts[r.type as keyof typeof typeCounts]++;
  }

  // 시간대별 추이 (5분 단위)
  const timeline: { time: string; understood: number; confused: number; lost: number }[] = [];
  if (allResponses.length > 0) {
    const start = new Date(allResponses[0].created_at).getTime();
    const end = new Date(allResponses[allResponses.length - 1].created_at).getTime();
    const bucketMs = 5 * 60 * 1000;

    for (let t = start; t <= end + bucketMs; t += bucketMs) {
      const bucketEnd = t + bucketMs;
      const bucket = allResponses.filter((r) => {
        const ts = new Date(r.created_at).getTime();
        return ts >= t && ts < bucketEnd;
      });

      if (bucket.length === 0) continue;

      // 이 구간에서 학생별 마지막 응답
      const latest = new Map<string, string>();
      for (const r of bucket) {
        latest.set(r.student_id, r.type);
      }

      const counts = { understood: 0, confused: 0, lost: 0 };
      for (const type of latest.values()) {
        counts[type as keyof typeof counts]++;
      }

      const d = new Date(t);
      timeline.push({
        time: `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`,
        ...counts,
      });
    }
  }

  // 질문 군집
  const clusterMap = new Map<number, string[]>();
  const unclusteredQs: string[] = [];
  for (const q of allQuestions) {
    if (q.cluster_id !== null) {
      const arr = clusterMap.get(q.cluster_id) ?? [];
      arr.push(q.text);
      clusterMap.set(q.cluster_id, arr);
    } else {
      unclusteredQs.push(q.text);
    }
  }

  const questionClusters = [...clusterMap.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([id, texts]) => ({ clusterId: id, count: texts.length, questions: texts }));

  // ── AI 요약 생성 ──
  const contextForAI = `
수업명: ${session.name}
참여 학생: ${uniqueStudents}명
총 응답: ${allResponses.length}건 (이해됨: ${typeCounts.understood}, 헷갈림: ${typeCounts.confused}, 모르겠음: ${typeCounts.lost})
시간대별 추이: ${JSON.stringify(timeline)}
질문 (${allQuestions.length}건): ${allQuestions.map((q) => q.text).join(" / ")}
`;

  const aiSummary = await generateAISummary(contextForAI);

  return NextResponse.json({
    session: {
      name: session.name,
      code: session.code,
      createdAt: session.created_at,
      isActive: session.is_active,
    },
    stats: {
      uniqueStudents,
      totalResponses: allResponses.length,
      typeCounts,
      timeline,
    },
    questions: {
      total: allQuestions.length,
      clusters: questionClusters,
      unclustered: unclusteredQs,
    },
    aiSummary,
  });
}
