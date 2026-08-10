/**
 * 倒计时数据模型
 * 事件存储在 wx.storage，键名 'countdown:events'
 * targetTs：目标时间戳（毫秒）
 */

const STORAGE_KEY = 'countdown:events'

/** 读取全部事件（按目标时间升序） */
export function getEvents() {
  const events = wx.getStorageSync(STORAGE_KEY) || []
  return events.sort((a, b) => a.targetTs - b.targetTs)
}

/** 保存全部事件 */
function saveEvents(events) {
  wx.setStorageSync(STORAGE_KEY, events)
}

/** 按 id 查找事件 */
export function getEventById(id) {
  if (!id) return null
  return getEvents().find(e => e.id === id) || null
}

/** 新增事件 */
export function addEvent(event) {
  const events = wx.getStorageSync(STORAGE_KEY) || []
  event.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  event.createdAt = Date.now()
  events.push(event)
  saveEvents(events)
  return event
}

/** 更新事件 */
export function updateEvent(event) {
  const events = wx.getStorageSync(STORAGE_KEY) || []
  const idx = events.findIndex(e => e.id === event.id)
  if (idx >= 0) {
    events[idx] = event
    saveEvents(events)
  }
}

/** 删除事件 */
export function deleteEvent(id) {
  const events = wx.getStorageSync(STORAGE_KEY) || []
  saveEvents(events.filter(e => e.id !== id))
}

/** 'YYYY-MM-DD' + 'HH:mm' → 时间戳（毫秒） */
export function buildTargetTs(dateStr, timeStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const [hh, mm] = (timeStr || '00:00').split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm, 0).getTime()
}

/** 剩余毫秒（已过期返回负数） */
export function getRemainingMs(targetTs) {
  return targetTs - Date.now()
}

/** 格式化剩余时间 */
export function formatRemaining(ms) {
  const pad = n => String(n).padStart(2, '0')
  if (ms <= 0) {
    return { text: '00:00:00', expired: true }
  }
  const totalSec = Math.floor(ms / 1000)
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60
  if (days > 0) {
    return {
      text: `${days}天 ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
      expired: false
    }
  }
  return {
    text: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
    expired: false
  }
}

/** 时间戳 → 'YYYY-MM-DD' */
export function tsToDate(ts) {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 时间戳 → 'HH:mm' */
export function tsToTime(ts) {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

/** 获取明天的日期 'YYYY-MM-DD' */
export function getTomorrow() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
