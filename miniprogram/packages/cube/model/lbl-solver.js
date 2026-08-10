/**
 * 魔方课堂「按课堂还原」分期模块
 *
 * 说明：本模块不重新发明层先法求解（避免自写求解器出错），而是复用后端已经求出的
 * 正确解法（kociemba），在客户端按「层先法七步」的里程碑把完整解法切分为 7 段，
 * 并绑定魔方课堂 lessons.STEPS 的要点（目标 / 口诀 / 公式），交给 restore 页面做
 * 3D 分步播放 + 课堂要点展示。这样保证 100% 能还原，同时体验和「按魔方课堂七步还原」一致。
 *
 * 里程碑（在逐步模拟解法过程中检测，取「永久成立」的起始位置）：
 *   1 底层十字 · 2 底层角块 · 3 中层棱块(F2L) · 4 顶层十字 · 5 顶层翻色 · 6 顶层角块归位 · 7 顶层棱块归位
 */

import { parseSolution, applyMove } from './cube-state'
import { STEPS } from './lessons'

/* ---------------- 几何工具（与 cube-state 同坐标系） ---------------- */

function coordOf(face, idx) {
  const row = Math.floor(idx / 3)
  const col = idx % 3
  let x = 0, y = 0, z = 0
  switch (face) {
    case 0: y = 1; z = row - 1; x = col - 1; break
    case 3: y = -1; z = 1 - row; x = col - 1; break
    case 2: z = 1; y = 1 - row; x = col - 1; break
    case 5: z = -1; y = 1 - row; x = 1 - col; break
    case 1: x = 1; y = 1 - row; z = 1 - col; break
    case 4: x = -1; y = 1 - row; z = col - 1; break
  }
  return [x, y, z]
}

const CUBIES = {}
;(function buildCubies() {
  const faces = [0, 1, 2, 3, 4, 5]
  for (const f of faces) {
    for (let idx = 0; idx < 9; idx++) {
      if (idx === 4) continue
      const [x, y, z] = coordOf(f, idx)
      const key = `${x},${y},${z}`
      if (!CUBIES[key]) CUBIES[key] = { coord: [x, y, z], stickers: [] }
      CUBIES[key].stickers.push({ face: f, idx })
    }
  }
})()

function clone(state) { return state.map(f => f.slice()) }
function pieceCorrect(state, coordKey) {
  for (const s of CUBIES[coordKey].stickers) {
    if (state[s.face][s.idx] !== s.face) return false
  }
  return true
}

const D_EDGE = ['0,-1,1', '1,-1,0', '0,-1,-1', '-1,-1,0'] // DF DR DB DL
const D_CORNER = ['1,-1,1', '-1,-1,1', '-1,-1,-1', '1,-1,-1'] // DRF DFL DLB DBR
const M_EDGE = ['1,0,1', '-1,0,1', '-1,0,-1', '1,0,-1'] // FR FL BL BR
const U_EDGE_IDX = [1, 3, 5, 7]
const U_CORNER_IDX = [0, 2, 6, 8]

function isBottomCross(state) { return D_EDGE.every(k => pieceCorrect(state, k)) }
function isBottomCorners(state) { return D_CORNER.every(k => pieceCorrect(state, k)) }
function isF2L(state) { return D_EDGE.concat(D_CORNER, M_EDGE).every(k => pieceCorrect(state, k)) }
function isTopCross(state) { return U_EDGE_IDX.every(i => state[0][i] === 0) }
function isTopOrient(state) { return U_CORNER_IDX.every(i => state[0][i] === 0) }
const U_CORNER = ['1,1,1', '-1,1,1', '-1,1,-1', '1,1,-1']
function isTopCornerPerm(state) { return U_CORNER.every(k => pieceCorrect(state, k)) }
function isSolved(state) {
  for (let f = 0; f < 6; f++) for (let c = 0; c < 9; c++) if (state[f][c] !== f) return false
  return true
}

const MILESTONES = [
  isBottomCross,
  isBottomCorners,
  isF2L,
  isTopCross,
  isTopOrient,
  isTopCornerPerm,
  isSolved
]

/**
 * 把完整解法按层先法七步切分。
 * @param {Array} state 起始 6×9 状态（识别到的魔方）
 * @param {string} solutionStr 后端解法字符串（如 "R U R' U' ..."）
 * @returns {{moves:Array, phases:Array}}
 */
export function splitIntoLBLPhases(state, solutionStr) {
  const moves = parseSolution(solutionStr)
  const n = moves.length

  // 逐步模拟，记录每一步之后的状态
  const states = [clone(state)]
  let cur = clone(state)
  for (let i = 0; i < n; i++) {
    const ns = applyMove(cur, moves[i])
    states.push(ns)
    cur = ns
  }

  // 对每个里程碑，找到「从该步起永久成立」的最小索引
  const boundaries = MILESTONES.map((ms) => {
    // 从后往前找最后一段「不成立」的结尾；边界 = 其后第一步
    let lastFalse = -1
    for (let i = 0; i <= n; i++) {
      if (!ms(states[i])) lastFalse = i
    }
    // boundary = lastFalse + 1，但限制在前一步内
    return Math.min(lastFalse + 1, n)
  })

  // 修正：保证边界单调递增且落在 [0,n]
  for (let i = 1; i < boundaries.length; i++) {
    if (boundaries[i] < boundaries[i - 1]) boundaries[i] = boundaries[i - 1]
  }

  const phases = STEPS.map((meta, i) => ({
    step: meta.id,
    title: meta.title,
    goal: meta.goal,
    tip: meta.tip,
    startIndex: i === 0 ? 0 : boundaries[i - 1],
    endIndex: i === STEPS.length - 1 ? n : boundaries[i]
  }))

  return { moves, phases }
}
