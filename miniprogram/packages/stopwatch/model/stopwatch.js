// 计时器：多组短跑成绩（本地存储，无后端）
// 列表 CRUD 已收敛到 utils/count-store 的 createListStore（与 snap/lots 同构），此处只留领域命名。
const KEY = 'stopwatch:sessions'
const { createListStore } = require('../../../utils/count-store')

const store = createListStore(KEY)

const getSessions = store.get

// session: { id, title, date:'YYYY-MM-DD', laps:[{i,totalMs,splitMs}], bestMs, count, createdAt }
const addSession = (session) => store.add(session)
const deleteSession = store.remove
const clearSessions = store.clear

// 毫秒 -> MM:SS.mmm
function formatMs(ms) {
  const total = Math.max(0, Math.floor(ms))
  const m = Math.floor(total / 60000)
  const s = Math.floor((total % 60000) / 1000)
  const mm = total % 1000
  const ms3 = mm < 10 ? '00' + mm : (mm < 100 ? '0' + mm : '' + mm)
  return (m < 10 ? '0' + m : '' + m) + ':' + (s < 10 ? '0' + s : '' + s) + '.' + ms3
}

module.exports = { KEY, getSessions, addSession, deleteSession, clearSessions, formatMs }
