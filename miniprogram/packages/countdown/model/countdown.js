/**
 * 倒计时数据模型
 * 事件存储在 wx.storage，键名 'countdown:events'
 * targetTs：目标时间戳（毫秒）
 */

// ID 生成与日期格式化统一走主包共享模块（原先各自内联复制）
import { genId } from '../../../utils/id'
import { pad2, addDays, dateTimeStrToTs, tsToDate as tsToDateShared, tsToTime as tsToTimeShared } from '../../../utils/date'

const STORAGE_KEY = 'countdown:events'

/** 读取全部事件（按目标时间升序，带类型兜底） */
export function getEvents() {
  const v = wx.getStorageSync(STORAGE_KEY)
  const events = Array.isArray(v) ? v : []
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
  event.id = genId()
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
  return dateTimeStrToTs(dateStr, timeStr)
}

/** 剩余毫秒（已过期返回负数） */
export function getRemainingMs(targetTs) {
  return targetTs - Date.now()
}

/** 格式化剩余时间 */
export function formatRemaining(ms) {
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
      text: `${days}天 ${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`,
      expired: false
    }
  }
  return {
    text: `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`,
    expired: false
  }
}

/** 时间戳 → 'YYYY-MM-DD' */
export function tsToDate(ts) {
  return tsToDateShared(ts)
}

/** 时间戳 → 'HH:mm' */
export function tsToTime(ts) {
  return tsToTimeShared(ts)
}

/** 获取明天的日期 'YYYY-MM-DD' */
export function getTomorrow() {
  return addDays(1)
}
