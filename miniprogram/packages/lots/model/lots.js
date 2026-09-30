// 大转盘：选项与抽取历史的本地存储（无后端）
// 读取/写入/删除收敛到 utils/count-store 的 createListStore，抽取等业务逻辑保留在此。
const OPTIONS_KEY = 'lots:options'
const HISTORY_KEY = 'lots:history'
const HISTORY_LIMIT = 20
const OPTIONS_LIMIT = 50
const { createListStore } = require('../../../utils/count-store')
const { genId } = require('../../../utils/id')

const optionsStore = createListStore(OPTIONS_KEY)
const historyStore = createListStore(HISTORY_KEY)

const getOptions = optionsStore.get

// 返回：新列表 | 'duplicate' 重复 | 'full' 数量上限 | null 空文本
function addOption(text) {
  const t = String(text || '').trim()
  if (!t) return null
  const list = getOptions()
  if (list.some((o) => o.text === t)) return 'duplicate'
  if (list.length >= OPTIONS_LIMIT) return 'full'
  list.push({ id: genId(), text: t })
  optionsStore.set(list)
  return list
}

const deleteOption = optionsStore.remove
const clearOptions = optionsStore.clear

// 随机抽取一个选项并写入历史，无选项时返回 null
function drawOne() {
  const list = getOptions()
  if (list.length === 0) return null
  const picked = list[Math.floor(Math.random() * list.length)]
  const history = historyStore.get()
  history.unshift({ ts: Date.now(), text: picked.text })
  historyStore.set(history.slice(0, HISTORY_LIMIT))
  return picked
}

const getHistory = historyStore.get
const clearHistory = historyStore.clear

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
