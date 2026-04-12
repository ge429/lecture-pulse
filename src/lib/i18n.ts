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
  // Dashboard
  "dash.live": { ko: "실시간", en: "Live", zh: "实时" },
  "dash.participants": { ko: "참여", en: "Participants", zh: "参与" },
  "dash.engagement": { ko: "Neural Engagement Pulse", en: "Neural Engagement Pulse", zh: "神经参与脉冲" },
  "dash.biometrics": { ko: "실시간 이해도 분석", en: "Real-time biometrics", zh: "实时生物特征" },
  "dash.noResponses": { ko: "아직 응답이 없습니다. 학생들이 참여하면 여기에 표시됩니다.", en: "No responses yet. Data will appear when students participate.", zh: "暂无响应。学生参与后将在此显示。" },
  "dash.report": { ko: "Report", en: "Report", zh: "报告" },
  "dash.endSession": { ko: "End Session", en: "End Session", zh: "结束课程" },
  "dash.ended": { ko: "종료됨", en: "Ended", zh: "已结束" },
  "dash.copilot": { ko: "AI Copilot", en: "AI Copilot", zh: "AI 副驾驶" },
  "dash.copilotHint": { ko: "혼란도가 높아지면 AI가 자동으로 제안합니다.", en: "AI will suggest automatically when confusion rises.", zh: "困惑度升高时AI会自动建议。" },
  "dash.accessCode": { ko: "Access Code", en: "Access Code", zh: "访问代码" },
  "dash.generateQuiz": { ko: "🎯 AI 퀴즈 자동 생성", en: "🎯 AI Auto Quiz", zh: "🎯 AI 自动测验" },
  "dash.generating": { ko: "생성 중...", en: "Generating...", zh: "生成中..." },
  // History
  "history.title": { ko: "Session Archive", en: "Session Archive", zh: "课程存档" },
  "history.professor": { ko: "Professor Protocol", en: "Professor Protocol", zh: "教授协议" },
  "history.student": { ko: "Student Protocol", en: "Student Protocol", zh: "学生协议" },
  "history.empty.professor": { ko: "아직 생성된 수업이 없습니다.", en: "No sessions created yet.", zh: "尚未创建课程。" },
  "history.empty.student": { ko: "참여한 수업이 없습니다.", en: "No sessions joined yet.", zh: "尚未参加课程。" },
  "history.create": { ko: "수업 만들기 →", en: "Create Session →", zh: "创建课程 →" },
  "history.join": { ko: "수업 참여하기 →", en: "Join Session →", zh: "加入课程 →" },
  "history.dashboard": { ko: "Dashboard", en: "Dashboard", zh: "仪表板" },
  "history.rejoin": { ko: "Rejoin", en: "Rejoin", zh: "重新加入" },
  "history.report": { ko: "Report", en: "Report", zh: "报告" },
  "history.hide": { ko: "Hide", en: "Hide", zh: "隐藏" },
  // Components
  "comp.materials": { ko: "Lecture Materials", en: "Lecture Materials", zh: "课程材料" },
  "comp.upload": { ko: "+ Upload PDF", en: "+ Upload PDF", zh: "+ 上传PDF" },
  "comp.uploading": { ko: "Uploading...", en: "Uploading...", zh: "上传中..." },
  "comp.noFiles": { ko: "No files uploaded", en: "No files uploaded", zh: "暂无文件" },
  "comp.analyzing": { ko: "AI가 강의자료를 분석하고 있습니다...", en: "AI is analyzing the materials...", zh: "AI正在分析教材..." },
  "comp.summarized": { ko: "✓ 요약됨", en: "✓ Summarized", zh: "✓ 已摘要" },
  "comp.questions": { ko: "Neural Query Queue", en: "Neural Query Queue", zh: "问题队列" },
  "comp.noQueries": { ko: "No queries received", en: "No queries received", zh: "暂无问题" },
  "comp.cluster": { ko: "🤖 Cluster", en: "🤖 Cluster", zh: "🤖 聚类" },
  "comp.clustering": { ko: "분석 중...", en: "Analyzing...", zh: "分析中..." },
  "comp.quiz": { ko: "퀴즈 / 투표", en: "Quiz / Poll", zh: "测验 / 投票" },
  "comp.newQuiz": { ko: "+ 새 퀴즈", en: "+ New Quiz", zh: "+ 新测验" },
  "comp.sendQuiz": { ko: "퀴즈 보내기", en: "Send Quiz", zh: "发送测验" },
  "comp.pending": { ko: "대기 중", en: "Pending", zh: "待处理" },
  "comp.assign": { ko: "출제", en: "Assign", zh: "出题" },
  "comp.endPoll": { ko: "투표 종료", en: "End Poll", zh: "结束投票" },
  "comp.pollEnded": { ko: "종료됨", en: "Ended", zh: "已结束" },
  "comp.quizHint": { ko: "퀴즈를 만들어 학생들의 이해도를 확인해보세요.", en: "Create a quiz to check student understanding.", zh: "创建测验以检查学生理解度。" },
  "comp.signalQueue": { ko: "Signal Queue", en: "Signal Queue", zh: "信号队列" },
  "comp.sendQuestion": { ko: "Send", en: "Send", zh: "发送" },
  "comp.viewSummary": { ko: "📌 AI 핵심 요약 보기", en: "📌 View AI Summary", zh: "📌 查看AI摘要" },
  "comp.closeSummary": { ko: "요약 닫기", en: "Close Summary", zh: "关闭摘要" },
  "comp.summaryWaiting": { ko: "요약 생성 대기 중...", en: "Waiting for summary...", zh: "等待生成摘要..." },
  // Report
  "report.title": { ko: "수업 리포트", en: "Session Report", zh: "课程报告" },
  "report.aiAnalysis": { ko: "🤖 AI 수업 분석", en: "🤖 AI Analysis", zh: "🤖 AI分析" },
  "report.students": { ko: "참여 학생", en: "Students", zh: "参与学生" },
  "report.responses": { ko: "총 응답", en: "Responses", zh: "总响应" },
  "report.confusion": { ko: "혼란도", en: "Confusion", zh: "困惑度" },
  "report.distribution": { ko: "이해도 분포", en: "Distribution", zh: "理解度分布" },
  "report.timeline": { ko: "시간대별 추이", en: "Timeline", zh: "时间趋势" },
  "report.questions": { ko: "학생 질문", en: "Student Questions", zh: "学生问题" },
  // Settings menu
  "menu.darkMode": { ko: "다크모드", en: "Dark Mode", zh: "深色模式" },
  "menu.lightMode": { ko: "라이트모드", en: "Light Mode", zh: "浅色模式" },
  "menu.language": { ko: "언어", en: "Language", zh: "语言" },
};

export function t(key: string, locale: Locale): string {
  return translations[key]?.[locale] ?? translations[key]?.ko ?? key;
}
