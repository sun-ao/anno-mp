// 计时器：多组短跑成绩（本地存储，无后端）
const KEY = 'stopwatch:sessions'

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

function getSessions() {
  return wx.getStorageSync(KEY) || []
}

// session: { id, title, date:'YYYY-MM-DD', laps:[{i,totalMs,splitMs}], bestMs, count, createdAt }
function addSession(session) {
  const list = getSessions()
  const item = Object.assign({ id: genId(), createdAt: Date.now() }, session)
  list.unshift(item)
  wx.setStorageSync(KEY, list)
  return item
}

function deleteSession(id) {
  const list = getSessions().filter(s => s.id !== id)
  wx.setStorageSync(KEY, list)
  return list
}

function clearSessions() {
  wx.setStorageSync(KEY, [])
  return []
}

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
