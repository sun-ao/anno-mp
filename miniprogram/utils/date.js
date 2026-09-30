// 项目统一日期/时间格式化。原先散落在 checkin / countdown / ledger 等 model
// 与页面里（formatDate / pad / tsToDate / tsToTime 各自复制），收敛于此。
// 全部按本地时区处理；'YYYY-MM-DD' 与 'HH:mm' 均补零。

function pad2(n) {
  return String(n).padStart(2, '0')
}

/** Date → 'YYYY-MM-DD'（本地时区） */
function formatDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** 时间戳 → 'YYYY-MM-DD' */
function tsToDate(ts) {
  return formatDate(new Date(ts))
}

/** 时间戳 → 'HH:mm' */
function tsToTime(ts) {
  const d = new Date(ts)
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/** 今天 ± N 天 'YYYY-MM-DD'（N=0 即今天） */
function addDays(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return formatDate(d)
}

/** 'YYYY-MM-DD' → 当天 00:00 时间戳 */
function dateStrToTs(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).getTime()
}

/** 'YYYY-MM-DD' + 'HH:mm' → 时间戳 */
function dateTimeStrToTs(dateStr, timeStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const [hh, mm] = (timeStr || '00:00').split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm, 0).getTime()
}

module.exports = { pad2, formatDate, tsToDate, tsToTime, addDays, dateStrToTs, dateTimeStrToTs }
