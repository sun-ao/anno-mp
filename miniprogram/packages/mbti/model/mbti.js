const HISTORY_KEY = 'mbti:history'
const HISTORY_LIMIT = 10

// 28 题：每维度 7 题，A 对应维度首字母端，B 对应第二字母端
const QUESTIONS = [
  // EI（A=外向 E，B=内向 I）
  { dim: 'EI', text: '聚会结束后，你通常感到', a: '精力充沛，还想继续聊', b: '有点疲惫，想独处休息' },
  { dim: 'EI', text: '交新朋友时，你更倾向于', a: '主动搭话，快速熟络', b: '观察熟悉后，再慢慢靠近' },
  { dim: 'EI', text: '遇到问题时，你更愿意', a: '说出来，边聊边理思路', b: '先自己想明白，再告诉别人' },
  { dim: 'EI', text: '休息日你更喜欢', a: '约朋友出门热闹', b: '在家安静待着' },
  { dim: 'EI', text: '在团队里你通常', a: '主动发言带动气氛', b: '倾听为主，必要时才说' },
  { dim: 'EI', text: '陌生人多的场合，你', a: '很快融入，如鱼得水', b: '需要时间适应，略显拘谨' },
  { dim: 'EI', text: '手机消息更多来自', a: '各种群聊和朋友互动', b: '少数亲密好友的私聊' },
  // SN（A=实感 S，B=直觉 N）
  { dim: 'SN', text: '做事时你更关注', a: '具体的细节和步骤', b: '整体方向与可能性' },
  { dim: 'SN', text: '看事物你更相信', a: '亲眼所见的事实经验', b: '直觉判断与联想' },
  { dim: 'SN', text: '学习新东西时你喜欢', a: '按部就班扎实掌握', b: '先了解原理再自由发挥' },
  { dim: 'SN', text: '描述事情时你更常', a: '讲事实经过', b: '讲感受联想' },
  { dim: 'SN', text: '规划未来时你更倾向', a: '基于现实条件安排', b: '大胆想象各种可能' },
  { dim: 'SN', text: '对你来说，更有吸引力的是', a: '实际有用的事物', b: '新奇有趣的想法' },
  { dim: 'SN', text: '做决定时你更依赖', a: '过往经验与数据', b: '灵感与预判' },
  // TF（A=思考 T，B=情感 F）
  { dim: 'TF', text: '朋友倾诉烦恼时，你更常', a: '帮他分析问题找办法', b: '先安慰情绪再说' },
  { dim: 'TF', text: '做决策时你更看重', a: '逻辑与公正', b: '感受与和谐' },
  { dim: 'TF', text: '别人批评你时，你会', a: '先看是否说得有理', b: '先感到受伤难受' },
  { dim: 'TF', text: '你更敬佩什么样的人', a: '能力强，理性果断', b: '善良温暖，体贴周到' },
  { dim: 'TF', text: '团队有分歧时，你倾向', a: '摆事实讲道理', b: '照顾大家情绪' },
  { dim: 'TF', text: '看电影时你更在意', a: '剧情逻辑是否严谨', b: '情感是否打动人心' },
  { dim: 'TF', text: '你更希望别人评价你', a: '聪明有头脑', b: '温柔好相处' },
  // JP（A=判断 J，B=知觉 P）
  { dim: 'JP', text: '出发旅行前，你通常', a: '做好详细攻略', b: '走一步看一步' },
  { dim: 'JP', text: '你的桌面或房间通常是', a: '整洁有序', b: '随性堆放' },
  { dim: 'JP', text: '面对计划变化，你', a: '不太舒服，希望按计划来', b: '乐于随机应变' },
  { dim: 'JP', text: '交任务你更喜欢', a: '提前完成留余量', b: '截止前冲刺完成' },
  { dim: 'JP', text: '做决定时你通常', a: '尽快拍板不再纠结', b: '保留选项慢慢看' },
  { dim: 'JP', text: '你的生活状态更接近', a: '规律作息按部就班', b: '弹性自由随心' },
  { dim: 'JP', text: '打开新应用，你习惯', a: '先看完说明再使用', b: '直接上手摸索' }
]

// 16 型人格
const TYPES = {
  INTJ: { name: '建筑师', desc: '独立理性，善于长远规划，为实现目标不断精进', traits: '远见 · 理性 · 独立' },
  INTP: { name: '逻辑学家', desc: '热爱思考与探索原理，喜欢独自钻研深奥问题', traits: '好奇 · 分析 · 思辨' },
  ENTJ: { name: '指挥官', desc: '天生的领导者，目标明确，果断高效地推进一切', traits: '果决 · 领导 · 高效' },
  ENTP: { name: '辩论家', desc: '思维敏捷，喜欢挑战常规，新奇点子层出不穷', traits: '机智 · 创新 · 健谈' },
  INFJ: { name: '提倡者', desc: '安静而坚定，有深度的理想主义者，心怀远大信念', traits: '洞察 · 理想 · 共情' },
  INFP: { name: '调停者', desc: '温柔敏感，忠于内心价值观与理想，富有创造力', traits: '理想 · 温和 · 创造' },
  ENFJ: { name: '主人公', desc: '富有感染力，热心帮助他人成长，天生领袖气质', traits: '热情 · 感召 · 利他' },
  ENFP: { name: '竞选者', desc: '热情开朗，充满好奇心与创造力，永远元气满满', traits: '热情 · 好奇 · 自由' },
  ISTJ: { name: '物流师', desc: '严谨负责，值得信赖，习惯按计划把事做到位', traits: '可靠 · 自律 · 务实' },
  ISFJ: { name: '守卫者', desc: '细心体贴，默默守护身边人，是可靠的守护者', traits: '体贴 · 尽责 · 稳重' },
  ESTJ: { name: '总经理', desc: '务实高效，天生的组织管理者，重视秩序与执行', traits: '务实 · 组织 · 果断' },
  ESFJ: { name: '执政官', desc: '热心周到，重视和谐与人际关系，乐于助人', traits: '热心 · 周到 · 和谐' },
  ISTP: { name: '鉴赏家', desc: '冷静灵活，动手能力强，喜欢亲手探索世界', traits: '冷静 · 灵活 · 动手' },
  ISFP: { name: '探险家', desc: '随性温和，善于发现和欣赏生活中的美好', traits: '随性 · 敏感 · 审美' },
  ESTP: { name: '企业家', desc: '精力充沛，敢于冒险，享受当下每一刻', traits: '冒险 · 敏捷 · 务实' },
  ESFP: { name: '表演者', desc: '热情外向，享受当下，天生的氛围担当', traits: '热情 · 乐观 · 表现' }
}

function computeResult(answers) {
  const scores = { EI: [0, 0], SN: [0, 0], TF: [0, 0], JP: [0, 0] }
  answers.forEach((choice, i) => {
    const q = QUESTIONS[i]
    if (!q) return
    scores[q.dim][choice === 'a' ? 0 : 1] += 1
  })
  let type = ''
  const percents = Object.keys(scores).map((dim) => {
    const [a, b] = scores[dim]
    const leftPct = Math.round((a / (a + b)) * 100)
    const leftKey = dim[0]
    const rightKey = dim[1]
    type += leftPct >= 50 ? leftKey : rightKey
    return { dim, leftKey, rightKey, leftPct, rightPct: 100 - leftPct }
  })
  const info = TYPES[type] || TYPES.INFP
  return { type, name: info.name, desc: info.desc, traits: info.traits, percents }
}

function getTypeInfo(type) {
  return TYPES[type] || null
}

function getHistory() {
  const v = wx.getStorageSync(HISTORY_KEY)
  return Array.isArray(v) ? v : []
}

function addHistory(result) {
  const list = getHistory()
  list.unshift({ ts: Date.now(), type: result.type, name: result.name, desc: result.desc, traits: result.traits, percents: result.percents })
  const trimmed = list.slice(0, HISTORY_LIMIT)
  wx.setStorageSync(HISTORY_KEY, trimmed)
  return trimmed
}

function getLatest() {
  const list = getHistory()
  return list.length > 0 ? list[0] : null
}

function removeHistory(ts) {
  const list = getHistory().filter((h) => h.ts !== ts)
  wx.setStorageSync(HISTORY_KEY, list)
  return list
}

function clearHistory() {
  wx.setStorageSync(HISTORY_KEY, [])
}

function formatDate(ts) {
  const d = new Date(ts)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

module.exports = { QUESTIONS, TYPES, computeResult, getTypeInfo, getHistory, addHistory, getLatest, removeHistory, clearHistory, formatDate }
