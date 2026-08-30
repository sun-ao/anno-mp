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
      // 钳制到合法 0 基铰链范围 [0, pieceCount-2]：末位（i=pieceCount-1）无对应铰链
      steps.push({ joint: Math.min(i, pieceCount - 2), turn: turn, source: (i + 1) + ':' + digit })
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
    // 钳制到合法 0 基铰链范围 [0, pieceCount-2]：末块（piece=pieceCount）无对应铰链
    outSteps.push({ joint: Math.min(joint, pieceCount - 2), turn: turn, source: source })
  })
  return { steps: outSteps, errors: errors, notation: primaryNotation ? 'joint' : 'speed' }
}

function turnsAtStep(steps, stepIndex, pieceCount) {
  var turns = []
  for (var i = 0; i < pieceCount - 1; i++) turns.push(0)
  var n = Math.min(stepIndex, steps.length)
  for (var index = 0; index < n; index++) {
    var step = steps[index]
    // step.joint 已由 parseFormula 钳制到合法 0 基铰链范围 [0, pieceCount-2]
    turns[step.joint] += step.turn
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
  { id: 'tipi-72', name: '72 段 · 帐篷', nameEn: '72-piece · Tipi', pieceCount: 72, formula: '033000002200000111102203333000002200000111102203333000002200000111102203' },
  { id: 'explore-24-探索-1', name: '24 段 · 探索1', nameEn: '24-piece · 探索 1', pieceCount: 24, formula: '002002010021330121300321' },
  { id: 'explore-24-探索-2', name: '24 段 · 探索2', nameEn: '24-piece · 探索 2', pieceCount: 24, formula: '030003202310120130312010' },
  { id: 'explore-24-探索-3', name: '24 段 · 探索3', nameEn: '24-piece · 探索 3', pieceCount: 24, formula: '003200101210032333131111' },
  { id: 'explore-24-周期-1', name: '24 段 · 周期1', nameEn: '24-piece · 周期 1', pieceCount: 24, formula: '032311232311232311232311' },
  { id: 'explore-24-探索-4', name: '24 段 · 探索4', nameEn: '24-piece · 探索 4', pieceCount: 24, formula: '021302031013121200302020' },
  { id: 'explore-24-周期-2', name: '24 段 · 周期2', nameEn: '24-piece · 周期 2', pieceCount: 24, formula: '031323231323231323231323' },
  { id: 'explore-24-探索-5', name: '24 段 · 探索5', nameEn: '24-piece · 探索 5', pieceCount: 24, formula: '020310131021200011310030' },
  { id: 'explore-24-探索-6', name: '24 段 · 探索6', nameEn: '24-piece · 探索 6', pieceCount: 24, formula: '023103323023020310220010' },
  { id: 'explore-24-探索-7', name: '24 段 · 探索7', nameEn: '24-piece · 探索 7', pieceCount: 24, formula: '031132310003233313300003' },
  { id: 'explore-24-周期-3', name: '24 段 · 周期3', nameEn: '24-piece · 周期 3', pieceCount: 24, formula: '011113111131111311113111' },
  { id: 'explore-24-探索-8', name: '24 段 · 探索8', nameEn: '24-piece · 探索 8', pieceCount: 24, formula: '000023020101200001202002' },
  { id: 'explore-24-探索-9', name: '24 段 · 探索9', nameEn: '24-piece · 探索 9', pieceCount: 24, formula: '000023030332110101300300' },
  { id: 'explore-24-周期-4', name: '24 段 · 周期4', nameEn: '24-piece · 周期 4', pieceCount: 24, formula: '013333133331333313333133' },
  { id: 'explore-24-周期-5', name: '24 段 · 周期5', nameEn: '24-piece · 周期 5', pieceCount: 24, formula: '031111311113111131111311' },
  { id: 'explore-24-探索-10', name: '24 段 · 探索10', nameEn: '24-piece · 探索 10', pieceCount: 24, formula: '013003130300120130013330' },
  { id: 'explore-24-探索-11', name: '24 段 · 探索11', nameEn: '24-piece · 探索 11', pieceCount: 24, formula: '010132002031011031210121' },
  { id: 'explore-24-探索-12', name: '24 段 · 探索12', nameEn: '24-piece · 探索 12', pieceCount: 24, formula: '013203001330300123230201' },
  { id: 'explore-24-探索-13', name: '24 段 · 探索13', nameEn: '24-piece · 探索 13', pieceCount: 24, formula: '020212021002003233101023' },
  { id: 'explore-24-探索-14', name: '24 段 · 探索14', nameEn: '24-piece · 探索 14', pieceCount: 24, formula: '002300120120232313023333' },
  { id: 'explore-24-探索-15', name: '24 段 · 探索15', nameEn: '24-piece · 探索 15', pieceCount: 24, formula: '010131000313233130302313' },
  { id: 'explore-24-探索-16', name: '24 段 · 探索16', nameEn: '24-piece · 探索 16', pieceCount: 24, formula: '002100012103110220123200' },
  { id: 'explore-24-探索-17', name: '24 段 · 探索17', nameEn: '24-piece · 探索 17', pieceCount: 24, formula: '002011330330132323103323' },
  { id: 'explore-24-探索-18', name: '24 段 · 探索18', nameEn: '24-piece · 探索 18', pieceCount: 24, formula: '023130303212000220101002' },
  { id: 'explore-24-探索-19', name: '24 段 · 探索19', nameEn: '24-piece · 探索 19', pieceCount: 24, formula: '002311002302002133000010' },
  { id: 'explore-24-探索-20', name: '24 段 · 探索20', nameEn: '24-piece · 探索 20', pieceCount: 24, formula: '002032000330230300110303' },
  { id: 'explore-24-探索-21', name: '24 段 · 探索21', nameEn: '24-piece · 探索 21', pieceCount: 24, formula: '032001300002002000200000' },
  { id: 'explore-24-探索-22', name: '24 段 · 探索22', nameEn: '24-piece · 探索 22', pieceCount: 24, formula: '020020121311231000020200' },
  { id: 'explore-24-探索-23', name: '24 段 · 探索23', nameEn: '24-piece · 探索 23', pieceCount: 24, formula: '001212123002002300030010' },
  { id: 'explore-24-探索-24', name: '24 段 · 探索24', nameEn: '24-piece · 探索 24', pieceCount: 24, formula: '031000120323000202120202' },
  { id: 'explore-24-探索-25', name: '24 段 · 探索25', nameEn: '24-piece · 探索 25', pieceCount: 24, formula: '002030220232100302013020' },
  { id: 'explore-24-探索-26', name: '24 段 · 探索26', nameEn: '24-piece · 探索 26', pieceCount: 24, formula: '020331100231123200111223' },
  { id: 'explore-24-探索-27', name: '24 段 · 探索27', nameEn: '24-piece · 探索 27', pieceCount: 24, formula: '011020020020110130003303' },
  { id: 'explore-24-探索-28', name: '24 段 · 探索28', nameEn: '24-piece · 探索 28', pieceCount: 24, formula: '020031211133021202202003' },
  { id: 'explore-24-周期-6', name: '24 段 · 周期6', nameEn: '24-piece · 周期 6', pieceCount: 24, formula: '032111232111232111232111' },
  { id: 'explore-24-探索-29', name: '24 段 · 探索29', nameEn: '24-piece · 探索 29', pieceCount: 24, formula: '031200200310030103101300' },
  { id: 'explore-24-探索-30', name: '24 段 · 探索30', nameEn: '24-piece · 探索 30', pieceCount: 24, formula: '021020323303023020132013' },
  { id: 'explore-24-探索-31', name: '24 段 · 探索31', nameEn: '24-piece · 探索 31', pieceCount: 24, formula: '031011020010030000231032' },
  { id: 'explore-24-探索-32', name: '24 段 · 探索32', nameEn: '24-piece · 探索 32', pieceCount: 24, formula: '020020102302010030330101' },
  { id: 'explore-24-探索-33', name: '24 段 · 探索33', nameEn: '24-piece · 探索 33', pieceCount: 24, formula: '000200123003133101320200' },
  { id: 'explore-24-探索-34', name: '24 段 · 探索34', nameEn: '24-piece · 探索 34', pieceCount: 24, formula: '002002110203023030011000' },
  { id: 'explore-36-周期-7', name: '36 段 · 周期7', nameEn: '36-piece · 周期 7', pieceCount: 36, formula: '011131111311113111131111311113111131' },
  { id: 'explore-36-周期-8', name: '36 段 · 周期8', nameEn: '36-piece · 周期 8', pieceCount: 36, formula: '013111131111311113111131111311113111' },
  { id: 'explore-36-探索-35', name: '36 段 · 探索35', nameEn: '36-piece · 探索 35', pieceCount: 36, formula: '013232100022023111203310000220300020' },
  { id: 'explore-36-探索-36', name: '36 段 · 探索36', nameEn: '36-piece · 探索 36', pieceCount: 36, formula: '030001331001330213321300012102000320' },
  { id: 'explore-36-探索-37', name: '36 段 · 探索37', nameEn: '36-piece · 探索 37', pieceCount: 36, formula: '032121000031331110210030021333210023' },
  { id: 'explore-36-探索-38', name: '36 段 · 探索38', nameEn: '36-piece · 探索 38', pieceCount: 36, formula: '022001013002310013111130130320230321' },
  { id: 'explore-36-探索-39', name: '36 段 · 探索39', nameEn: '36-piece · 探索 39', pieceCount: 36, formula: '020100002102113201103113203001213003' },
  { id: 'explore-36-探索-40', name: '36 段 · 探索40', nameEn: '36-piece · 探索 40', pieceCount: 36, formula: '002013100120110220000120000130210000' },
  { id: 'explore-36-探索-41', name: '36 段 · 探索41', nameEn: '36-piece · 探索 41', pieceCount: 36, formula: '011010332002031331012101200301300112' },
  { id: 'explore-36-探索-42', name: '36 段 · 探索42', nameEn: '36-piece · 探索 42', pieceCount: 36, formula: '013230123013200030023301211303110113' },
  { id: 'explore-36-对称-1', name: '36 段 · 对称1', nameEn: '36-piece · 对称 1', pieceCount: 36, formula: '030031030200213331133312002030130030' },
  { id: 'explore-36-周期-9', name: '36 段 · 周期9', nameEn: '36-piece · 周期 9', pieceCount: 36, formula: '033331333313333133331333313333133331' },
  { id: 'explore-36-探索-43', name: '36 段 · 探索43', nameEn: '36-piece · 探索 43', pieceCount: 36, formula: '013323002001232021303021020323000310' },
  { id: 'explore-36-周期-10', name: '36 段 · 周期10', nameEn: '36-piece · 周期 10', pieceCount: 36, formula: '031111311113111131111311113111131111' },
  { id: 'explore-36-周期-11', name: '36 段 · 周期11', nameEn: '36-piece · 周期 11', pieceCount: 36, formula: '013333133331333313333133331333313333' },
  { id: 'explore-36-探索-44', name: '36 段 · 探索44', nameEn: '36-piece · 探索 44', pieceCount: 36, formula: '033032302133330130201131003300010000' },
  { id: 'explore-36-对称-2', name: '36 段 · 对称2', nameEn: '36-piece · 对称 2', pieceCount: 36, formula: '013111100220100200002001022001111310' },
  { id: 'explore-36-对称-3', name: '36 段 · 对称3', nameEn: '36-piece · 对称 3', pieceCount: 36, formula: '000130030010022020020220010030031000' },
  { id: 'explore-36-探索-45', name: '36 段 · 探索45', nameEn: '36-piece · 探索 45', pieceCount: 36, formula: '012033102303200200233023000300203103' },
  { id: 'explore-36-探索-46', name: '36 段 · 探索46', nameEn: '36-piece · 探索 46', pieceCount: 36, formula: '030300100323010000233030310030333100' },
  { id: 'explore-36-探索-47', name: '36 段 · 探索47', nameEn: '36-piece · 探索 47', pieceCount: 36, formula: '022000101001320101032103321003332133' },
  { id: 'explore-36-探索-48', name: '36 段 · 探索48', nameEn: '36-piece · 探索 48', pieceCount: 36, formula: '003033133020231320033113303020310322' },
  { id: 'explore-36-探索-49', name: '36 段 · 探索49', nameEn: '36-piece · 探索 49', pieceCount: 36, formula: '002030020103012000020010100021001000' },
  { id: 'explore-36-探索-50', name: '36 段 · 探索50', nameEn: '36-piece · 探索 50', pieceCount: 36, formula: '023333233003101133300210220202022000' },
  { id: 'explore-36-探索-51', name: '36 段 · 探索51', nameEn: '36-piece · 探索 51', pieceCount: 36, formula: '020033130233012021200302033200123012' },
  { id: 'explore-36-对称-4', name: '36 段 · 对称4', nameEn: '36-piece · 对称 4', pieceCount: 36, formula: '002310000023032000000230320000013200' },
  { id: 'explore-36-探索-52', name: '36 段 · 探索52', nameEn: '36-piece · 探索 52', pieceCount: 36, formula: '010110210100302111020320301000010320' },
  { id: 'explore-36-探索-53', name: '36 段 · 探索53', nameEn: '36-piece · 探索 53', pieceCount: 36, formula: '012133110030003203320013012023112102' },
  { id: 'explore-36-探索-54', name: '36 段 · 探索54', nameEn: '36-piece · 探索 54', pieceCount: 36, formula: '000120112000200132000133210330123033' },
  { id: 'explore-36-探索-55', name: '36 段 · 探索55', nameEn: '36-piece · 探索 55', pieceCount: 36, formula: '033121002000131103020313011311210130' },
  { id: 'explore-36-探索-56', name: '36 段 · 探索56', nameEn: '36-piece · 探索 56', pieceCount: 36, formula: '021303130112003030202123022023100230' },
  { id: 'explore-36-对称-5', name: '36 段 · 对称5', nameEn: '36-piece · 对称 5', pieceCount: 36, formula: '023210110000120001100021000011012320' },
  { id: 'explore-36-探索-57', name: '36 段 · 探索57', nameEn: '36-piece · 探索 57', pieceCount: 36, formula: '031300313310113110101201010031301233' },
  { id: 'explore-36-探索-58', name: '36 段 · 探索58', nameEn: '36-piece · 探索 58', pieceCount: 36, formula: '013003310113003323013313301200300103' },
  { id: 'explore-36-探索-59', name: '36 段 · 探索59', nameEn: '36-piece · 探索 59', pieceCount: 36, formula: '033230200130300312103032121302021201' },
  { id: 'explore-36-探索-60', name: '36 段 · 探索60', nameEn: '36-piece · 探索 60', pieceCount: 36, formula: '000133330302320230323121103311013133' },
  { id: 'explore-36-探索-61', name: '36 段 · 探索61', nameEn: '36-piece · 探索 61', pieceCount: 36, formula: '003030310020121102000210203331320101' },
  { id: 'explore-36-探索-62', name: '36 段 · 探索62', nameEn: '36-piece · 探索 62', pieceCount: 36, formula: '002020120000010013033032323021033101' },
  { id: 'explore-36-探索-63', name: '36 段 · 探索63', nameEn: '36-piece · 探索 63', pieceCount: 36, formula: '000301031200312023001203200233210020' },
  { id: 'explore-36-探索-64', name: '36 段 · 探索64', nameEn: '36-piece · 探索 64', pieceCount: 36, formula: '013300013102302003001000120003301313' },
  { id: 'explore-48-探索-65', name: '48 段 · 探索65', nameEn: '48-piece · 探索 65', pieceCount: 48, formula: '013113023323001312110203331201332102133101012323' },
  { id: 'explore-48-周期-12', name: '48 段 · 周期12', nameEn: '48-piece · 周期 12', pieceCount: 48, formula: '031111311113111131111311113111131111311113111131' },
  { id: 'explore-48-周期-13', name: '48 段 · 周期13', nameEn: '48-piece · 周期 13', pieceCount: 48, formula: '013333133331333313333133331333313333133331333313' },
  { id: 'explore-48-周期-14', name: '48 段 · 周期14', nameEn: '48-piece · 周期 14', pieceCount: 48, formula: '011113111131111311113111131111311113111131111311' },
  { id: 'explore-48-周期-15', name: '48 段 · 周期15', nameEn: '48-piece · 周期 15', pieceCount: 48, formula: '033133331333313333133331333313333133331333313333' },
  { id: 'explore-48-探索-66', name: '48 段 · 探索66', nameEn: '48-piece · 探索 66', pieceCount: 48, formula: '030110030232323100010231330203003110210330211202' },
  { id: 'explore-48-探索-67', name: '48 段 · 探索67', nameEn: '48-piece · 探索 67', pieceCount: 48, formula: '033300113201102000130330003201020300203303012013' },
  { id: 'explore-48-探索-68', name: '48 段 · 探索68', nameEn: '48-piece · 探索 68', pieceCount: 48, formula: '033011320002330033200321021003302100232003331030' },
  { id: 'explore-48-对称-6', name: '48 段 · 对称6', nameEn: '48-piece · 对称 6', pieceCount: 48, formula: '010303212001033100101203302101001330100212303010' },
  { id: 'explore-48-对称-7', name: '48 段 · 对称7', nameEn: '48-piece · 对称 7', pieceCount: 48, formula: '011101301203130211000133331000112031302103101110' },
  { id: 'explore-48-探索-69', name: '48 段 · 探索69', nameEn: '48-piece · 探索 69', pieceCount: 48, formula: '013002033201102300110130210102133312100012330001' },
  { id: 'explore-48-探索-70', name: '48 段 · 探索70', nameEn: '48-piece · 探索 70', pieceCount: 48, formula: '002001300000002201003030321213020023302332032012' },
  { id: 'explore-48-探索-71', name: '48 段 · 探索71', nameEn: '48-piece · 探索 71', pieceCount: 48, formula: '001312003201011101003110233030000200230102300020' },
  { id: 'explore-48-探索-72', name: '48 段 · 探索72', nameEn: '48-piece · 探索 72', pieceCount: 48, formula: '001300021002002300103033001102302203000130103313' },
  { id: 'explore-48-探索-73', name: '48 段 · 探索73', nameEn: '48-piece · 探索 73', pieceCount: 48, formula: '021113003033030000033330020010131133001130030001' },
  { id: 'explore-48-探索-74', name: '48 段 · 探索74', nameEn: '48-piece · 探索 74', pieceCount: 48, formula: '021033020012332101131010030203000230300331331010' },
  { id: 'explore-48-对称-8', name: '48 段 · 对称8', nameEn: '48-piece · 对称 8', pieceCount: 48, formula: '002001300011000022020313313020220000110003100200' },
  { id: 'explore-48-探索-75', name: '48 段 · 探索75', nameEn: '48-piece · 探索 75', pieceCount: 48, formula: '010002100212303023010210003121032020030003033033' },
  { id: 'explore-48-探索-76', name: '48 段 · 探索76', nameEn: '48-piece · 探索 76', pieceCount: 48, formula: '002010022012333020020000100031200102203000203202' },
  { id: 'explore-48-对称-9', name: '48 段 · 对称9', nameEn: '48-piece · 对称 9', pieceCount: 48, formula: '020130110302320111230020020032111023203011031020' },
  { id: 'explore-48-探索-77', name: '48 段 · 探索77', nameEn: '48-piece · 探索 77', pieceCount: 48, formula: '012121230123203003302100300110230301001330011021' },
  { id: 'explore-48-探索-78', name: '48 段 · 探索78', nameEn: '48-piece · 探索 78', pieceCount: 48, formula: '030313323310201200002301002102200033011002133201' },
  { id: 'explore-48-探索-79', name: '48 段 · 探索79', nameEn: '48-piece · 探索 79', pieceCount: 48, formula: '000030121300003102100012023102130310001333130013' },
  { id: 'explore-48-探索-80', name: '48 段 · 探索80', nameEn: '48-piece · 探索 80', pieceCount: 48, formula: '012000103200201111002032301331110310102120013230' },
  { id: 'explore-48-探索-81', name: '48 段 · 探索81', nameEn: '48-piece · 探索 81', pieceCount: 48, formula: '000311023200120020100033001303032010130333001022' },
  { id: 'explore-48-探索-82', name: '48 段 · 探索82', nameEn: '48-piece · 探索 82', pieceCount: 48, formula: '000000023023011002101200020213330320113110111303' },
  { id: 'explore-48-探索-83', name: '48 段 · 探索83', nameEn: '48-piece · 探索 83', pieceCount: 48, formula: '020001300301000130331000002001002021003300033130' },
  { id: 'explore-48-探索-84', name: '48 段 · 探索84', nameEn: '48-piece · 探索 84', pieceCount: 48, formula: '030200030310030011113113002103231100310200002322' },
  { id: 'explore-48-探索-85', name: '48 段 · 探索85', nameEn: '48-piece · 探索 85', pieceCount: 48, formula: '000001310012101201300030020033201233203130003300' },
  { id: 'explore-48-探索-86', name: '48 段 · 探索86', nameEn: '48-piece · 探索 86', pieceCount: 48, formula: '010300300232121030030101003030002320301031021332' },
  { id: 'explore-48-探索-87', name: '48 段 · 探索87', nameEn: '48-piece · 探索 87', pieceCount: 48, formula: '000011130021002000302020220000203031300300320010' },
  { id: 'explore-48-探索-88', name: '48 段 · 探索88', nameEn: '48-piece · 探索 88', pieceCount: 48, formula: '010200020303130010011030220000002000332000100120' },
  { id: 'explore-48-探索-89', name: '48 段 · 探索89', nameEn: '48-piece · 探索 89', pieceCount: 48, formula: '001001200203020022020332000123230032003100123000' },
  { id: 'explore-48-探索-90', name: '48 段 · 探索90', nameEn: '48-piece · 探索 90', pieceCount: 48, formula: '022003202130301303031002301021030200000313200003' },
  { id: 'explore-48-探索-91', name: '48 段 · 探索91', nameEn: '48-piece · 探索 91', pieceCount: 48, formula: '021103123320200310103030323033211032033101310000' },
  { id: 'explore-48-探索-92', name: '48 段 · 探索92', nameEn: '48-piece · 探索 92', pieceCount: 48, formula: '001022021030123203202000300231032310302100202320' },
  { id: 'explore-48-探索-93', name: '48 段 · 探索93', nameEn: '48-piece · 探索 93', pieceCount: 48, formula: '011010101030010110302300000030320033002000032012' },
  { id: 'explore-48-探索-94', name: '48 段 · 探索94', nameEn: '48-piece · 探索 94', pieceCount: 48, formula: '032000012130200303101300020203021300300302303312' },
  { id: 'explore-48-对称-10', name: '48 段 · 对称10', nameEn: '48-piece · 对称 10', pieceCount: 48, formula: '020100300020002100200201102002001200020003001020' },
  { id: 'explore-48-对称-11', name: '48 段 · 对称11', nameEn: '48-piece · 对称 11', pieceCount: 48, formula: '003000003001200202200100001002202002100300000300' },
  { id: 'explore-48-探索-95', name: '48 段 · 探索95', nameEn: '48-piece · 探索 95', pieceCount: 48, formula: '000000130323002303001102001303000000201302300220' },
  { id: 'explore-48-对称-12', name: '48 段 · 对称12', nameEn: '48-piece · 对称 12', pieceCount: 48, formula: '012000030020100200102001100201002001020030000210' },
  { id: 'explore-48-探索-96', name: '48 段 · 探索96', nameEn: '48-piece · 探索 96', pieceCount: 48, formula: '012100001010030232001002123020001200233210011230' },
  { id: 'explore-48-探索-97', name: '48 段 · 探索97', nameEn: '48-piece · 探索 97', pieceCount: 48, formula: '002100212323031210300203020201210000000023021031' },
  { id: 'explore-48-探索-98', name: '48 段 · 探索98', nameEn: '48-piece · 探索 98', pieceCount: 48, formula: '003100320203011002300102300033020032330030012300' },
  { id: 'explore-72-周期-16', name: '72 段 · 周期16', nameEn: '72-piece · 周期 16', pieceCount: 72, formula: '031333313333133331333313333133331333313333133331333313333133331333313333' },
  { id: 'explore-72-周期-17', name: '72 段 · 周期17', nameEn: '72-piece · 周期 17', pieceCount: 72, formula: '013111131111311113111131111311113111131111311113111131111311113111131111' },
  { id: 'explore-72-周期-18', name: '72 段 · 周期18', nameEn: '72-piece · 周期 18', pieceCount: 72, formula: '033331333313333133331333313333133331333313333133331333313333133331333313' },
  { id: 'explore-72-对称-13', name: '72 段 · 对称13', nameEn: '72-piece · 对称 13', pieceCount: 72, formula: '001133000130100021303300310112102300003201211013003303120001031000331100' },
  { id: 'explore-72-探索-99', name: '72 段 · 探索99', nameEn: '72-piece · 探索 99', pieceCount: 72, formula: '030010310000302010030330302200320103130332320100303130231101020002023320' },
  { id: 'explore-72-周期-19', name: '72 段 · 周期19', nameEn: '72-piece · 周期 19', pieceCount: 72, formula: '031111311113111131111311113111131111311113111131111311113111131111311113' },
  { id: 'explore-72-周期-20', name: '72 段 · 周期20', nameEn: '72-piece · 周期 20', pieceCount: 72, formula: '011311113111131111311113111131111311113111131111311113111131111311113111' },
  { id: 'explore-72-探索-100', name: '72 段 · 探索100', nameEn: '72-piece · 探索 100', pieceCount: 72, formula: '012131022022001332311030002310330310100031023310001333312120101000200102' },
  { id: 'explore-72-对称-14', name: '72 段 · 对称14', nameEn: '72-piece · 对称 14', pieceCount: 72, formula: '010120021000003310000200011023210030030012320110002000013300000120021010' },
  { id: 'explore-72-对称-15', name: '72 段 · 对称15', nameEn: '72-piece · 对称 15', pieceCount: 72, formula: '003000010010110011002000200211021021120120112002000200110011010010000300' },
  { id: 'explore-72-探索-101', name: '72 段 · 探索101', nameEn: '72-piece · 探索 101', pieceCount: 72, formula: '033130201003202203103101133203030201323332103201300211110001110200300212' },
  { id: 'explore-72-探索-102', name: '72 段 · 探索102', nameEn: '72-piece · 探索 102', pieceCount: 72, formula: '001003200102032111310301120100203201300002023321010013031300230000023310' },
  { id: 'explore-72-探索-103', name: '72 段 · 探索103', nameEn: '72-piece · 探索 103', pieceCount: 72, formula: '010231013310030220000303001120331111300002310003031133133001320002100130' },
  { id: 'explore-72-探索-104', name: '72 段 · 探索104', nameEn: '72-piece · 探索 104', pieceCount: 72, formula: '030230220001200013200200020020330010023130202332020001312001103100300023' },
  { id: 'explore-72-探索-105', name: '72 段 · 探索105', nameEn: '72-piece · 探索 105', pieceCount: 72, formula: '010013302003233000013320321001002301000000312010001102002011320101212000' },
  { id: 'explore-72-对称-16', name: '72 段 · 对称16', nameEn: '72-piece · 对称 16', pieceCount: 72, formula: '003302203011303300001000133120010000000010021331000100003303110302203300' },
  { id: 'explore-72-对称-17', name: '72 段 · 对称17', nameEn: '72-piece · 对称 17', pieceCount: 72, formula: '011011032012021302100200200301003233332300103002002001203120210230110110' },
  { id: 'explore-72-探索-106', name: '72 段 · 探索106', nameEn: '72-piece · 探索 106', pieceCount: 72, formula: '003020003313301002103001012010103302012030330313303001010302103303100023' },
  { id: 'explore-72-探索-107', name: '72 段 · 探索107', nameEn: '72-piece · 探索 107', pieceCount: 72, formula: '012023101302030102000331021003100033330033032030200233332103020203001300' },
  { id: 'explore-72-探索-108', name: '72 段 · 探索108', nameEn: '72-piece · 探索 108', pieceCount: 72, formula: '003301010320000201023030002102300311022003011011030301031030002100102031' },
  { id: 'explore-72-对称-18', name: '72 段 · 对称18', nameEn: '72-piece · 对称 18', pieceCount: 72, formula: '002130002331000030333003002030001301103100030200300333030000133200031200' },
  { id: 'explore-72-探索-109', name: '72 段 · 探索109', nameEn: '72-piece · 探索 109', pieceCount: 72, formula: '000003002113330303301010202120110320311213011333121210203323033301330221' },
  { id: 'explore-72-探索-110', name: '72 段 · 探索110', nameEn: '72-piece · 探索 110', pieceCount: 72, formula: '000303200010001200200331330130230303201001000220320230100010003003130101' },
  { id: 'explore-72-探索-111', name: '72 段 · 探索111', nameEn: '72-piece · 探索 111', pieceCount: 72, formula: '013011002320232011012030200110200010323130300003000003133003023011000023' },
  { id: 'explore-72-探索-112', name: '72 段 · 探索112', nameEn: '72-piece · 探索 112', pieceCount: 72, formula: '001201011031320210232030200003201012021210300020130202321010030331110000' },
  { id: 'explore-72-探索-113', name: '72 段 · 探索113', nameEn: '72-piece · 探索 113', pieceCount: 72, formula: '000033320112030313310201003031003023310030000000011020013202303310033110' },
  { id: 'explore-72-探索-114', name: '72 段 · 探索114', nameEn: '72-piece · 探索 114', pieceCount: 72, formula: '001233200002301033321001333021010010130300003000300320112032102000202000' },
  { id: 'explore-72-探索-115', name: '72 段 · 探索115', nameEn: '72-piece · 探索 115', pieceCount: 72, formula: '032113310100300030203300010132301002020003001010032102030031000132010030' },
  { id: 'explore-72-探索-116', name: '72 段 · 探索116', nameEn: '72-piece · 探索 116', pieceCount: 72, formula: '001110121000211001012123022010201000000100002003001031011301030031103030' },
  { id: 'explore-72-探索-117', name: '72 段 · 探索117', nameEn: '72-piece · 探索 117', pieceCount: 72, formula: '010330000200011303102000120000021000032010330123000103310012110031032000' },
  { id: 'explore-72-探索-118', name: '72 段 · 探索118', nameEn: '72-piece · 探索 118', pieceCount: 72, formula: '023203103000003200030020033002022011000200121002003030021301000031020002' },
  { id: 'explore-72-对称-19', name: '72 段 · 对称19', nameEn: '72-piece · 对称 19', pieceCount: 72, formula: '001212100031000100000002030310030110011030013030200000001000130001212100' },
  { id: 'explore-72-对称-20', name: '72 段 · 对称20', nameEn: '72-piece · 对称 20', pieceCount: 72, formula: '021003102100303211110023000220300021120003022000320011112303001201300120' },
  { id: 'explore-72-探索-119', name: '72 段 · 探索119', nameEn: '72-piece · 探索 119', pieceCount: 72, formula: '020310030100301201031202101330133103002032300220132302131001003301300003' },
  { id: 'explore-72-探索-120', name: '72 段 · 探索120', nameEn: '72-piece · 探索 120', pieceCount: 72, formula: '031003000200301000130200110210021001000030003200121033330332120232001110' },
  { id: 'explore-72-探索-121', name: '72 段 · 探索121', nameEn: '72-piece · 探索 121', pieceCount: 72, formula: '031200300302003101332000000303013102310131130110020021030000330303100210' },
  { id: 'explore-72-对称-21', name: '72 段 · 对称21', nameEn: '72-piece · 对称 21', pieceCount: 72, formula: '001020312000300011000310000201100113311001102000013000110003000213020100' },
  { id: 'explore-72-探索-122', name: '72 段 · 探索122', nameEn: '72-piece · 探索 122', pieceCount: 72, formula: '023010302300000332002123031000200023200233300100012323000220100200201230' },
  { id: 'explore-72-探索-123', name: '72 段 · 探索123', nameEn: '72-piece · 探索 123', pieceCount: 72, formula: '010300003003002012012011002202033311203102032003101310321120111310323021' },
  { id: 'explore-72-探索-124', name: '72 段 · 探索124', nameEn: '72-piece · 探索 124', pieceCount: 72, formula: '000313200300232300200000211020300112303000022020131033001103230013030103' },
  { id: 'explore-72-探索-125', name: '72 段 · 探索125', nameEn: '72-piece · 探索 125', pieceCount: 72, formula: '000112000323212000021001000001113102020100330213000020300200031301003120' },
  { id: 'explore-72-探索-126', name: '72 段 · 探索126', nameEn: '72-piece · 探索 126', pieceCount: 72, formula: '000000013003121032003100020331000000030100002332300201320132001000013331' },
  { id: 'explore-72-探索-127', name: '72 段 · 探索127', nameEn: '72-piece · 探索 127', pieceCount: 72, formula: '011023000220003200020010300210003031000001301033213022032100002001330100' },
  { id: 'explore-72-探索-128', name: '72 段 · 探索128', nameEn: '72-piece · 探索 128', pieceCount: 72, formula: '010312133200101023130220030120220300020320112000000232310100203010120222' },
  { id: 'explore-72-探索-129', name: '72 段 · 探索129', nameEn: '72-piece · 探索 129', pieceCount: 72, formula: '030121332332001000101010002302023020232010033300200100003000110012023103' }
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
