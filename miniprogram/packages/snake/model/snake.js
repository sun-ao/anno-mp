// 蛇形魔方（Rubik's Snake）核心算法 —— 忠实移植自 regomne/magic-snake
// 纯 JS / CJS，不依赖 three，便于在 node 中做逻辑测试。
// 坐标/姿态约定与上游完全一致：24 节三角柱首尾相连，每关节 4 态（0/1/2/3 个 quarter-turn）。

// ---------- 极小向量 / 四元数数学（仅覆盖算法所需）----------
function vadd(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z } }
function vsub(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z } }
function vscale(a, s) { return { x: a.x * s, y: a.y * s, z: a.z * s } }
function vlen(a) { return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z) }
function vnorm(a) { var l = vlen(a) || 1; return vscale(a, 1 / l) }
function applyQuat(p, q) {
  var qx = q.x, qy = q.y, qz = q.z, qw = q.w
  var tx = 2 * (qy * p.z - qz * p.y)
  var ty = 2 * (qz * p.x - qx * p.z)
  var tz = 2 * (qx * p.y - qy * p.x)
  var cx = qy * tz - qz * ty
  var cy = qz * tx - qx * tz
  var cz = qx * ty - qy * tx
  return { x: p.x + qw * tx + cx, y: p.y + qw * ty + cy, z: p.z + qw * tz + cz }
}
function quatMul(a, b) {
  var ax = a.x, ay = a.y, az = a.z, aw = a.w
  var bx = b.x, by = b.y, bz = b.z, bw = b.w
  return {
    x: aw * bx + ax * bw + ay * bz - az * by,
    y: aw * by - ax * bz + ay * bw + az * bx,
    z: aw * bz + ax * by - ay * bx + az * bw,
    w: aw * bw - ax * bx - ay * by - az * bz
  }
}
function quatAxisAngle(axis, angle) {
  var h = angle / 2, s = Math.sin(h)
  return { x: axis.x * s, y: axis.y * s, z: axis.z * s, w: Math.cos(h) }
}
var Q_IDENT = { x: 0, y: 0, z: 0, w: 1 }

// ---------- 常量 ----------
var PIECE_SIZE = 1
var rootTwo = Math.sqrt(2) * PIECE_SIZE
var localJointCenter = { x: (3 * rootTwo) / 4, y: rootTwo / 4, z: 0 }

// ---------- snake.ts：姿态 → 各节世界变换 ----------
// 返回 [{ position:{x,y,z}, quaternion:{x,y,z,w} }]，与上游 calculateTransforms 数学等价
// （用「位置+四元数」直接递推，等价于矩阵 premultiply + decompose）。
function calculateTransforms(pieceCount, turns) {
  var mats = []
  for (var p = 0; p < pieceCount; p++) {
    mats.push({ pos: { x: (rootTwo / 2) * p, y: 0, z: 0 }, quat: { x: 0, y: 0, z: 0, w: 1 } })
  }
  for (var joint = 0; joint < pieceCount - 1; joint++) {
    var quarterTurns = turns[joint] || 0
    if (quarterTurns === 0) continue
    var prev = mats[joint]
    var pivot = vadd(applyQuat(localJointCenter, prev.quat), prev.pos)
    var localAxis = (joint % 2 === 0)
      ? { x: rootTwo / 2, y: rootTwo / 2, z: 0 }
      : { x: rootTwo / 2, y: -rootTwo / 2, z: 0 }
    var axis = vnorm(applyQuat(localAxis, prev.quat))
    var deltaQuat = quatAxisAngle(axis, -quarterTurns * Math.PI / 2)
    for (var piece = joint + 1; piece < pieceCount; piece++) {
      var old = mats[piece]
      var rel = vsub(old.pos, pivot)
      var rotated = applyQuat(rel, deltaQuat)
      mats[piece] = { pos: vadd(rotated, pivot), quat: quatMul(deltaQuat, old.quat) }
    }
  }
  var center = { x: (rootTwo * (pieceCount - 1)) / 4, y: 0, z: 0 }
  return mats.map(function (m) {
    return { position: vsub(m.pos, center), quaternion: m.quat }
  })
}

// ---------- formula.ts：记法解析 ----------
function normalizePower(value) {
  return String(value).replace('⁻', '-').replace('¹', '1').replace('²', '2').replace('³', '3')
}

function parseFormula(input, pieceCount, language) {
  language = language || 'zh'
  var trimmed = (input || '').trim()
  if (!trimmed) return { steps: [], errors: [], notation: undefined }
  if (/^[0-3]+$/.test(trimmed)) {
    if (trimmed.length !== pieceCount) {
      return {
        steps: [],
        errors: [language === 'en'
          ? ('0123 pose encoding must contain ' + pieceCount + ' digits; found ' + trimmed.length)
          : ('0123 姿态编码应为 ' + pieceCount + ' 位，当前为 ' + trimmed.length + ' 位')],
        notation: 'digits'
      }
    }
    var steps = []
    for (var i = 0; i < trimmed.length; i++) {
      var digit = trimmed[i]
      if (i === 0 || digit === '0') continue
      var turn = digit === '1' ? 1 : digit === '2' ? 2 : -1
      steps.push({ joint: i, turn: turn, source: (i + 1) + ':' + digit })
    }
    return { steps: steps, errors: [], notation: 'digits' }
  }
  var primaryNotation = input.indexOf('(') >= 0
  var chunks = trimmed
    .split(primaryNotation ? /[,，;；\n]+/ : /[,，;；\s]+/)
    .map(function (s) { return s.trim() })
    .filter(Boolean)
  var outSteps = []
  var errors = []
  var ITEM = /^(\d+)\s*\(\s*(-?\d+)\s*\)$/
  var SPEED_ITEM = /^(\d+)\s*([+\-xX×])$/
  var POWER_ITEM = /^(\d+)\s*\^?\s*([⁻¹²³0-9-]+)$/
  chunks.forEach(function (source, index) {
    var match = source.match(ITEM)
    var speedMatch = primaryNotation ? null : source.match(SPEED_ITEM)
    var powerMatch = primaryNotation ? null : source.match(POWER_ITEM)
    if (!match && !speedMatch && !powerMatch) {
      errors.push(language === 'en'
        ? ('Item ' + (index + 1) + ' “' + source + '” is invalid; use 3(-1) or 4-')
        : ('第 ' + (index + 1) + ' 项“' + source + '”格式不正确，应写成 3(-1) 或 4-'))
      return
    }
    var segment = speedMatch || powerMatch
    var piece = Number(segment ? segment[1] : match[1])
    var joint = piece - 1
    var speedTurn = speedMatch ? speedMatch[2] : null
    var rawTurn = speedTurn
      ? (speedTurn === '+' ? 1 : speedTurn === '-' ? -1 : 2)
      : Number(powerMatch ? normalizePower(powerMatch[2]) : match[2])
    var turn = (match && rawTurn === -2) ? 2 : rawTurn
    if (piece < 1 || piece > pieceCount) {
      errors.push(language === 'en'
        ? ('Piece ' + piece + ' is out of range (1–' + pieceCount + ')')
        : ('方块 ' + piece + ' 超出范围（当前可用 1–' + pieceCount + '）'))
      return
    }
    if (match && rawTurn === 0) return
    if (turn !== -1 && turn !== 1 && turn !== 2) {
      errors.push(language === 'en'
        ? ('Piece ' + piece + ' must use a turn of 1, -1, or 2')
        : ('方块 ' + piece + ' 的旋转只能是 1、-1 或 2'))
      return
    }
    if (piece === 1) return
    outSteps.push({ joint: joint, turn: turn, source: source })
  })
  return { steps: outSteps, errors: errors, notation: primaryNotation ? 'joint' : 'speed' }
}

function turnsAtStep(steps, stepIndex, pieceCount) {
  var turns = []
  for (var i = 0; i < pieceCount - 1; i++) turns.push(0)
  var n = Math.min(stepIndex, steps.length)
  for (var index = 0; index < n; index++) {
    var step = steps[index]
    turns[step.joint - 1] += step.turn
  }
  return turns
}

function formatFormula(steps, notation, pieceCount) {
  notation = notation || 'joint'
  if (notation === 'digits') {
    var length = pieceCount || (steps.length ? Math.max.apply(null, steps.map(function (s) { return s.joint + 1 })) : 1)
    var digits = []
    for (var i = 0; i < length; i++) digits.push(0)
    steps.forEach(function (s) {
      var quarterTurns = s.turn === -1 ? 3 : s.turn
      digits[s.joint] = (digits[s.joint] + quarterTurns) % 4
    })
    return digits.join('')
  }
  if (notation === 'speed') {
    return steps.map(function (s) {
      return (s.joint + 1) + (s.turn === 1 ? '+' : s.turn === -1 ? '-' : 'x')
    }).join(' ')
  }
  return steps.map(function (s) { return (s.joint + 1) + '(' + s.turn + ')' }).join(', ')
}

// ---------- collision.ts：整数晶格穿模检测 ----------
function lAdd(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]] }
function lSub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]] }
function lScale(v, f) { return [v[0] * f, v[1] * f, v[2] * f] }
function lDot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] }
function lCross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]] }

function rotateQuarter(value, axis, quarterTurns) {
  var turn = ((quarterTurns % 4) + 4) % 4
  var parallel = lScale(axis, lDot(axis, value))
  if (turn === 0) return value.slice()
  if (turn === 1) return lAdd(lCross(axis, value), parallel)
  if (turn === 2) return lAdd(lScale(value, -1), lScale(parallel, 2))
  return lAdd(lScale(lCross(axis, value), -1), parallel)
}

function nextExactState(state, index, formulaTurn) {
  var even = index % 2 === 0
  var faceSpan = even ? state.a : state.b
  var axis = lScale(even ? state.b : state.a, -1)
  var pivot2 = lAdd(state.origin2, lAdd(faceSpan, state.c))
  var unrotatedOrigin2 = lAdd(state.origin2, lScale(faceSpan, 2))
  var turn = -formulaTurn
  return {
    origin2: lAdd(pivot2, rotateQuarter(lSub(unrotatedOrigin2, pivot2), axis, turn)),
    a: rotateQuarter(lScale(state.a, -1), axis, turn),
    b: rotateQuarter(lScale(state.b, -1), axis, turn),
    c: rotateQuarter(state.c, axis, turn)
  }
}

function cornerCode(point, cell) {
  var x = point[0] - cell[0]
  var y = point[1] - cell[1]
  var z = point[2] - cell[2]
  return x | (y << 1) | (z << 2)
}

function typeFromCorners(corners) {
  var occupied = {}
  corners.forEach(function (c) { occupied[c] = true })
  var missing = []
  for (var c = 0; c < 8; c++) if (!occupied[c]) missing.push(c)
  if (missing.length !== 2) throw new Error('魔尺方块没有落在一个有效的半立方格中')
  var difference = missing[0] ^ missing[1]
  var edgeAxis = difference === 1 ? 0 : difference === 2 ? 1 : difference === 4 ? 2 : -1
  if (edgeAxis < 0) throw new Error('半立方格缺失的两个角没有组成一条边')
  var otherAxes = [0, 1, 2].filter(function (a) { return a !== edgeAxis })
  var fixedBits = ((missing[0] >> otherAxes[0]) & 1) | (((missing[0] >> otherAxes[1]) & 1) << 1)
  return edgeAxis * 4 + fixedBits
}

function complementaryType(type) {
  return Math.floor(type / 4) * 4 + ((type % 4) ^ 3)
}

function calculateLatticePieces(pieceCount, turns) {
  var pieces = []
  var state = { origin2: [0, 0, 0], a: [1, 0, 0], b: [0, -1, 0], c: [0, 0, 1] }
  for (var index = 0; index < pieceCount; index++) {
    if (state.origin2.some(function (c) { return c % 2 !== 0 })) {
      throw new Error('魔尺整数晶格状态落在了半格位置')
    }
    var origin = state.origin2.map(function (c) { return c / 2 })
    var latticeVertices = [
      origin,
      lAdd(origin, state.a),
      lAdd(origin, state.b),
      lAdd(origin, state.c),
      lAdd(lAdd(origin, state.a), state.c),
      lAdd(lAdd(origin, state.b), state.c)
    ]
    var cell = [
      Math.min.apply(null, latticeVertices.map(function (v) { return v[0] })),
      Math.min.apply(null, latticeVertices.map(function (v) { return v[1] })),
      Math.min.apply(null, latticeVertices.map(function (v) { return v[2] }))
    ]
    pieces.push({
      piece: index + 1,
      cell: cell,
      type: typeFromCorners(latticeVertices.map(function (v) { return cornerCode(v, cell) })),
      origin: origin
    })
    if (index < pieceCount - 1) state = nextExactState(state, index, turns[index] || 0)
  }
  return pieces
}

function detectCollisions(pieceCount, turns) {
  var occupied = {}
  var collisions = []
  calculateLatticePieces(pieceCount, turns).forEach(function (piece) {
    var key = piece.cell.join(',')
    var cell = occupied[key] || []
    cell.forEach(function (other) {
      if (piece.type !== complementaryType(other.type)) collisions.push({ pieces: [other.piece, piece.piece] })
    })
    cell.push(piece)
    occupied[key] = cell
  })
  return collisions
}

// ---------- 内置造型库（源自 Øistein Holen 的蛇形魔方图案库）----------
var SHAPE_PRESETS = [
  { id: 'ball-24', name: '24 段 · 球形', nameEn: '24-piece · Ball', pieceCount: 24, formula: '2- 3- 4+ 6+ 7+ 5- 8- 9+ 11- 10- 12+ 14+ 15+ 13- 16- 17+ 19- 20+ 21- 18- 23+ 24- 22+' },
  { id: 'basket-24', name: '24 段 · 篮子', nameEn: '24-piece · Basket', pieceCount: 24, formula: '032002101101200232120021' },
  { id: 'bird-24', name: '24 段 · 小鸟', nameEn: '24-piece · Bird', pieceCount: 24, formula: '020220001112310132111200' },
  { id: 'cat-24', name: '24 段 · 猫', nameEn: '24-piece · Cat', pieceCount: 24, formula: '002202201022022022000000' },
  { id: 'cobra-24', name: '24 段 · 眼镜蛇', nameEn: '24-piece · Cobra', pieceCount: 24, formula: '003031233213010000200002' },
  { id: 'dog-24', name: '24 段 · 小狗', nameEn: '24-piece · Dog', pieceCount: 24, formula: '000002202002022000202202' },
  { id: 'duck-24', name: '24 段 · 鸭子', nameEn: '24-piece · Duck', pieceCount: 24, formula: '022000101003210012300101' },
  { id: 'elephant-24', name: '24 段 · 大象', nameEn: '24-piece · Elephant', pieceCount: 24, formula: '001013211231010220220220' },
  { id: 'penguin-24', name: '24 段 · 企鹅', nameEn: '24-piece · Penguin', pieceCount: 24, formula: '002202203233313113133102' },
  { id: 'swan-24', name: '24 段 · 天鹅', nameEn: '24-piece · Swan', pieceCount: 24, formula: '022021301230303032103122' },
  { id: 'turtle-24', name: '24 段 · 乌龟', nameEn: '24-piece · Turtle', pieceCount: 24, formula: '003100312331311211131333' },
  { id: 'zigzag-36', name: '36 段 · 螺旋折线', nameEn: '36-piece · Spiral zigzag', pieceCount: 36, formula: '001001001001001001001001001001001001' },
  { id: 'double-ball-48', name: '48 段 · 双球', nameEn: '48-piece · Double ball', pieceCount: 48, formula: '033133131131331311313313333133131131331311313313' },
  { id: 'coffee-cup-48', name: '48 段 · 咖啡杯', nameEn: '48-piece · Coffee cup', pieceCount: 48, formula: '002002110020012300200311022022011300200321002001' },
  { id: 'flower-48', name: '48 段 · 花', nameEn: '48-piece · Flower', pieceCount: 48, formula: '013323121323102203121323121111213231211112132312' },
  { id: 'knot-48', name: '48 段 · 绳结', nameEn: '48-piece · Knot', pieceCount: 48, formula: '033022011110220333302201111022033330220111102203' },
  { id: 'maracas-48', name: '48 段 · 沙锤', nameEn: '48-piece · Maracas', pieceCount: 48, formula: '031100313003130011100000220000011100313003130011' },
  { id: 'octahedron-48', name: '48 段 · 八面体', nameEn: '48-piece · Octahedron', pieceCount: 48, formula: '000310031001300130031003100130013003100310013001' },
  { id: 'stone-48', name: '48 段 · 石头', nameEn: '48-piece · Stone', pieceCount: 48, formula: '023313113133131123101321101303123311331311313321' },
  { id: 'straight-48', name: '48 段 · 直尺', nameEn: '48-piece · Straight', pieceCount: 48, formula: '000000000000000000000000000000000000000000000000' },
  { id: 'star-48', name: '48 段 · 五角星', nameEn: '48-piece · Star', pieceCount: 48, formula: '013022013310220311302201331022031130220133102203' },
  { id: 'star-2-48', name: '48 段 · 五角星 2', nameEn: '48-piece · Star 2', pieceCount: 48, formula: '002201133022033110220113302203311022011330220331' },
  { id: 'starfish-48', name: '48 段 · 海星', nameEn: '48-piece · Starfish', pieceCount: 48, formula: '010220111313330220130220310220130220310220333131' },
  { id: 'symmetry-48', name: '48 段 · 对称造型', nameEn: '48-piece · Symmetry', pieceCount: 48, formula: '020130013001133022013001133001300130220113300130' },
  { id: 'barbell-72', name: '72 段 · 杠铃', nameEn: '72-piece · Barbell', pieceCount: 72, formula: '011131331311313313113133300000000000000000000000333131131331311313313111' },
  { id: 'camel-72', name: '72 段 · 骆驼', nameEn: '72-piece · Camel', pieceCount: 72, formula: '011131102201131113331330220331331133133022033133333313302203313330020002' },
  { id: 'coffin-72', name: '72 段 · 棺材', nameEn: '72-piece · Coffin', pieceCount: 72, formula: '031100000000313000000003130000000011331100000000313000000003130000000011' },
  { id: 'filled-octahedron-72', name: '72 段 · 实心八面体', nameEn: '72-piece · Filled octahedron', pieceCount: 72, formula: '013133131131331311313332130031003100130013003100310013001300310031001321' },
  { id: 'hammer-72', name: '72 段 · 锤子', nameEn: '72-piece · Hammer', pieceCount: 72, formula: '032331311313313112310132110130312331133131131332300000000000220000000000' },
  { id: 'octahedron-72', name: '72 段 · 八面体', nameEn: '72-piece · Octahedron', pieceCount: 72, formula: '000003100003100001300001300003100003100001300001300003100003100001300001' },
  { id: 'truncated-tetrahedron-72', name: '72 段 · 截角四面体', nameEn: '72-piece · Truncated tetrahedron', pieceCount: 72, formula: '010030010030010013003022010030010013003001003001003022010013003001003022' },
  { id: 'tetrahedron-72', name: '72 段 · 四面体', nameEn: '72-piece · Tetrahedron', pieceCount: 72, formula: '020001300001300001133000220001300001133000013000013000220001133000013000' },
  { id: 'tipi-72', name: '72 段 · 帐篷', nameEn: '72-piece · Tipi', pieceCount: 72, formula: '033000002200000111102203333000002200000111102203333000002200000111102203' }
]

// ---------- 便捷封装 ----------
function turnsFromFormula(formula, pieceCount) {
  var parsed = parseFormula(formula, pieceCount)
  if (parsed.errors.length) return { turns: null, errors: parsed.errors, steps: [] }
  return {
    turns: turnsAtStep(parsed.steps, parsed.steps.length, pieceCount),
    errors: [],
    steps: parsed.steps
  }
}

function safeDetectCollisions(pieceCount, turns) {
  try {
    return detectCollisions(pieceCount, turns)
  } catch (e) {
    return [{ pieces: [-1, -1], error: String(e && e.message) }]
  }
}

function validatePresets(presets) {
  return presets.map(function (p) {
    var r = turnsFromFormula(p.formula, p.pieceCount)
    if (r.errors.length) return { id: p.id, ok: false, reason: 'parse: ' + r.errors.join('; ') }
    var collisions = safeDetectCollisions(p.pieceCount, r.turns)
    return { id: p.id, ok: collisions.length === 0, collisions: collisions }
  })
}

module.exports = {
  PIECE_SIZE: PIECE_SIZE,
  rootTwo: rootTwo,
  // 几何
  calculateTransforms: calculateTransforms,
  // 公式
  parseFormula: parseFormula,
  turnsAtStep: turnsAtStep,
  formatFormula: formatFormula,
  turnsFromFormula: turnsFromFormula,
  // 穿模检测
  detectCollisions: safeDetectCollisions,
  validatePresets: validatePresets,
  // 造型库
  SHAPE_PRESETS: SHAPE_PRESETS
}
