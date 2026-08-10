const OPTIONS_KEY = 'lots:options'
const HISTORY_KEY = 'lots:history'
const HISTORY_LIMIT = 20
const OPTIONS_LIMIT = 50

function getOptions() {
  const v = wx.getStorageSync(OPTIONS_KEY)
  return Array.isArray(v) ? v : []
}

// 返回：新列表 | 'duplicate' 重复 | 'full' 数量上限 | null 空文本
function addOption(text) {
  const t = String(text || '').trim()
  if (!t) return null
  const list = getOptions()
  if (list.some((o) => o.text === t)) return 'duplicate'
  if (list.length >= OPTIONS_LIMIT) return 'full'
  list.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), text: t })
  wx.setStorageSync(OPTIONS_KEY, list)
  return list
}

function deleteOption(id) {
  const list = getOptions().filter((o) => o.id !== id)
  wx.setStorageSync(OPTIONS_KEY, list)
  return list
}

function clearOptions() {
  wx.setStorageSync(OPTIONS_KEY, [])
  return []
}

// 随机抽取一个选项并写入历史，无选项时返回 null
function drawOne() {
  const list = getOptions()
  if (list.length === 0) return null
  const picked = list[Math.floor(Math.random() * list.length)]
  const history = getHistory()
  history.unshift({ ts: Date.now(), text: picked.text })
  wx.setStorageSync(HISTORY_KEY, history.slice(0, HISTORY_LIMIT))
  return picked
}

function getHistory() {
  const v = wx.getStorageSync(HISTORY_KEY)
  return Array.isArray(v) ? v : []
}

function clearHistory() {
  wx.setStorageSync(HISTORY_KEY, [])
  return []
}

function formatDate(ts) {
  const d = new Date(ts)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

module.exports = {
  getOptions,
  addOption,
  deleteOption,
  clearOptions,
  drawOne,
  getHistory,
  clearHistory,
  formatDate,
  OPTIONS_LIMIT
}
