export type KeyboardRowId = 'number' | 'top' | 'home' | 'bottom' | 'space';

export type FingerId =
  | 'L5' // Ngón út trái
  | 'L4' // Ngón áp út trái
  | 'L3' // Ngón giữa trái
  | 'L2' // Ngón trỏ trái
  | 'L1' // Ngón cái trái
  | 'R1' // Ngón cái phải
  | 'R2' // Ngón trỏ phải
  | 'R3' // Ngón giữa phải
  | 'R4' // Ngón áp út phải
  | 'R5'; // Ngón út phải

export interface KeySpec {
  code: string;
  label: string;
  shiftLabel?: string;
  row: KeyboardRowId;
  finger: FingerId;
  isBump?: boolean;
  widthUnits?: number;
}

export const FINGER_INFO: Record<FingerId, { label: string; hand: 'left' | 'right'; colorHex: string; bgClass: string }> = {
  L5: { label: 'Ngón út trái', hand: 'left', colorHex: '#059669', bgClass: 'bg-emerald-500' },
  L4: { label: 'Ngón áp út trái', hand: 'left', colorHex: '#D97706', bgClass: 'bg-amber-500' },
  L3: { label: 'Ngón giữa trái', hand: 'left', colorHex: '#E11D48', bgClass: 'bg-rose-500' },
  L2: { label: 'Ngón trỏ trái', hand: 'left', colorHex: '#EA580C', bgClass: 'bg-orange-500' },
  L1: { label: 'Ngón cái trái', hand: 'left', colorHex: '#64748B', bgClass: 'bg-slate-500' },
  R1: { label: 'Ngón cái phải', hand: 'right', colorHex: '#64748B', bgClass: 'bg-slate-500' },
  R2: { label: 'Ngón trỏ phải', hand: 'right', colorHex: '#0284C7', bgClass: 'bg-sky-600' },
  R3: { label: 'Ngón giữa phải', hand: 'right', colorHex: '#7C3AED', bgClass: 'bg-violet-600' },
  R4: { label: 'Ngón áp út phải', hand: 'right', colorHex: '#DB2777', bgClass: 'bg-pink-600' },
  R5: { label: 'Ngón út phải', hand: 'right', colorHex: '#0D9488', bgClass: 'bg-teal-600' },
};

export const KEYBOARD_ROWS: { id: KeyboardRowId; name: string; keys: KeySpec[] }[] = [
  {
    id: 'number',
    name: 'Hàng phím số',
    keys: [
      { code: '`', label: '`', row: 'number', finger: 'L5' },
      { code: '1', label: '1', row: 'number', finger: 'L5' },
      { code: '2', label: '2', row: 'number', finger: 'L4' },
      { code: '3', label: '3', row: 'number', finger: 'L3' },
      { code: '4', label: '4', row: 'number', finger: 'L2' },
      { code: '5', label: '5', row: 'number', finger: 'L2' },
      { code: '6', label: '6', row: 'number', finger: 'R2' },
      { code: '7', label: '7', row: 'number', finger: 'R2' },
      { code: '8', label: '8', row: 'number', finger: 'R3' },
      { code: '9', label: '9', row: 'number', finger: 'R4' },
      { code: '0', label: '0', row: 'number', finger: 'R5' },
      { code: '-', label: '-', row: 'number', finger: 'R5' },
      { code: '=', label: '=', row: 'number', finger: 'R5' },
      { code: 'Backspace', label: 'Backspace', row: 'number', finger: 'R5', widthUnits: 1.8 },
    ],
  },
  {
    id: 'top',
    name: 'Hàng phím trên',
    keys: [
      { code: 'Tab', label: 'Tab', row: 'top', finger: 'L5', widthUnits: 1.4 },
      { code: 'q', label: 'Q', row: 'top', finger: 'L5' },
      { code: 'w', label: 'W', row: 'top', finger: 'L4' },
      { code: 'e', label: 'E', row: 'top', finger: 'L3' },
      { code: 'r', label: 'R', row: 'top', finger: 'L2' },
      { code: 't', label: 'T', row: 'top', finger: 'L2' },
      { code: 'y', label: 'Y', row: 'top', finger: 'R2' },
      { code: 'u', label: 'U', row: 'top', finger: 'R2' },
      { code: 'i', label: 'I', row: 'top', finger: 'R3' },
      { code: 'o', label: 'O', row: 'top', finger: 'R4' },
      { code: 'p', label: 'P', row: 'top', finger: 'R5' },
      { code: '[', label: '[', row: 'top', finger: 'R5' },
      { code: ']', label: ']', row: 'top', finger: 'R5' },
      { code: '\\', label: '\\', row: 'top', finger: 'R5', widthUnits: 1.4 },
    ],
  },
  {
    id: 'home',
    name: 'Hàng phím cơ sở',
    keys: [
      { code: 'CapsLock', label: 'Caps', row: 'home', finger: 'L5', widthUnits: 1.7 },
      { code: 'a', label: 'A', row: 'home', finger: 'L5' },
      { code: 's', label: 'S', row: 'home', finger: 'L4' },
      { code: 'd', label: 'D', row: 'home', finger: 'L3' },
      { code: 'f', label: 'F', row: 'home', finger: 'L2', isBump: true },
      { code: 'g', label: 'G', row: 'home', finger: 'L2' },
      { code: 'h', label: 'H', row: 'home', finger: 'R2' },
      { code: 'j', label: 'J', row: 'home', finger: 'R2', isBump: true },
      { code: 'k', label: 'K', row: 'home', finger: 'R3' },
      { code: 'l', label: 'L', row: 'home', finger: 'R4' },
      { code: ';', label: ';', row: 'home', finger: 'R5' },
      { code: "'", label: "'", row: 'home', finger: 'R5' },
      { code: 'Enter', label: 'Enter', row: 'home', finger: 'R5', widthUnits: 2.0 },
    ],
  },
  {
    id: 'bottom',
    name: 'Hàng phím dưới',
    keys: [
      { code: 'ShiftL', label: 'Shift', row: 'bottom', finger: 'L5', widthUnits: 2.1 },
      { code: 'z', label: 'Z', row: 'bottom', finger: 'L5' },
      { code: 'x', label: 'X', row: 'bottom', finger: 'L4' },
      { code: 'c', label: 'C', row: 'bottom', finger: 'L3' },
      { code: 'v', label: 'V', row: 'bottom', finger: 'L2' },
      { code: 'b', label: 'B', row: 'bottom', finger: 'L2' },
      { code: 'n', label: 'N', row: 'bottom', finger: 'R2' },
      { code: 'm', label: 'M', row: 'bottom', finger: 'R2' },
      { code: ',', label: ',', row: 'bottom', finger: 'R3' },
      { code: '.', label: '.', row: 'bottom', finger: 'R4' },
      { code: '/', label: '/', row: 'bottom', finger: 'R5' },
      { code: 'ShiftR', label: 'Shift', row: 'bottom', finger: 'R5', widthUnits: 2.3 },
    ],
  },
  {
    id: 'space',
    name: 'Hàng phím chứa phím dấu cách',
    keys: [
      { code: 'CtrlL', label: 'Ctrl', row: 'space', finger: 'L5', widthUnits: 1.4 },
      { code: 'AltL', label: 'Alt', row: 'space', finger: 'L1', widthUnits: 1.4 },
      { code: ' ', label: 'Phím cách (Space)', row: 'space', finger: 'R1', widthUnits: 6.2 },
      { code: 'AltR', label: 'Alt', row: 'space', finger: 'R1', widthUnits: 1.4 },
      { code: 'CtrlR', label: 'Ctrl', row: 'space', finger: 'R5', widthUnits: 1.4 },
    ],
  },
];

export const ALL_KEYS_MAP: Map<string, KeySpec> = new Map(
  KEYBOARD_ROWS.flatMap((row) => row.keys.map((k) => [k.code.toLowerCase(), k])),
);

export function getKeySpec(char: string): KeySpec | undefined {
  return ALL_KEYS_MAP.get(char.toLowerCase());
}

export interface TypingDrillSequence {
  id: string;
  title: string;
  description: string;
  target: string;
}

export const L3_B5_DRILLS: TypingDrillSequence[] = [
  {
    id: 'home-row-basic',
    title: '1. Hàng phím cơ sở',
    description: 'Đặt ngón trỏ ở F và J, gõ lần lượt các phím trên hàng cơ sở.',
    target: 'asdf jkl;',
  },
  {
    id: 'home-row-reach',
    title: '2. Mở rộng G và H',
    description: 'Dùng ngón trỏ trái gõ F, G và ngón trỏ phải gõ J, H rồi đưa tay về vị trí xuất phát.',
    target: 'fg hj fghj',
  },
  {
    id: 'top-bottom-mix',
    title: '3. Hàng trên và hàng dưới',
    description: 'Vươn ngón tay gõ các phím ở hàng trên và hàng dưới rồi trở về hàng cơ sở.',
    target: 'er ui cv nm',
  },
];

export function evaluateKeystroke(expectedChar: string, pressedKey: string): {
  matched: boolean;
  feedback: string;
} {
  const exp = expectedChar;
  if (pressedKey === exp || pressedKey.toLowerCase() === exp.toLowerCase()) {
    const spec = getKeySpec(exp);
    const fingerName = spec ? FINGER_INFO[spec.finger].label : 'ngón tay phụ trách';
    return {
      matched: true,
      feedback: `Đúng rồi! Em đã dùng ${fingerName} gõ phím "${exp === ' ' ? 'Space' : exp.toUpperCase()}".`,
    };
  }
  const expectedSpec = getKeySpec(exp);
  const fingerHint = expectedSpec ? FINGER_INFO[expectedSpec.finger].label : 'ngón phù hợp';
  return {
    matched: false,
    feedback: `Em vừa bấm "${pressedKey === ' ' ? 'Space' : pressedKey}". Hãy giữ nguyên và gõ phím "${exp === ' ' ? 'Space' : exp.toUpperCase()}" bằng ${fingerHint}.`,
  };
}

export function gradeL3B5Practice(stats: {
  completedSequences: string[];
  accuracy: number;
  selfCheckFingers: boolean;
}): { passed: boolean; feedback: string } {
  const requiredIds = L3_B5_DRILLS.map((d) => d.id);
  const allDone = requiredIds.every((id) => stats.completedSequences.includes(id));
  if (!allDone) {
    return {
      passed: false,
      feedback: 'Em hãy hoàn thành đủ cả 3 dãy gõ (Hàng cơ sở, G/H, Hàng trên & dưới) nhé.',
    };
  }
  if (stats.accuracy < 75) {
    return {
      passed: false,
      feedback: `Độ chính xác hiện tại là ${stats.accuracy}%. Em hãy luyện lại để đạt ít nhất 75% nhé.`,
    };
  }
  if (!stats.selfCheckFingers) {
    return {
      passed: false,
      feedback: 'Hãy đánh dấu xác nhận em đã đặt hai ngón trỏ lên phím có gờ F, J và hai ngón cái ở phím cách.',
    };
  }
  return {
    passed: true,
    feedback: `Tuyệt vời! Em đã hoàn thành bài gõ phím với độ chính xác ${stats.accuracy}%.`,
  };
}
