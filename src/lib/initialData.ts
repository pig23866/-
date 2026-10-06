import { Assignment } from '../types';

export function getInitialAssignments(): Assignment[] {
  const now = new Date();

  // Helper to add hours
  const addHours = (hours: number): string => {
    const d = new Date(now.getTime() + hours * 60 * 60 * 1000);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return [
    {
      id: 'asg-1',
      title: '數學微積分：第三章導數與極限綜合練習題',
      subjectId: 'math',
      description: '完成習題本 P.78 - P.84 之偶數題，並於計算紙寫下完整推導過程。需拍攝清晰 PDF 檔繳交。',
      deadline: addHours(4), // Due today in 4 hours
      priority: 'high',
      status: 'in_progress',
      submissionType: 'classroom',
      subtasks: [
        { id: 'st-1-1', title: '完成習題本 P.78 - P.80 基礎練習', isCompleted: true },
        { id: 'st-1-2', title: '完成習題本 P.81 - P.84 進階挑戰題', isCompleted: false },
        { id: 'st-1-3', title: '手機掃描計算過程轉換為 PDF 檔', isCompleted: false },
      ],
      driveAttachments: [
        {
          id: 'drive-calc-pdf',
          name: '微積分_第三章作業手稿草稿.pdf',
          mimeType: 'application/pdf',
          webViewLink: 'https://drive.google.com',
          size: '2.4 MB',
        },
      ],
      estimatedMinutes: 90,
      reminderMinutesBefore: 120,
      notes: '老師特別強調第 18 題需要附上極限存在之嚴謹定義。',
      createdAt: new Date(now.getTime() - 2 * 86400000).toISOString(),
      updatedAt: new Date(now.getTime() - 1 * 86400000).toISOString(),
    },
    {
      id: 'asg-2',
      title: '英文科：TED Talk 演講心得與 3 分鐘影音口說報告',
      subjectId: 'english',
      description: '挑選一部 10 分鐘內之 TED Talk 影片，撰寫 300 字英語短評，並錄製 3 分鐘個人觀點分享。',
      deadline: addHours(26), // Tomorrow
      priority: 'high',
      status: 'todo',
      submissionType: 'online',
      subtasks: [
        { id: 'st-2-1', title: '觀看選定之 TED 演講並紀錄核心論點', isCompleted: true },
        { id: 'st-2-2', title: '撰寫 300 字英文摘要短評', isCompleted: false },
        { id: 'st-2-3', title: '錄音/錄影並上傳至雲端共享資料夾', isCompleted: false },
      ],
      driveAttachments: [
        {
          id: 'drive-ted-doc',
          name: 'TED_Speech_Script_Draft.docx',
          mimeType: 'application/vnd.google-apps.document',
          webViewLink: 'https://docs.google.com',
          size: '156 KB',
        },
      ],
      estimatedMinutes: 120,
      reminderMinutesBefore: 1440,
      notes: '錄音注意咬字發音與語調變化，不可全程照稿念。',
      createdAt: new Date(now.getTime() - 3 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'asg-3',
      title: '資訊科技：React 與 TypeScript 網頁作業統整平台專案',
      subjectId: 'cs',
      description: '設計實作具有即時期限提醒、學科作業分類標籤與雲端硬碟檔案連結功能之作業統整 Web App。',
      deadline: addHours(72), // in 3 days
      priority: 'medium',
      status: 'in_progress',
      submissionType: 'classroom',
      subtasks: [
        { id: 'st-3-1', title: '架設 Vite + React + Tailwind 環境', isCompleted: true },
        { id: 'st-3-2', title: '串接 Google Drive 授權與檔案清單', isCompleted: true },
        { id: 'st-3-3', title: '完成甘特圖/日曆模式與響應式介面優化', isCompleted: false },
      ],
      driveAttachments: [
        {
          id: 'drive-cs-slides',
          name: '網頁專案架構報告投影片.gslide',
          mimeType: 'application/vnd.google-apps.presentation',
          webViewLink: 'https://slides.google.com',
          size: '4.8 MB',
        },
      ],
      estimatedMinutes: 180,
      reminderMinutesBefore: 360,
      notes: '完成後附上 GitHub 倉庫連結與線上展示網址。',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'asg-4',
      title: '自然科學：物理單擺簡諧運動實驗數據分析報告',
      subjectId: 'science',
      description: '分析上週實驗室測量之擺長與週期數據，使用試算表繪製 T²-L 關係圖，計算重力加速度 g 值與誤差百分比。',
      deadline: addHours(-12), // Overdue by 12 hours
      priority: 'high',
      status: 'in_progress',
      submissionType: 'paper',
      subtasks: [
        { id: 'st-4-1', title: '整理十組擺長數據輸入試算表', isCompleted: true },
        { id: 'st-4-2', title: '製作散佈圖與最小平方法趨勢線', isCompleted: true },
        { id: 'st-4-3', title: '撰寫實驗誤差來源探討並印出紙本', isCompleted: false },
      ],
      driveAttachments: [
        {
          id: 'drive-pendulum-sheet',
          name: '物理實驗數據統計表.gsheet',
          mimeType: 'application/vnd.google-apps.spreadsheet',
          webViewLink: 'https://sheets.google.com',
          size: '312 KB',
        },
      ],
      estimatedMinutes: 60,
      notes: '盡速補交！下課後直接送至物理科辦公室李老師桌上。',
      createdAt: new Date(now.getTime() - 4 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'asg-5',
      title: '國語文：古典詩詞現代改寫創作短文',
      subjectId: 'chinese',
      description: '自選一首唐詩或宋詞，發揮想像力將意境轉化為 800 字現代抒情散文或短篇故事。',
      deadline: addHours(120), // in 5 days
      priority: 'low',
      status: 'todo',
      submissionType: 'online',
      subtasks: [
        { id: 'st-5-1', title: '閱讀蘇軾《水調歌頭》與李商隱《錦瑟》比較', isCompleted: false },
        { id: 'st-5-2', title: '擬定故事大綱與人物心境', isCompleted: false },
      ],
      driveAttachments: [],
      estimatedMinutes: 75,
      notes: '字數 600 - 1000 字之間，格式 A4 標楷體 12 號字。',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'asg-6',
      title: '社會科：台灣戰後經濟發展歷史專題剪輯',
      subjectId: 'social',
      description: '分組製作 5 分鐘歷史短片或海報簡報，說明十大建設與加工出口區對產業轉型之深遠影響。',
      deadline: addHours(160), // next week
      priority: 'medium',
      status: 'submitted',
      submissionType: 'presentation',
      subtasks: [
        { id: 'st-6-1', title: '小組收集歷史剪報與影音資料', isCompleted: true },
        { id: 'st-6-2', title: '完成 PPT 簡報製作與講稿分配', isCompleted: true },
        { id: 'st-6-3', title: '於指定課堂前上傳簡報檔', isCompleted: true },
      ],
      driveAttachments: [
        {
          id: 'drive-social-report',
          name: '社會專案_歷史影像展示.pdf',
          mimeType: 'application/pdf',
          webViewLink: 'https://drive.google.com',
          size: '6.2 MB',
        },
      ],
      estimatedMinutes: 150,
      notes: '小組組長已於週二正式提交。',
      createdAt: new Date(now.getTime() - 6 * 86400000).toISOString(),
      updatedAt: new Date(now.getTime() - 1 * 86400000).toISOString(),
    },
  ];
}
