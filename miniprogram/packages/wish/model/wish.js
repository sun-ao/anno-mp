const STORAGE_KEY = 'wish:list'

const FORTUNES = [
  { level: '上上签', levelColor: '#C9971F', verse: '春风得意马蹄疾，一日看尽长安花', hint: '好事将近，所求皆如意' },
  { level: '上上签', levelColor: '#C9971F', verse: '山重水复疑无路，柳暗花明又一村', hint: '转机将至，柳暗花明' },
  { level: '上上签', levelColor: '#C9971F', verse: '长风破浪会有时，直挂云帆济沧海', hint: '乘风破浪，前程似锦' },
  { level: '上上签', levelColor: '#C9971F', verse: '海阔凭鱼跃，天高任鸟飞', hint: '大有可为，任你施展' },
  { level: '上上签', levelColor: '#C9971F', verse: '春种一粒粟，秋收万颗子', hint: '付出必有回报' },
  { level: '上上签', levelColor: '#C9971F', verse: '身无彩凤双飞翼，心有灵犀一点通', hint: '心意相通，所求必应' },
  { level: '上签', levelColor: '#D9881F', verse: '行到水穷处，坐看云起时', hint: '顺其自然，自有安排' },
  { level: '上签', levelColor: '#D9881F', verse: '莫愁前路无知己，天下谁人不识君', hint: '贵人相助，广结善缘' },
  { level: '上签', levelColor: '#D9881F', verse: '不畏浮云遮望眼，自缘身在最高层', hint: '目光长远，终得胜果' },
  { level: '上签', levelColor: '#D9881F', verse: '沉舟侧畔千帆过，病树前头万木春', hint: '旧去新来，生机勃勃' },
  { level: '上签', levelColor: '#D9881F', verse: '千淘万漉虽辛苦，吹尽狂沙始到金', hint: '苦尽甘来，金石为开' },
  { level: '上签', levelColor: '#D9881F', verse: '旧时王谢堂前燕，飞入寻常百姓家', hint: '时来运转，好福自来' },
  { level: '中吉', levelColor: '#7F8C8D', verse: '纸上得来终觉浅，绝知此事要躬行', hint: '脚踏实地，方得始终' },
  { level: '中吉', levelColor: '#7F8C8D', verse: '路漫漫其修远兮，吾将上下而求索', hint: '循序渐进，持之以恒' },
  { level: '中吉', levelColor: '#7F8C8D', verse: '会当凌绝顶，一览众山小', hint: '志存高远，步步登高' },
  { level: '中吉', levelColor: '#7F8C8D', verse: '及时当勉励，岁月不待人', hint: '把握当下，即刻行动' },
  { level: '中吉', levelColor: '#7F8C8D', verse: '宝剑锋从磨砺出，梅花香自苦寒来', hint: '磨砺之后，方见芬芳' },
  { level: '中吉', levelColor: '#7F8C8D', verse: '精诚所至，金石为开', hint: '心诚则灵，坚持所愿' }
]

function getWishes() {
  const v = wx.getStorageSync(STORAGE_KEY)
  return Array.isArray(v) ? v : []
}

function addWish(text, fortune) {
  const list = getWishes()
  const wish = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    text,
    ts: Date.now(),
    level: fortune.level,
    levelColor: fortune.levelColor,
    verse: fortune.verse,
    hint: fortune.hint
  }
  list.unshift(wish)
  wx.setStorageSync(STORAGE_KEY, list)
  return wish
}

function deleteWish(id) {
  const list = getWishes().filter((w) => w.id !== id)
  wx.setStorageSync(STORAGE_KEY, list)
  return list
}

function clearWishes() {
  wx.setStorageSync(STORAGE_KEY, [])
}

function drawFortune() {
  return FORTUNES[Math.floor(Math.random() * FORTUNES.length)]
}

function formatDate(ts) {
  const d = new Date(ts)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

module.exports = { FORTUNES, getWishes, addWish, deleteWish, clearWishes, drawFortune, formatDate }
