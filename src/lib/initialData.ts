import { Assignment } from '../types';

export function getInitialAssignments(): Assignment[] {
  // Empty assignments list default
  return [];
}

export function getSampleDemoAssignments(): Assignment[] {
  const now = new Date();

  // Helper for offsets
  const createDateStr = (daysOffset: number, hoursOffset: number = 0) => {
    const d = new Date(now.getTime() + (daysOffset * 24 + hoursOffset) * 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return [
    {
      id: 'demo-asg-1',
      title: '(必)計算機程式 - 鏈結串列與記憶體配置上機實作',
      subjectId: 'course-cs-prog',
      description: '使用 C 語言實作單向與雙向鏈結串列，完成動態節點插入、搜尋與記憶體釋放。請上傳至教學平台。',
      deadline: createDateStr(-2, 0), // 2 days ago
      priority: 'high',
      status: 'completed',
      submissionType: 'classroom',
      subtasks: [
        { id: 'st-1-1', title: '撰寫 Node 結構與 malloc', isCompleted: true },
        { id: 'st-1-2', title: '完成 insert 與 delete 函式', isCompleted: true },
        { id: 'st-1-3', title: '測試 Valgrind 無 memory leak', isCompleted: true },
      ],
      estimatedMinutes: 90,
      createdAt: createDateStr(-5, 0),
      updatedAt: createDateStr(-1, 0),
    },
    {
      id: 'demo-asg-2',
      title: '(必)數位電路設計 - Verilog 組合邏輯與加法器模擬',
      subjectId: 'course-cs-digi',
      description: '完成 4-bit 漣波進位加法器與先行進位加法器架構設計，並繳交 Modelsim 模擬波形截圖。',
      deadline: createDateStr(-1, -3), // Overdue yesterday
      priority: 'high',
      status: 'todo',
      submissionType: 'classroom',
      subtasks: [
        { id: 'st-2-1', title: '繪製全加器邏輯電路圖', isCompleted: true },
        { id: 'st-2-2', title: '撰寫 Verilog 原始碼', isCompleted: false },
        { id: 'st-2-3', title: '模擬驗證 Testbench', isCompleted: false },
      ],
      estimatedMinutes: 120,
      createdAt: createDateStr(-4, 0),
      updatedAt: createDateStr(-1, 0),
    },
    {
      id: 'demo-asg-3',
      title: '(必)資訊安全導論 - 密碼學對稱加密 AES 與雜湊分析',
      subjectId: 'course-cs-sec',
      description: '分析 AES-128 CBC 模式運作流程與 SHA-256 完整性校驗原理，並回答課堂問答題目 1-5。',
      deadline: createDateStr(0, 5), // Due Today in 5 hours!
      priority: 'high',
      status: 'in_progress',
      submissionType: 'online',
      subtasks: [
        { id: 'st-3-1', title: '研讀老師上傳之投影片 Chapter 4', isCompleted: true },
        { id: 'st-3-2', title: '撰寫 SHA-256 原理簡述', isCompleted: true },
        { id: 'st-3-3', title: '完成線上問答表單填寫', isCompleted: false },
      ],
      estimatedMinutes: 60,
      createdAt: createDateStr(-2, 0),
      updatedAt: createDateStr(0, 0),
    },
    {
      id: 'demo-asg-4',
      title: '(必)計算機網路 - Wireshark 封包擷取與三次交握觀測',
      subjectId: 'course-cs-net',
      description: '使用 Wireshark 擷取訪問系網頁的 TCP SYN, SYN-ACK, ACK 封包並分析標頭序號與確認號。',
      deadline: createDateStr(2, 0), // In 2 days
      priority: 'medium',
      status: 'todo',
      submissionType: 'paper',
      subtasks: [
        { id: 'st-4-1', title: '安裝與設定 Wireshark 擷取介面', isCompleted: true },
        { id: 'st-4-2', title: '截取 TCP Handshake 封包', isCompleted: false },
      ],
      estimatedMinutes: 80,
      createdAt: createDateStr(-1, 0),
      updatedAt: createDateStr(-1, 0),
    },
    {
      id: 'demo-asg-5',
      title: '(必)英文(三) - Military Technical Briefing 簡報草稿',
      subjectId: 'course-eng-3',
      description: '準備 3 分鐘軍事資訊科技英文簡報大綱，題目自選（AI、資安或無人機通訊）。',
      deadline: createDateStr(4, 0), // In 4 days
      priority: 'medium',
      status: 'in_progress',
      submissionType: 'presentation',
      subtasks: [
        { id: 'st-5-1', title: '選定簡報主題與關鍵單字', isCompleted: true },
        { id: 'st-5-2', title: '製作 4 頁簡報 Slide', isCompleted: false },
      ],
      estimatedMinutes: 60,
      createdAt: createDateStr(-1, 0),
      updatedAt: createDateStr(0, 0),
    },
    {
      id: 'demo-asg-6',
      title: '(必)車輛原理 - 柴油引擎高壓共軌燃油噴射系統報告',
      subjectId: 'course-mech',
      description: '比較傳統柴油泵浦與現代 Common Rail System 之噴油壓力、霧化效率與排放差異。',
      deadline: createDateStr(6, 0), // In 6 days
      priority: 'low',
      status: 'todo',
      submissionType: 'paper',
      subtasks: [],
      estimatedMinutes: 75,
      createdAt: createDateStr(0, 0),
      updatedAt: createDateStr(0, 0),
    },
    {
      id: 'demo-asg-7',
      title: '(必)軍事倫理學 - 戰場武力使用與日內瓦公約研討心得',
      subjectId: 'course-mil-eth',
      description: '閱讀指定教材第三章，撰寫 800 字心得，探討比例原則與無辜平民保護措施。',
      deadline: createDateStr(-3, 0), // Past completed
      priority: 'medium',
      status: 'submitted',
      submissionType: 'paper',
      subtasks: [
        { id: 'st-7-1', title: '閱讀第三章個案', isCompleted: true },
        { id: 'st-7-2', title: '撰寫心得並校稿完畢', isCompleted: true },
      ],
      estimatedMinutes: 90,
      createdAt: createDateStr(-6, 0),
      updatedAt: createDateStr(-3, 0),
    },
    {
      id: 'demo-asg-8',
      title: '(必)中華民國憲法與立國精神 - 國防體制與統帥權釋義',
      subjectId: 'course-law-const',
      description: '整理憲法增修條文與國防法相關法條，探討軍政、軍令與軍備一元化精神。',
      deadline: createDateStr(10, 0), // In 10 days
      priority: 'low',
      status: 'todo',
      submissionType: 'online',
      subtasks: [],
      estimatedMinutes: 50,
      createdAt: createDateStr(0, 0),
      updatedAt: createDateStr(0, 0),
    },
  ];
}
