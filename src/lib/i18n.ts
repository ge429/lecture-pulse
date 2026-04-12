export type Locale = "ko" | "en" | "zh";

export const LOCALE_LABELS: Record<Locale, string> = {
  ko: "한국어",
  en: "English",
  zh: "中文",
};

const translations: Record<string, Record<Locale, string>> = {
  // Landing
  "landing.subtitle": {
    ko: "실시간 수업 이해도 피드백 서비스",
    en: "Real-time Lecture Comprehension Feedback",
    zh: "实时课堂理解度反馈服务",
  },
  "landing.professor": {
    ko: "🎓 교수로 시작하기",
    en: "🎓 Start as Professor",
    zh: "🎓 以教授身份开始",
  },
  "landing.student": {
    ko: "🙋 학생으로 참여하기",
    en: "🙋 Join as Student",
    zh: "🙋 以学生身份参加",
  },
  "landing.analysis": {
    ko: "실시간 분석",
    en: "Real-time Analysis",
    zh: "实时分析",
  },
  "landing.analysisDesc": {
    ko: "수업 중 학생들의 실시간 반응과 이해도를 즉각적인 데이터로 확인하세요.",
    en: "Monitor students' real-time reactions and comprehension with instant data.",
    zh: "通过即时数据确认学生的实时反应和理解度。",
  },
  "landing.ai": {
    ko: "AI 인사이트",
    en: "AI Insights",
    zh: "AI 洞察",
  },
  "landing.aiDesc": {
    ko: "수업 종료 후 AI 코치가 제공하는 강의 개선 제안과 핵심 요약 리포트.",
    en: "AI coach provides teaching improvement suggestions and summary reports.",
    zh: "AI教练提供教学改进建议和核心摘要报告。",
  },
  "landing.interactive": {
    ko: "양방향 소통",
    en: "Interactive",
    zh: "双向沟通",
  },
  "landing.interactiveDesc": {
    ko: "익명 피드백과 실시간 Q&A를 통해 더 깊이 있는 수업 참여를 유도합니다.",
    en: "Anonymous feedback and live Q&A encourage deeper class participation.",
    zh: "通过匿名反馈和实时问答促进更深层次的课堂参与。",
  },
  // Student
  "student.understood": { ko: "이해됨", en: "Understood", zh: "理解了" },
  "student.confused": { ko: "헷갈림", en: "Confused", zh: "困惑" },
  "student.lost": { ko: "모르겠음", en: "Lost", zh: "不明白" },
  "student.active": { ko: "수업 진행 중", en: "Session Active", zh: "课程进行中" },
  "student.selectLevel": { ko: "현재 이해도를 선택해주세요", en: "Select your comprehension level", zh: "请选择您的理解程度" },
  "student.ended": { ko: "수업이 종료되었습니다", en: "Session Ended", zh: "课程已结束" },
  "student.endedDesc": { ko: "수고하셨습니다! 오늘 수업은 여기까지입니다.", en: "Great work! That's all for today.", zh: "辛苦了！今天的课到此结束。" },
  "student.home": { ko: "홈으로 돌아가기", en: "Back to Home", zh: "返回首页" },
  // Create
  "create.title": { ko: "수업 만들기", en: "Create Session", zh: "创建课程" },
  "create.subtitle": { ko: "Protocol Initialization", en: "Protocol Initialization", zh: "协议初始化" },
  "create.label": { ko: "Lecture Identity", en: "Lecture Identity", zh: "课程标识" },
  "create.placeholder": { ko: "강의 제목을 입력하세요", en: "Enter lecture title", zh: "请输入课程标题" },
  "create.submit": { ko: "Generate Access Link", en: "Generate Access Link", zh: "生成访问��接" },
  "create.loading": { ko: "Generating...", en: "Generating...", zh: "生成中..." },
  // Join
  "join.title": { ko: "수업 참여", en: "Sync Pulse", zh: "加入课程" },
  "join.subtitle": { ko: "Authentication Required", en: "Authentication Required", zh: "需要验证" },
  "join.label": { ko: "Access Protocol Code", en: "Access Protocol Code", zh: "访问协议代码" },
  "join.placeholder": { ko: "강의 코드 6자리", en: "6-digit code", zh: "6位代码" },
  "join.submit": { ko: "Join Neural Network", en: "Join Neural Network", zh: "加入网络" },
  "join.loading": { ko: "Connecting...", en: "Connecting...", zh: "连接中..." },
  // Common
  "common.history": { ko: "📋 Session History", en: "📋 Session History", zh: "📋 会话历史" },
  "common.back": { ko: "← Back", en: "← Back", zh: "← 返回" },
  // Settings menu
  "menu.darkMode": { ko: "다크모드", en: "Dark Mode", zh: "深色模式" },
  "menu.lightMode": { ko: "라이트모드", en: "Light Mode", zh: "浅色模式" },
  "menu.language": { ko: "언어", en: "Language", zh: "语言" },
};

export function t(key: string, locale: Locale): string {
  return translations[key]?.[locale] ?? translations[key]?.ko ?? key;
}
