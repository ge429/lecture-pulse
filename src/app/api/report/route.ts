import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { callClaude } from "@/lib/anthropic";

async function generateAISummary(context: string): Promise<string | null> {
  const result = await callClaude([
    {
      role: "user",
      content: `아래는 한 수업의 실시간 피드백 데이터입니다. 교수님을 위한 수업 리포트를 한국어로 작성해주세요.

규칙:
- 마크다운 문법(샵, 별표, 대시줄, 코드블록, 테이블 등) 절대 사용하지 마세요
- 특수기호(★, ◆, ■, ※ 등) 사용하지 마세요
- 이모지는 섹션 제목 앞에만 1개씩 사용하세요
- 불릿은 "- " 만 사용하세요
- 각 섹션 사이에 빈 줄을 넣어 구분하세요

형식:

📊 전체 이해도 요약
한 줄로 이번 수업의 전체 이해도를 요약.

⚠️ 혼란 구간 분석
시간대별 또는 슬라이드별로 학생들이 혼란을 느낀 구간을 분석.
구체적인 시간이나 슬라이드 번호를 포함해서 설명.

❓ 학생들의 핵심 어려움
학생 질문에서 드러나는 어려움 포인트를 정리. 2~3개.

💡 다음 수업을 위한 제안
교수님이 다음 수업에서 개선할 수 있는 구체적인 행동 2~3개.

데이터:
${context}`,
    },
  ], 1024);
  return result.text;
}

// ── 통계 계산 헬퍼 ──────────────────────────────────────────────────────────

interface Response {
  student_id: string;
  type: string;
  created_at: string;
}

function calculateTimeline(responses: Response[]) {
  const timeline: { time: string; understood: number; confused: number; lost: number }[] = [];
  if (responses.length === 0) return timeline;

  const start = new Date(responses[0].created_at).getTime();
  const end = new Date(responses[responses.length - 1].created_at).getTime();
  const bucketMs = 5 * 60 * 1000;

  for (let t = start; t <= end + bucketMs; t += bucketMs) {
    const bucketEnd = t + bucketMs;
    const bucket = responses.filter((r) => {
      const ts = new Date(r.created_at).getTime();
      return ts >= t && ts < bucketEnd;
    });
    if (bucket.length === 0) continue;

    const latest = new Map<string, string>();
    for (const r of bucket) latest.set(r.student_id, r.type);

    const counts = { understood: 0, confused: 0, lost: 0 };
    for (const type of latest.values()) counts[type as keyof typeof counts]++;

    const d = new Date(t);
    timeline.push({
      time: `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`,
      ...counts,
    });
  }
  return timeline;
}

function buildQuestionClusters(questions: { text: string; cluster_id: number | null }[]) {
  const clusterMap = new Map<number, string[]>();
  const unclustered: string[] = [];

  for (const q of questions) {
    if (q.cluster_id !== null) {
      const arr = clusterMap.get(q.cluster_id) ?? [];
      arr.push(q.text);
      clusterMap.set(q.cluster_id, arr);
    } else {
      unclustered.push(q.text);
    }
  }

  const clusters = [...clusterMap.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([id, texts]) => ({ clusterId: id, count: texts.length, questions: texts }));

  return { clusters, unclustered };
}

// ── GET handler ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("id, name, code, created_at, is_active")
    .eq("id", sessionId)
    .single();

  if (!session) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }

  // 데이터 병렬 조회
  const [{ data: responses }, { data: questions }, { data: materials }] = await Promise.all([
    supabase.from("responses").select("student_id, type, created_at, slide_number").eq("session_id", sessionId).order("created_at", { ascending: true }),
    supabase.from("questions").select("text, cluster_id, created_at").eq("session_id", sessionId).order("created_at", { ascending: true }),
    supabase.from("materials").select("file_name, summary").eq("session_id", sessionId),
  ]);

  const allResponses = responses ?? [];
  const allQuestions = questions ?? [];
  const allMaterials = materials ?? [];

  // 통계 계산
  const uniqueStudents = new Set(allResponses.map((r) => r.student_id)).size;
  const typeCounts = { understood: 0, confused: 0, lost: 0 };
  for (const r of allResponses) typeCounts[r.type as keyof typeof typeCounts]++;

  const timeline = calculateTimeline(allResponses);
  const { clusters: questionClusters, unclustered: unclusteredQs } = buildQuestionClusters(allQuestions);

  // 슬라이드별 이해도 통계
  const slideMap = new Map<number, { understood: number; confused: number; lost: number }>();
  for (const r of allResponses) {
    if (r.slide_number !== null && r.slide_number !== undefined) {
      const s = slideMap.get(r.slide_number) ?? { understood: 0, confused: 0, lost: 0 };
      s[r.type as keyof typeof s]++;
      slideMap.set(r.slide_number, s);
    }
  }
  const slideStats = [...slideMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([slide, counts]) => ({ slide, ...counts }));

  // AI 요약
  const materialSummaries = allMaterials.filter((m) => m.summary).map((m) => m.summary).join("\n");
  const slideStatsText = slideStats.length > 0
    ? `\n슬라이드별 이해도: ${slideStats.map((s) => `${s.slide + 1}페이지(이해:${s.understood}, 헷갈림:${s.confused}, 모르겠음:${s.lost})`).join(", ")}`
    : "";
  const contextForAI = `수업명: ${session.name}
참여 학생: ${uniqueStudents}명
총 응답: ${allResponses.length}건 (이해됨: ${typeCounts.understood}, 헷갈림: ${typeCounts.confused}, 모르겠음: ${typeCounts.lost})
시간대별 추이: ${JSON.stringify(timeline)}${slideStatsText}
질문 (${allQuestions.length}건): ${allQuestions.map((q) => q.text).join(" / ")}
수업 자료 (${allMaterials.length}건): ${materialSummaries.slice(0, 3000)}`;

  const aiSummary = await generateAISummary(contextForAI);

  return NextResponse.json({
    session: { name: session.name, code: session.code, createdAt: session.created_at, isActive: session.is_active },
    stats: { uniqueStudents, totalResponses: allResponses.length, typeCounts, timeline, slideStats },
    questions: { total: allQuestions.length, clusters: questionClusters, unclustered: unclusteredQs },
    materials: allMaterials.map((m) => ({ fileName: m.file_name, hasSummary: !!m.summary })),
    aiSummary,
  });
}
