import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// ── 한국어 대응 키워드 군집화 ─────────────────────────────────────────────────

// 불용어 (의미 없는 단어)
const STOPWORDS = new Set([
  "이", "그", "저", "것", "수", "등", "좀", "잘", "더", "안",
  "은", "는", "이", "가", "을", "를", "에", "의", "로", "와", "과",
  "도", "만", "에서", "까지", "부터", "으로", "하고",
  "what", "how", "why", "the", "is", "are", "do", "does",
]);

function extractKeywords(text: string): string[] {
  // 특수문자 제거, 소문자 변환
  const cleaned = text
    .toLowerCase()
    .replace(/[?？!！.,。~\-()（）]/g, " ")
    .trim();

  // 공백 기준 토큰 분리
  const tokens = cleaned.split(/\s+/).filter((t) => t.length > 1);

  // 불용어 제거
  return tokens.filter((t) => !STOPWORDS.has(t));
}

// 두 문자열이 부분적으로 겹치는지 (한국어 조사 대응)
function partialMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length > b.length ? a : b;
  // 짧은 쪽이 2글자 이상이고, 긴 쪽에 포함되면 매칭
  return shorter.length >= 2 && longer.includes(shorter);
}

function countOverlap(tokensA: string[], tokensB: string[]): number {
  let count = 0;
  for (const a of tokensA) {
    for (const b of tokensB) {
      if (partialMatch(a, b)) {
        count++;
        break;
      }
    }
  }
  return count;
}

function clusterByKeywords(
  questions: { id: string; text: string }[]
): Map<number, string[]> {
  const clusters = new Map<number, string[]>();
  const clusterTokens: string[][] = [];

  for (const q of questions) {
    const tokens = extractKeywords(q.text);
    if (tokens.length === 0) {
      // 토큰이 없으면 단독 클러스터
      const ci = clusterTokens.length;
      clusterTokens.push([q.text]);
      clusters.set(ci, [q.id]);
      continue;
    }

    let bestCluster = -1;
    let bestScore = 0;

    for (let ci = 0; ci < clusterTokens.length; ci++) {
      const overlap = countOverlap(tokens, clusterTokens[ci]);
      const score = overlap / Math.max(tokens.length, 1);
      if (score > bestScore && score >= 0.2) {
        bestScore = score;
        bestCluster = ci;
      }
    }

    if (bestCluster === -1) {
      bestCluster = clusterTokens.length;
      clusterTokens.push([...tokens]);
      clusters.set(bestCluster, []);
    } else {
      for (const t of tokens) {
        if (!clusterTokens[bestCluster].some((ct) => partialMatch(ct, t))) {
          clusterTokens[bestCluster].push(t);
        }
      }
    }

    clusters.get(bestCluster)!.push(q.id);
  }

  return clusters;
}

// ── AI 군집화 (ANTHROPIC_API_KEY가 있을 때) ────────────────────────────────────

async function clusterByAI(
  questions: { id: string; text: string }[]
): Promise<Map<number, string[]> | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const prompt = `아래는 수업 중 학생들이 보낸 질문 목록입니다. 의미가 비슷한 질문끼리 군집으로 묶어주세요.
같은 주제나 개념에 대한 질문이면 표현이 달라도 같은 군집으로 묶으세요.
단독 질문도 하나의 군집으로 만들어주세요.

질문 목록:
${questions.map((q, i) => `${i + 1}. [${q.id}] ${q.text}`).join("\n")}

응답 형식 (반드시 JSON만 출력, 다른 텍스트 없이):
{"clusters": [{"ids": ["uuid1", "uuid2"], "label": "군집 요약"}, ...]}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      console.error("AI clustering failed:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const text = data.content?.[0]?.text ?? "";

    // JSON 부분만 추출 (혹시 마크다운 코드블록 등 포함 시)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("AI clustering: no JSON found in response:", text);
      return null;
    }

    const json = JSON.parse(jsonMatch[0]);

    const result = new Map<number, string[]>();
    for (let i = 0; i < json.clusters.length; i++) {
      result.set(i, json.clusters[i].ids);
    }
    return result;
  } catch (err) {
    console.error("AI clustering error:", err);
    return null;
  }
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json();
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  // 미군집 질문 조회
  const { data: questions } = await supabase
    .from("questions")
    .select("id, text")
    .eq("session_id", sessionId)
    .is("cluster_id", null)
    .order("created_at", { ascending: true });

  if (!questions || questions.length === 0) {
    return NextResponse.json({ clustered: 0 });
  }

  // AI 군집화 시도 → 실패 시 키워드 폴백
  const clusters = (await clusterByAI(questions)) ?? clusterByKeywords(questions);

  // 1개짜리 클러스터는 군집화하지 않음 (의미 없음)
  const meaningfulClusters = new Map<number, string[]>();
  for (const [key, ids] of clusters) {
    if (ids.length >= 2) {
      meaningfulClusters.set(key, ids);
    }
  }

  if (meaningfulClusters.size === 0) {
    return NextResponse.json({ clustered: 0 });
  }

  // 기존 최대 cluster_id 조회
  const { data: maxRow } = await supabase
    .from("questions")
    .select("cluster_id")
    .eq("session_id", sessionId)
    .not("cluster_id", "is", null)
    .order("cluster_id", { ascending: false })
    .limit(1)
    .single();

  let nextClusterId = (maxRow?.cluster_id ?? -1) + 1;

  // DB 업데이트
  let clustered = 0;
  for (const [, ids] of meaningfulClusters) {
    const cid = nextClusterId++;
    await supabase
      .from("questions")
      .update({ cluster_id: cid })
      .in("id", ids);
    clustered += ids.length;
  }

  return NextResponse.json({ clustered });
}
