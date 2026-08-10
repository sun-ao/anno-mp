/**
 * 魔方教学数据（层先法 LBL 七步 + 转法记号说明）
 *
 * 演示自洽性：每课每个 demos 的 formula 都是一段合法转动序列。
 * 页面会先算 start = applyMoves(还原态, 公式的逆序)，
 * 再播放 formula，恰好回到还原态 —— 让学员直观看到“这组公式能把打乱的魔方还原”。
 *
 * 注意：本项目配色坐标系 U=黄 D=白 F=红 B=橙 L=蓝 R=绿（见 cube-state FACE_DEFS）。
 * 教学里统一用标准记号（白底黄顶）描述，不绑定具体颜色，避免混淆。
 */

import { createSolvedState, applyMoves, parseSolution } from './cube-state'

/** 单个转动的逆转动 */
export function invertMove(move) {
  return { face: move.face, turn: move.turn === 2 ? 2 : -move.turn }
}

/** 整段解法的逆序（用于构造演示起始态） */
export function invertSolution(moves) {
  return moves.slice().reverse().map(invertMove)
}

/**
 * 计算某段公式的“演示起始态”：从还原态应用公式的逆序得到。
 * @param {string} formula 如 "R U R' U'"
 * @returns {Array} 6×9 状态
 */
export function demoStartState(formula) {
  const moves = parseSolution(formula)
  const inv = invertSolution(moves)
  return applyMoves(createSolvedState(), inv)
}

/** 转法记号说明 */
export const NOTATION_INFO = {
  faces: [
    { letter: 'U', name: '上', desc: '顶面（本项目为黄色）' },
    { letter: 'D', name: '下', desc: '底面（本项目为白色）' },
    { letter: 'F', name: '正', desc: '正面（本项目为红色）' },
    { letter: 'B', name: '背', desc: '背面（本项目为橙色）' },
    { letter: 'L', name: '左', desc: '左面（本项目为蓝色）' },
    { letter: 'R', name: '右', desc: '右面（本项目为绿色）' }
  ],
  suffixes: [
    { mark: '', name: '顺时针 90°', desc: '面对该面，向右转四分之一圈' },
    { mark: "'", name: '逆时针 90°', desc: '面对该面，向左转四分之一圈' },
    { mark: '2', name: '转 180°', desc: '转半圈，顺时针逆时针结果一样' }
  ],
  legend: '字母 = 要转的面；加 “\'” = 逆时针；加 “2” = 转 180°。例如 R = 右面顺时针，R\' = 右面逆时针，R2 = 右面转半圈。'
}

/** 层先法七步课程 */
export const STEPS = [
  {
    id: 1,
    title: '第一步 · 底层十字',
    goal: '把底面四条棱（带底色的棱块）转到正确位置，让底面出现一个十字，且十字四边的颜色与各自侧面中心块一致。',
    tip: '先找带底色的棱块，转到顶层，再一层层转下来对准同色中心块。这是最靠“手感”的一步，多练就熟。',
    demos: [
      { formula: "F R U R' U' F'" }
    ]
  },
  {
    id: 2,
    title: '第二步 · 底层角块',
    goal: '底面四个角块全部归位，底层（含底面与一层侧面）完全还原。',
    tip: '右手公式 R U R\' U\'：角块在右下角时用，重复 1~5 次直到到位；角块在左下角时改用左手镜像 U R U\' L\' U R\' U\' L。',
    demos: [
      { formula: "R U R' U'" },
      { formula: "U R U' L' U R' U' L" }
    ]
  },
  {
    id: 3,
    title: '第三步 · 中层棱块',
    goal: '中间一层的四个棱块归位（顶面暂不动）。',
    tip: '棱块在顶层且“前色”朝前 → 用右插公式；棱块“前色”朝右 → 用左插公式。插错位置就先把它转到顶层再重插。',
    demos: [
      { formula: "U' L' U L U F U' F'" },
      { formula: "U R U' R' U' F' U F" }
    ]
  },
  {
    id: 4,
    title: '第四步 · 顶层十字',
    goal: '顶面出现十字（此时只要求形状是十字，不要求翻成全黄）。',
    tip: '公式 F R U R\' U\' F\' 很万能：点 → 折线 → 直角，多来几遍都能变成十字。',
    demos: [
      { formula: "F R U R' U' F'" }
    ]
  },
  {
    id: 5,
    title: '第五步 · 顶层翻色',
    goal: '顶面九个格子全部变成顶色（本项目为黄色）。',
    tip: '“小鱼”公式：小鱼1 = R U R\' U R U2 R\'；小鱼2 = R\' U\' R U\' R\' U2 R。看顶面缺口形状选对应的那条鱼。',
    demos: [
      { formula: "R U R' U R U2 R'" },
      { formula: "R' U' R U' R' U2 R" }
    ]
  },
  {
    id: 6,
    title: '第六步 · 顶层角块归位',
    goal: '顶层四个角块回到正确位置（颜色可能还没翻好，下一步再处理）。',
    tip: '公式 R U R\' U\' R\' F R2 U\' R\' U\' R U R\' F\' 会把三个角块顺时针轮转。把已对好的角块放在左后，重复直到四个角都到位。',
    demos: [
      { formula: "R U R' U' R' F R2 U' R' U' R U R' F'" }
    ]
  },
  {
    id: 7,
    title: '第七步 · 顶层棱块归位',
    goal: '顶层棱块也归位，整个魔方完全还原！🎉',
    tip: '公式 R U\' R U R U R U\' R\' U\' R2 会把三个棱块顺时针轮换。重复 1~2 次即可全部归位。',
    demos: [
      { formula: "R U' R U R U R U' R' U' R2" }
    ]
  }
]

/** 进度存储键 */
export const LEARN_PROGRESS_KEY = 'cube:learnProgress'
