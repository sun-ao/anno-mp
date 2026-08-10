/**
 * 打卡数据模型
 * 打卡项存储在 wx.storage，键名 'checkin:habits'
 * 打卡记录存储在 'checkin:records'，格式 { [habitId]: ['YYYY-MM-DD', ...] }
 */

const HABITS_KEY = 'checkin:habits'
const RECORDS_KEY = 'checkin:records'

/** 本地日期 'YYYY-MM-DD' */
function formatDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 今天 'YYYY-MM-DD' */
export function getTodayStr() {
  return formatDate(new Date())
}

/** 获取 N 天后的日期 'YYYY-MM-DD' */
export function getDaysLater(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return formatDate(d)
}

// ==================== 打卡项 CRUD ====================

/** 读取全部打卡项 */
export function getHabits() {
  return wx.getStorageSync(HABITS_KEY) || []
}

/** 保存全部打卡项 */
function saveHabits(habits) {
  wx.setStorageSync(HABITS_KEY, habits)
}

/** 按 id 查找打卡项 */
export function getHabitById(id) {
  if (!id) return null
  return getHabits().find(h => h.id === id) || null
}

/** 新增打卡项 */
export function addHabit(habit) {
  const habits = getHabits()
  habit.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  habit.createdAt = Date.now()
  habits.push(habit)
  saveHabits(habits)
  return habit
}

/** 更新打卡项 */
export function updateHabit(habit) {
  const habits = getHabits()
  const idx = habits.findIndex(h => h.id === habit.id)
  if (idx >= 0) {
    habits[idx] = habit
    saveHabits(habits)
  }
}

/** 删除打卡项（连带删除打卡记录） */
export function deleteHabit(id) {
  const habits = getHabits()
  saveHabits(habits.filter(h => h.id !== id))
  const records = wx.getStorageSync(RECORDS_KEY) || {}
  delete records[id]
  wx.setStorageSync(RECORDS_KEY, records)
}

/** 'YYYY-MM-DD' → 当天 00:00 时间戳 */
export function dateStrToTs(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).getTime()
}

/** 距截止剩余天数（当天为 0，已过为负数） */
export function getDaysLeft(deadlineTs) {
  const deadline = new Date(deadlineTs)
  const deadlineDay = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate()).getTime()
  const today = dateStrToTs(getTodayStr())
  return Math.round((deadlineDay - today) / 86400000)
}

// ==================== 打卡记录 ====================

/** 读取某打卡项的全部打卡日期 */
export function getRecordDates(habitId) {
  const records = wx.getStorageSync(RECORDS_KEY) || {}
  return records[habitId] || []
}

/** 今天是否已打卡 */
export function isCheckedToday(habitId) {
  return getRecordDates(habitId).includes(getTodayStr())
}

/** 今日打卡（每天一次，重复打卡返回 false） */
export function checkIn(habitId) {
  const today = getTodayStr()
  const records = wx.getStorageSync(RECORDS_KEY) || {}
  const dates = records[habitId] || []
  if (dates.includes(today)) return false
  dates.push(today)
  records[habitId] = dates
  wx.setStorageSync(RECORDS_KEY, records)
  return true
}

/** 连续打卡天数（今天没打则从昨天往前数，昨天也没打则为 0） */
export function getStreak(habitId) {
  const dates = getRecordDates(habitId)
  if (!dates.length) return 0
  const set = new Set(dates)
  let streak = 0
  const d = new Date()
  if (!set.has(formatDate(d))) {
    // 今天还没打卡：从昨天开始连续
    d.setDate(d.getDate() - 1)
  }
  while (set.has(formatDate(d))) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

/** 累计打卡天数 */
export function getTotalDays(habitId) {
  return getRecordDates(habitId).length
}
