const STATS_KEY = 'tomato:stats'
const CONFIG_KEY = 'tomato:config'

function todayKey() {
  const d = new Date()
  const m = d.getMonth() + 1
  const day = d.getDate()
  return `${d.getFullYear()}-${m < 10 ? '0' + m : m}-${day < 10 ? '0' + day : day}`
}

function getStats() {
  const v = wx.getStorageSync(STATS_KEY)
  const t = todayKey()
  if (v && v.date === t && typeof v.count === 'number') {
    return { date: v.date, count: v.count, minutes: v.minutes || 0 }
  }
  return { date: t, count: 0, minutes: 0 }
}

function addFocusSession(minutes) {
  const s = getStats()
  s.count += 1
  s.minutes += minutes
  wx.setStorageSync(STATS_KEY, s)
  return s
}

function getConfig() {
  const v = wx.getStorageSync(CONFIG_KEY)
  if (v && v.focusMin && v.restMin) {
    return { focusMin: v.focusMin, restMin: v.restMin }
  }
  return { focusMin: 25, restMin: 5 }
}

function saveConfig(config) {
  wx.setStorageSync(CONFIG_KEY, config)
}

module.exports = { getStats, addFocusSession, getConfig, saveConfig }
