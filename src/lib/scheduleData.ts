import { SchedulePeriod, CourseEntry, CurrentClassStatus } from '../types';
import { loadWithIntegrity, saveWithIntegrity } from './integrity';
import { logAuditEvent } from './auditLogger';

export const SCHEDULE_HEADER_INFO = {
  school: '陸軍軍官學校',
  title: '正98期第2學年第1學期第1週課表',
  classUnit: '正98期第1教授班(資訊)',
  advisor: '周韻寰',
  officeHours: '星期二第 5、6 節',
  advisorLocation: '資訊系館教師研究室',
  note: '指揮官運用時間以隊職官與隊部當日命令為準；裝備保養與體能活動注意安全防護。',
};

export const SCHEDULE_PERIODS: SchedulePeriod[] = [
  {
    period: 1,
    name: '(一)',
    startTime: '08:00',
    endTime: '08:50',
    startMinutes: 8 * 60, // 480
    endMinutes: 8 * 60 + 50, // 530
  },
  {
    period: 2,
    name: '(二)',
    startTime: '09:00',
    endTime: '09:50',
    startMinutes: 9 * 60, // 540
    endMinutes: 9 * 60 + 50, // 590
  },
  {
    period: 3,
    name: '(三)',
    startTime: '10:10',
    endTime: '11:00',
    startMinutes: 10 * 60 + 10, // 610
    endMinutes: 11 * 60, // 660
  },
  {
    period: 4,
    name: '(四)',
    startTime: '11:10',
    endTime: '12:00',
    startMinutes: 11 * 60 + 10, // 670
    endMinutes: 12 * 60, // 720
  },
  {
    period: 5,
    name: '(五)',
    startTime: '14:00',
    endTime: '14:50',
    startMinutes: 14 * 60, // 840
    endMinutes: 14 * 60 + 50, // 890
  },
  {
    period: 6,
    name: '(六)',
    startTime: '15:00',
    endTime: '15:50',
    startMinutes: 15 * 60, // 900
    endMinutes: 15 * 60 + 50, // 950
  },
  {
    period: 7,
    name: '(七)',
    startTime: '16:00',
    endTime: '16:50',
    startMinutes: 16 * 60, // 960
    endMinutes: 16 * 60 + 50, // 1010
  },
  {
    period: 8,
    name: '(八)',
    startTime: '17:00',
    endTime: '17:50',
    startMinutes: 17 * 60, // 1020
    endMinutes: 17 * 60 + 50, // 1070
  },
  {
    period: 9,
    name: '(九)',
    startTime: '19:00',
    endTime: '19:50',
    startMinutes: 19 * 60, // 1140
    endMinutes: 19 * 60 + 50, // 1190
  },
  {
    period: 10,
    name: '(十)',
    startTime: '20:00',
    endTime: '20:50',
    startMinutes: 20 * 60, // 1200
    endMinutes: 20 * 60 + 50, // 1250
  },
  {
    period: 11,
    name: '(十一)',
    startTime: '21:00',
    endTime: '21:50',
    startMinutes: 21 * 60, // 1260
    endMinutes: 21 * 60 + 50, // 1310
  },
];

export const DEFAULT_COURSES: CourseEntry[] = [
  // 星期一 (Day 1)
  {
    id: 'c-1-1',
    dayOfWeek: 1,
    period: 1,
    courseName: '(必)數位電路設計',
    teacher: '吳順裕',
    classroom: '資訊系302教室',
    category: '專業必修',
    color: '#3B82F6',
  },
  {
    id: 'c-1-2',
    dayOfWeek: 1,
    period: 2,
    courseName: '(必)數位電路設計',
    teacher: '吳順裕',
    classroom: '資訊系302教室',
    category: '專業必修',
    color: '#3B82F6',
  },
  {
    id: 'c-1-3',
    dayOfWeek: 1,
    period: 3,
    courseName: '(必)數位電路設計',
    teacher: '吳順裕',
    classroom: '資訊系302教室',
    category: '專業必修',
    color: '#3B82F6',
  },
  {
    id: 'c-1-4',
    dayOfWeek: 1,
    period: 4,
    courseName: '(必)資訊安全導論',
    teacher: '黃怡文',
    classroom: '資訊系306教室',
    category: '專業必修',
    color: '#06B6D4',
  },
  {
    id: 'c-1-5',
    dayOfWeek: 1,
    period: 5,
    courseName: '(必)計算機程式',
    teacher: '李政勳',
    classroom: '資訊系301教室',
    category: '專業必修',
    color: '#8B5CF6',
  },
  {
    id: 'c-1-6',
    dayOfWeek: 1,
    period: 6,
    courseName: '(必)計算機程式',
    teacher: '李政勳',
    classroom: '資訊系301教室',
    category: '專業必修',
    color: '#8B5CF6',
  },
  {
    id: 'c-1-7',
    dayOfWeek: 1,
    period: 7,
    courseName: '體能活動',
    teacher: '隊職官',
    classroom: '操場',
    category: '軍事體能',
    color: '#10B981',
  },
  {
    id: 'c-1-8',
    dayOfWeek: 1,
    period: 8,
    courseName: '體能活動',
    teacher: '隊職官',
    classroom: '操場',
    category: '軍事體能',
    color: '#10B981',
  },
  {
    id: 'c-1-9',
    dayOfWeek: 1,
    period: 9,
    courseName: '(指揮官運用時間)',
    teacher: '隊職官',
    classroom: '隊部/自習教室',
    category: '部隊運用',
    color: '#64748B',
  },
  {
    id: 'c-1-10',
    dayOfWeek: 1,
    period: 10,
    courseName: '(指揮官運用時間)',
    teacher: '隊職官',
    classroom: '隊部/自習教室',
    category: '部隊運用',
    color: '#64748B',
  },
  {
    id: 'c-1-11',
    dayOfWeek: 1,
    period: 11,
    courseName: '(指揮官運用時間)',
    teacher: '隊職官',
    classroom: '隊部/自習教室',
    category: '部隊運用',
    color: '#64748B',
  },

  // 星期二 (Day 2)
  {
    id: 'c-2-1',
    dayOfWeek: 2,
    period: 1,
    courseName: '(必)英文(三)',
    teacher: '林芳美',
    classroom: '語言教室3',
    category: '共同必修',
    color: '#EC4899',
  },
  {
    id: 'c-2-2',
    dayOfWeek: 2,
    period: 2,
    courseName: '(必)英文(三)',
    teacher: '林芳美',
    classroom: '語言教室3',
    category: '共同必修',
    color: '#EC4899',
  },
  {
    id: 'c-2-3',
    dayOfWeek: 2,
    period: 3,
    courseName: '(必)資訊安全導論',
    teacher: '黃怡文',
    classroom: '資訊系306教室',
    category: '專業必修',
    color: '#06B6D4',
  },
  {
    id: 'c-2-4',
    dayOfWeek: 2,
    period: 4,
    courseName: '(必)資訊安全導論',
    teacher: '黃怡文',
    classroom: '資訊系306教室',
    category: '專業必修',
    color: '#06B6D4',
  },
  {
    id: 'c-2-5',
    dayOfWeek: 2,
    period: 5,
    courseName: '(必)計算機網路',
    teacher: '陳立偉',
    classroom: '資訊系306教室',
    category: '專業必修',
    color: '#3B82F6',
    note: '導師周韻寰 officehour (第5,6節)',
  },
  {
    id: 'c-2-6',
    dayOfWeek: 2,
    period: 6,
    courseName: '(必)計算機網路',
    teacher: '陳立偉',
    classroom: '資訊系306教室',
    category: '專業必修',
    color: '#3B82F6',
    note: '導師周韻寰 officehour (第5,6節)',
  },
  {
    id: 'c-2-7',
    dayOfWeek: 2,
    period: 7,
    courseName: '(必)計算機網路',
    teacher: '陳立偉',
    classroom: '資訊系306教室',
    category: '專業必修',
    color: '#3B82F6',
  },
  {
    id: 'c-2-8',
    dayOfWeek: 2,
    period: 8,
    courseName: '(必)計算機程式',
    teacher: '李政勳',
    classroom: '資訊系301教室',
    category: '專業必修',
    color: '#8B5CF6',
  },
  {
    id: 'c-2-9',
    dayOfWeek: 2,
    period: 9,
    courseName: '(指揮官運用時間)',
    teacher: '隊職官',
    classroom: '隊部/自習教室',
    category: '部隊運用',
    color: '#64748B',
  },
  {
    id: 'c-2-10',
    dayOfWeek: 2,
    period: 10,
    courseName: '(指揮官運用時間)',
    teacher: '隊職官',
    classroom: '隊部/自習教室',
    category: '部隊運用',
    color: '#64748B',
  },
  {
    id: 'c-2-11',
    dayOfWeek: 2,
    period: 11,
    courseName: '(指揮官運用時間)',
    teacher: '隊職官',
    classroom: '隊部/自習教室',
    category: '部隊運用',
    color: '#64748B',
  },

  // 星期三 (Day 3)
  {
    id: 'c-3-1',
    dayOfWeek: 3,
    period: 1,
    courseName: '(必)中華民國憲法與立國精神',
    teacher: '吳俊毅',
    classroom: '120教室',
    category: '共同必修',
    color: '#F59E0B',
  },
  {
    id: 'c-3-2',
    dayOfWeek: 3,
    period: 2,
    courseName: '(必)中華民國憲法與立國精神',
    teacher: '吳俊毅',
    classroom: '120教室',
    category: '共同必修',
    color: '#F59E0B',
  },
  {
    id: 'c-3-3',
    dayOfWeek: 3,
    period: 3,
    courseName: '(必)中華民國憲法與立國精神',
    teacher: '吳俊毅',
    classroom: '120教室',
    category: '共同必修',
    color: '#F59E0B',
  },
  {
    id: 'c-3-4',
    dayOfWeek: 3,
    period: 4,
    courseName: '自習(校長運用時間)',
    teacher: '學校',
    classroom: '自習教室',
    category: '自習時間',
    color: '#94A3B8',
  },
  {
    id: 'c-3-5',
    dayOfWeek: 3,
    period: 5,
    courseName: '通識選修(如通識課表)',
    teacher: '通識教師',
    classroom: '通識教室',
    category: '通識選修',
    color: '#10B981',
  },
  {
    id: 'c-3-6',
    dayOfWeek: 3,
    period: 6,
    courseName: '通識選修(如通識課表)',
    teacher: '通識教師',
    classroom: '通識教室',
    category: '通識選修',
    color: '#10B981',
  },
  {
    id: 'c-3-7',
    dayOfWeek: 3,
    period: 7,
    courseName: '體能活動',
    teacher: '隊職官',
    classroom: '操場',
    category: '軍事體能',
    color: '#10B981',
  },
  {
    id: 'c-3-8',
    dayOfWeek: 3,
    period: 8,
    courseName: '體能活動',
    teacher: '隊職官',
    classroom: '操場',
    category: '軍事體能',
    color: '#10B981',
  },
  {
    id: 'c-3-9',
    dayOfWeek: 3,
    period: 9,
    courseName: '(指揮官運用時間)',
    teacher: '隊職官',
    classroom: '隊部/自習教室',
    category: '部隊運用',
    color: '#64748B',
  },
  {
    id: 'c-3-10',
    dayOfWeek: 3,
    period: 10,
    courseName: '(指揮官運用時間)',
    teacher: '隊職官',
    classroom: '隊部/自習教室',
    category: '部隊運用',
    color: '#64748B',
  },
  {
    id: 'c-3-11',
    dayOfWeek: 3,
    period: 11,
    courseName: '(指揮官運用時間)',
    teacher: '隊職官',
    classroom: '隊部/自習教室',
    category: '部隊運用',
    color: '#64748B',
  },

  // 星期四 (Day 4)
  {
    id: 'c-4-1',
    dayOfWeek: 4,
    period: 1,
    courseName: '(必)車輛原理',
    teacher: '廖士淳',
    classroom: '機械系車輛館1',
    category: '專業必修',
    color: '#EA580C',
  },
  {
    id: 'c-4-2',
    dayOfWeek: 4,
    period: 2,
    courseName: '(必)車輛原理',
    teacher: '廖士淳',
    classroom: '機械系車輛館1',
    category: '專業必修',
    color: '#EA580C',
  },
  {
    id: 'c-4-3',
    dayOfWeek: 4,
    period: 3,
    courseName: '自習(校長運用時間)',
    teacher: '學校',
    classroom: '自習教室',
    category: '自習時間',
    color: '#94A3B8',
  },
  {
    id: 'c-4-4',
    dayOfWeek: 4,
    period: 4,
    courseName: '自習(校長運用時間)',
    teacher: '學校',
    classroom: '自習教室',
    category: '自習時間',
    color: '#94A3B8',
  },
  {
    id: 'c-4-5',
    dayOfWeek: 4,
    period: 5,
    courseName: '基本教練',
    teacher: '隊職官',
    classroom: '操場',
    category: '軍事訓練',
    color: '#0D9488',
  },
  {
    id: 'c-4-6',
    dayOfWeek: 4,
    period: 6,
    courseName: '基本教練',
    teacher: '隊職官',
    classroom: '操場',
    category: '軍事訓練',
    color: '#0D9488',
  },
  {
    id: 'c-4-7',
    dayOfWeek: 4,
    period: 7,
    courseName: '基本教練',
    teacher: '隊職官',
    classroom: '操場',
    category: '軍事訓練',
    color: '#0D9488',
  },
  {
    id: 'c-4-8',
    dayOfWeek: 4,
    period: 8,
    courseName: '裝備保養',
    teacher: '隊職官',
    classroom: '操場/裝備庫',
    category: '部隊實務',
    color: '#475569',
  },
  {
    id: 'c-4-9',
    dayOfWeek: 4,
    period: 9,
    courseName: '(指揮官運用時間)',
    teacher: '隊職官',
    classroom: '隊部/自習教室',
    category: '部隊運用',
    color: '#64748B',
  },
  {
    id: 'c-4-10',
    dayOfWeek: 4,
    period: 10,
    courseName: '(指揮官運用時間)',
    teacher: '隊職官',
    classroom: '隊部/自習教室',
    category: '部隊運用',
    color: '#64748B',
  },
  {
    id: 'c-4-11',
    dayOfWeek: 4,
    period: 11,
    courseName: '(指揮官運用時間)',
    teacher: '隊職官',
    classroom: '隊部/自習教室',
    category: '部隊運用',
    color: '#64748B',
  },

  // 星期五 (Day 5)
  {
    id: 'c-5-1',
    dayOfWeek: 5,
    period: 1,
    courseName: '(必)軍事倫理學',
    teacher: '李永義',
    classroom: '101教室',
    category: '共同必修',
    color: '#6366F1',
  },
  {
    id: 'c-5-2',
    dayOfWeek: 5,
    period: 2,
    courseName: '(必)軍事倫理學',
    teacher: '李永義',
    classroom: '101教室',
    category: '共同必修',
    color: '#6366F1',
  },
  {
    id: 'c-5-3',
    dayOfWeek: 5,
    period: 3,
    courseName: '(必)體育',
    teacher: '許嘉佑',
    classroom: '活動中心-重量訓練室',
    category: '共同必修',
    color: '#10B981',
  },
  {
    id: 'c-5-4',
    dayOfWeek: 5,
    period: 4,
    courseName: '(必)體育',
    teacher: '許嘉佑',
    classroom: '活動中心-重量訓練室',
    category: '共同必修',
    color: '#10B981',
  },
  {
    id: 'c-5-5',
    dayOfWeek: 5,
    period: 5,
    courseName: '社團活動',
    teacher: '學務處',
    classroom: '場地自定',
    category: '社團活動',
    color: '#F43F5E',
  },
  {
    id: 'c-5-6',
    dayOfWeek: 5,
    period: 6,
    courseName: '社團活動',
    teacher: '學務處',
    classroom: '場地自定',
    category: '社團活動',
    color: '#F43F5E',
  },
  {
    id: 'c-5-7',
    dayOfWeek: 5,
    period: 7,
    courseName: '體能活動',
    teacher: '隊職官',
    classroom: '操場',
    category: '軍事體能',
    color: '#10B981',
  },
  {
    id: 'c-5-8',
    dayOfWeek: 5,
    period: 8,
    courseName: '體能活動',
    teacher: '隊職官',
    classroom: '操場',
    category: '軍事體能',
    color: '#10B981',
  },
  {
    id: 'c-5-9',
    dayOfWeek: 5,
    period: 9,
    courseName: '(指揮官運用時間)',
    teacher: '隊職官',
    classroom: '隊部/自習教室',
    category: '部隊運用',
    color: '#64748B',
  },
  {
    id: 'c-5-10',
    dayOfWeek: 5,
    period: 10,
    courseName: '(指揮官運用時間)',
    teacher: '隊職官',
    classroom: '隊部/自習教室',
    category: '部隊運用',
    color: '#64748B',
  },
  {
    id: 'c-5-11',
    dayOfWeek: 5,
    period: 11,
    courseName: '(指揮官運用時間)',
    teacher: '隊職官',
    classroom: '隊部/自習教室',
    category: '部隊運用',
    color: '#64748B',
  },
];

const SCHEDULE_STORAGE_KEY = 'hw_tracker_schedule_courses_v1';

export function loadStoredSchedule(): CourseEntry[] {
  return loadWithIntegrity<CourseEntry[]>(
    SCHEDULE_STORAGE_KEY,
    DEFAULT_COURSES,
    (details) => {
      logAuditEvent({
        category: 'security',
        action: '完整性自動修復',
        level: 'security',
        actor: { username: 'System', displayName: '安全保護引擎', role: 'admin' },
        target: SCHEDULE_STORAGE_KEY,
        details,
      });
    }
  );
}

export function saveStoredSchedule(courses: CourseEntry[]): void {
  saveWithIntegrity(SCHEDULE_STORAGE_KEY, courses);
}

export function resetStoredSchedule(): CourseEntry[] {
  saveWithIntegrity(SCHEDULE_STORAGE_KEY, DEFAULT_COURSES);
  return DEFAULT_COURSES;
}

/**
 * Calculates current and next class based on day and time.
 * If simulatedDay and simulatedMinutes are provided, simulates that time.
 */
export function getCurrentClassStatus(
  courses: CourseEntry[],
  simulatedDay?: number,
  simulatedMinutes?: number
): CurrentClassStatus {
  const isSimulation = simulatedDay !== undefined && simulatedMinutes !== undefined;

  let dayOfWeek: number;
  let currentMinutes: number;

  if (isSimulation) {
    dayOfWeek = simulatedDay!;
    currentMinutes = simulatedMinutes!;
  } else {
    const now = new Date();
    // JavaScript getDay(): 0 is Sunday, 1 is Monday, ..., 6 is Saturday
    const jsDay = now.getDay();
    dayOfWeek = jsDay === 0 ? 7 : jsDay;
    currentMinutes = now.getHours() * 60 + now.getMinutes();
  }

  const hours = Math.floor(currentMinutes / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (currentMinutes % 60).toString().padStart(2, '0');
  const currentTimeStr = `${hours}:${minutes}`;

  // If weekend (Saturday 6 or Sunday 7)
  if (dayOfWeek === 6 || dayOfWeek === 7) {
    // Next class is Monday period 1
    const mondayFirst = courses.find((c) => c.dayOfWeek === 1 && c.period === 1) || null;
    const period1 = SCHEDULE_PERIODS.find((p) => p.period === 1) || null;

    return {
      state: 'weekend',
      currentClass: null,
      currentPeriod: null,
      nextClass: mondayFirst,
      nextPeriod: period1,
      dayOfWeek,
      isSimulation,
      simulatedTimeStr: currentTimeStr,
    };
  }

  // Find today's courses
  const todayCourses = courses
    .filter((c) => c.dayOfWeek === dayOfWeek)
    .sort((a, b) => a.period - b.period);

  const firstPeriod = SCHEDULE_PERIODS[0];
  const lastPeriod = SCHEDULE_PERIODS[SCHEDULE_PERIODS.length - 1];

  // Before school starts in the morning (before 08:00)
  if (currentMinutes < firstPeriod.startMinutes) {
    const firstClass = todayCourses.find((c) => c.period === 1) || null;
    return {
      state: 'before_school',
      currentClass: null,
      currentPeriod: null,
      nextClass: firstClass,
      nextPeriod: firstPeriod,
      minutesUntilNext: firstPeriod.startMinutes - currentMinutes,
      dayOfWeek,
      isSimulation,
      simulatedTimeStr: currentTimeStr,
    };
  }

  // After school ends at night (after 21:50)
  if (currentMinutes >= lastPeriod.endMinutes) {
    // Find next weekday first class
    const nextDay = dayOfWeek >= 5 ? 1 : dayOfWeek + 1;
    const nextFirst = courses.find((c) => c.dayOfWeek === nextDay && c.period === 1) || null;
    return {
      state: 'after_school',
      currentClass: null,
      currentPeriod: null,
      nextClass: nextFirst,
      nextPeriod: firstPeriod,
      dayOfWeek,
      isSimulation,
      simulatedTimeStr: currentTimeStr,
    };
  }

  // Check if currently inside a period
  for (let i = 0; i < SCHEDULE_PERIODS.length; i++) {
    const p = SCHEDULE_PERIODS[i];
    if (currentMinutes >= p.startMinutes && currentMinutes < p.endMinutes) {
      const currentClass = todayCourses.find((c) => c.period === p.period) || null;
      // Look for next period
      const nextPeriod = i + 1 < SCHEDULE_PERIODS.length ? SCHEDULE_PERIODS[i + 1] : null;
      const nextClass = nextPeriod
        ? todayCourses.find((c) => c.period === nextPeriod.period) || null
        : null;

      return {
        state: 'in_class',
        currentClass,
        currentPeriod: p,
        nextClass,
        nextPeriod,
        remainingMinutesInCurrent: p.endMinutes - currentMinutes,
        minutesUntilNext: nextPeriod ? nextPeriod.startMinutes - currentMinutes : undefined,
        dayOfWeek,
        isSimulation,
        simulatedTimeStr: currentTimeStr,
      };
    }
  }

  // Otherwise, it's a break time between periods or lunch break!
  // Find which period just ended and which one is next
  for (let i = 0; i < SCHEDULE_PERIODS.length - 1; i++) {
    const currP = SCHEDULE_PERIODS[i];
    const nextP = SCHEDULE_PERIODS[i + 1];

    if (currentMinutes >= currP.endMinutes && currentMinutes < nextP.startMinutes) {
      const nextClass = todayCourses.find((c) => c.period === nextP.period) || null;
      return {
        state: 'in_break',
        currentClass: null,
        currentPeriod: null,
        nextClass,
        nextPeriod: nextP,
        minutesUntilNext: nextP.startMinutes - currentMinutes,
        dayOfWeek,
        isSimulation,
        simulatedTimeStr: currentTimeStr,
      };
    }
  }

  return {
    state: 'after_school',
    currentClass: null,
    currentPeriod: null,
    nextClass: null,
    nextPeriod: null,
    dayOfWeek,
    isSimulation,
    simulatedTimeStr: currentTimeStr,
  };
}
