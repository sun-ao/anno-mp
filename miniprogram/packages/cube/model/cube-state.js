/**
 * 魔方状态模型
 *
 * 状态表示：6 个面 × 9 个格子，每个格子存"该位置贴纸属于哪个面"的面序号（0-5）。
 * 面序号顺序与 kociemba 的 URFDLB 一致，中心块（索引 4）固定，即配色坐标系：
 *   U(0)=黄  R(1)=绿  F(2)=红  D(3)=白  L(4)=蓝  B(5)=橙
 */

export const FACE_ORDER = ['U', 'R', 'F', 'D', 'L', 'B']

export const FACE_DEFS = [
  { id: 0, letter: 'U', name: '上', colorName: 'yellow', hex: '#FFD500', textOn: '#5c4d00' },
  { id: 1, letter: 'R', name: '右', colorName: 'green',  hex: '#009B48', textOn: '#ffffff' },
  { id: 2, letter: 'F', name: '正', colorName: 'red',    hex: '#C41E3A', textOn: '#ffffff' },
  { id: 3, letter: 'D', name: '下', colorName: 'white',  hex: '#FFFFFF', textOn: '#666666' },
  { id: 4, letter: 'L', name: '左', colorName: 'blue',   hex: '#0051BA', textOn: '#ffffff' },
  { id: 5, letter: 'B', name: '背', colorName: 'orange', hex: '#FF5800', textOn: '#ffffff' }
]

export const CENTER_INDEX = 4

/** 跨页面传递求解结果的本地缓存键 */
export const SOLVE_PAYLOAD_KEY = 'cube:solvePayload'

/** 生成还原态（每面纯色） */
export function createSolvedState() {
  return FACE_DEFS.map(face => new Array(9).fill(face.id))
}

/** 生成空白态（全部置为 -1，供拍照逐面填充） */
export function createEmptyState() {
  return FACE_DEFS.map(() => new Array(9).fill(-1))
}

export function cloneState(state) {
  return state.map(face => face.slice())
}

/**
 * 校验状态：中心块固定、无空格、每色恰好 9 个
 * 返回 { ok, counts, emptyCells, errors }
 */
export function validateState(state) {
  const counts = new Array(6).fill(0)
  let emptyCells = 0
  const errors = []

  for (let f = 0; f < 6; f++) {
    for (let c = 0; c < 9; c++) {
      const v = state[f][c]
      if (v < 0 || v > 5) {
        emptyCells++
      } else {
        counts[v]++
      }
    }
  }

  const colorText = (faceId) => ['黄', '绿', '红', '白', '蓝', '橙'][faceId]

  for (let f = 0; f < 6; f++) {
    if (state[f][CENTER_INDEX] !== f) {
      errors.push(`${FACE_DEFS[f].name}面中心块必须是${colorText(f)}色`)
    }
  }

  if (emptyCells > 0) {
    errors.push(`还有 ${emptyCells} 个格子未填色`)
  }

  for (let f = 0; f < 6; f++) {
    if (counts[f] !== 9) {
      errors.push(`${colorText(f)}色应有 9 个，当前 ${counts[f]} 个`)
    }
  }

  return { ok: errors.length === 0, counts, emptyCells, errors }
}

/** 转为聚合接口入参：六面 9 色名（yellow/green/red/white/blue/orange） */
export function stateToColorNames(state) {
  const faces = {}
  FACE_DEFS.forEach((face, f) => {
    faces[face.letter] = state[f].map(v => (v >= 0 ? FACE_DEFS[v].colorName : 'unknown'))
  })
  return faces
}

/** 转为 kociemba 54 字符状态串（URFDLB 顺序） */
export function stateToKociemba(state) {
  let s = ''
  for (let f = 0; f < 6; f++) {
    for (let c = 0; c < 9; c++) {
      const v = state[f][c]
      s += v >= 0 ? FACE_DEFS[v].letter : '?'
    }
  }
  return s
}

/**
 * cubie 坐标 (x,y,z ∈ {-1,0,1}) → 指定面上 9 宫格贴纸索引。
 * 索引规则与 kociemba 一致：面对该面、U 朝上（U 面背排在上、D 面前排在上）行优先。
 */
export function stickerIndex(face, x, y, z) {
  switch (face) {
    case 'U': return (z + 1) * 3 + (x + 1)
    case 'D': return (1 - z) * 3 + (x + 1)
    case 'F': return (1 - y) * 3 + (x + 1)
    case 'B': return (1 - y) * 3 + (1 - x)
    case 'R': return (1 - y) * 3 + (1 - z)
    case 'L': return (1 - y) * 3 + (z + 1)
  }
}

const MOVE_FACE_TEXT = {
  R: '右面', L: '左面', U: '上面', D: '下面', F: '正面', B: '背面'
}

/** 解析单个转动记号 */
export function parseMove(move) {
  const m = move.trim().match(/^([RLUDFB])(['2]?)$/)
  if (!m) return null
  const face = m[1]
  const suffix = m[2]
  const turn = suffix === "'" ? -1 : suffix === '2' ? 2 : 1
  const dirText = turn === 2 ? '旋转 180°' : turn === 1 ? '顺时针 90°' : '逆时针 90°'
  return {
    move: m[1] + suffix,
    face,
    turn,
    text: `${MOVE_FACE_TEXT[m[1]]}${dirText}`
  }
}

/** 解析整段解法（如 "R U R' U' D2"） */
export function parseSolution(solution) {
  return solution
    .trim()
    .split(/\s+/)
    .map(parseMove)
    .filter(s => s !== null)
}

/* ---------------- 转动模拟（用于 3D 逐步还原） ---------------- */

function normalToFace(nx, ny, nz) {
  if (ny === 1) return 'U'
  if (ny === -1) return 'D'
  if (nz === 1) return 'F'
  if (nz === -1) return 'B'
  if (nx === 1) return 'R'
  return 'L'
}

let STICKERS = null

/** 54 张贴纸 → (cubie 坐标, 法向量) 反查表，与 stickerIndex 互为逆映射 */
function getStickers() {
  if (STICKERS) return STICKERS
  const list = []
  const push = (face, idx, x, y, z, nx, ny, nz) =>
    list.push({ face, idx, x, y, z, nx, ny, nz })
  const faces = ['U', 'R', 'F', 'D', 'L', 'B']
  for (const face of faces) {
    for (let idx = 0; idx < 9; idx++) {
      const row = Math.floor(idx / 3)
      const col = idx % 3
      switch (face) {
        case 'U': push(face, idx, col - 1, 1, row - 1, 0, 1, 0); break
        case 'D': push(face, idx, col - 1, -1, 1 - row, 0, -1, 0); break
        case 'F': push(face, idx, col - 1, 1 - row, 1, 0, 0, 1); break
        case 'B': push(face, idx, 1 - col, 1 - row, -1, 0, 0, -1); break
        case 'R': push(face, idx, 1, 1 - row, 1 - col, 1, 0, 0); break
        case 'L': push(face, idx, -1, 1 - row, col - 1, -1, 0, 0); break
      }
    }
  }
  STICKERS = list
  return list
}

/** 各面顺时针（面对该面观察）的层判定与坐标旋转 */
const CW_DEF = {
  F: { axis: 'z', sign: 1,  rotate: (x, y, z) => [y, -x, z] },
  B: { axis: 'z', sign: -1, rotate: (x, y, z) => [-y, x, z] },
  U: { axis: 'y', sign: 1,  rotate: (x, y, z) => [-z, y, x] },
  D: { axis: 'y', sign: -1, rotate: (x, y, z) => [z, y, -x] },
  R: { axis: 'x', sign: 1,  rotate: (x, y, z) => [x, z, -y] },
  L: { axis: 'x', sign: -1, rotate: (x, y, z) => [x, -z, y] }
}

/** 单层顺时针转动一次（面对该面观察），返回新状态 */
export function applyMoveCW(state, face) {
  const def = CW_DEF[face]
  const next = cloneState(state)
  for (const s of getStickers()) {
    const coord = def.axis === 'x' ? s.x : def.axis === 'y' ? s.y : s.z
    if (coord !== def.sign) continue
    const [x, y, z] = def.rotate(s.x, s.y, s.z)
    const [nx, ny, nz] = def.rotate(s.nx, s.ny, s.nz)
    const targetFace = normalToFace(nx, ny, nz)
    const targetIdx = stickerIndex(targetFace, x, y, z)
    next[FACE_ORDER.indexOf(targetFace)][targetIdx] = state[FACE_ORDER.indexOf(s.face)][s.idx]
  }
  return next
}

/** 应用一步转动（含逆时针与 180°），返回新状态 */
export function applyMove(state, move) {
  const times = move.turn === 2 ? 2 : move.turn === -1 ? 3 : 1
  let s = state
  for (let i = 0; i < times; i++) {
    s = applyMoveCW(s, move.face)
  }
  return s
}

/** 连续应用多步，返回新状态 */
export function applyMoves(state, moves) {
  return moves.reduce((s, m) => applyMove(s, m), state)
}
