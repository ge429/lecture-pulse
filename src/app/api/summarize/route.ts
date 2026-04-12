import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/anthropic";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { fileUrl, fileName } = await req.json();
  if (!fileUrl) {
    return NextResponse.json({ error: "fileUrl required" }, { status: 400 });
  }

  const result = await callClaude([
    {
      role: "user",
      content: [
        {
          type: "document",
          source: { type: "url", url: fileUrl },
        },
        {
          type: "text",
          text: `이 강의자료(${fileName || "PDF"})의 핵심 개념을 3~5개로 요약해주세요.
학생이 시험 공부할 때 참고할 수 있도록 각 개념을 간결하게 설명해주세요.

규칙:
- 반드시 한국어로 작성
- 마크다운 문법(샵, 별표, 코드블록 등) 사용하지 마세요
- 이모지는 섹션 제목에만 1개씩
- 불릿은 "- " 만 사용
- 과제나 할 일이 있으면 반드시 포함

형식:
📌 한 줄 요약
이 자료의 핵심을 한 문장으로.

📖 주요 개념 (3~5개)
- 개념명: 1~2문장 설명
- 개념명: 1~2문장 설명

💡 시험 포인트
- 꼭 기억할 것 2~3개

📝 과제/할 일 (있는 경우만)
- 과제 내용, 마감일 등`,
        },
      ],
    },
  ]);

  if (!result.text) {
    return NextResponse.json(
      { error: result.error || "AI 요약을 생성할 수 없습니다" },
      { status: 500 }
    );
  }

  return NextResponse.json({ summary: result.text });
}
