/**
 * 记账数据模型
 * 账单存储在 wx.storage，键名 'ledger:bills'
 * amount 单位：元（浮点），显示时 toFixed(2)
 */

import { reverseBalance, adjustBalance, getWalletById } from './wallet'

export const STORAGE_KEY = 'ledger:bills'

/** 自定义分类存储键 */
const CUSTOM_CAT_KEY = 'ledger:customCategories'

/** 已隐藏的预设分类存储键 */
const HIDDEN_CAT_KEY = 'ledger:hiddenCategories'

/** 支出分类 */
export const EXPENSE_CATEGORIES = [
  { key: 'food',      name: '餐饮', icon: '餐', color: '#E24B4A' },
  { key: 'transport', name: '交通', icon: '行', color: '#378ADD' },
  { key: 'shopping',  name: '购物', icon: '购', color: '#BA7517' },
  { key: 'daily',     name: '日用', icon: '用', color: '#5F5E5A' },
  { key: 'fruit',     name: '水果', icon: '果', color: '#0F6E56' },
  { key: 'snack',     name: '零食', icon: '零', color: '#D4537E' },
  { key: 'fun',       name: '娱乐', icon: '玩', color: '#7F77DD' },
  { key: 'medical',   name: '医疗', icon: '医', color: '#E24B4A' },
  { key: 'house',     name: '住房', icon: '房', color: '#185FA5' },
  { key: 'phone',     name: '通讯', icon: '讯', color: '#378ADD' },
  { key: 'other_e',   name: '其他', icon: '他', color: '#888780' }
]

/** 收入分类 */
export const INCOME_CATEGORIES = [
  { key: 'salary',   name: '工资', icon: '资', color: '#0F6E56' },
  { key: 'parttime', name: '兼职', icon: '兼', color: '#378ADD' },
  { key: 'redpacket',name: '红包', icon: '包', color: '#D4537E' },
  { key: 'invest',   name: '理财', icon: '理', color: '#BA7517' },
  { key: 'other_i',  name: '其他', icon: '他', color: '#888780' }
]

/** 可选颜色 */
export const CATEGORY_COLORS = [
  '#E24B4A', '#FF6B35', '#BA7517', '#D4A017',
  '#0F6E56', '#2D9F6F', '#378ADD', '#185FA5',
  '#7F77DD', '#9B59B6', '#D4537E', '#E91E63',
  '#5F5E5A', '#888780', '#34495E', '#16A085'
]

/** 读取自定义分类 */
export function getCustomCategories(type) {
  const all = wx.getStorageSync(CUSTOM_CAT_KEY) || []
  return all.filter(c => c.type === type)
}

/** 保存全部自定义分类 */
function saveCustomCategories(cats) {
  wx.setStorageSync(CUSTOM_CAT_KEY, cats)
}

/** 新增自定义分类 */
export function addCustomCategory(type, name, color) {
  const cats = wx.getStorageSync(CUSTOM_CAT_KEY) || []
  const cat = {
    key: 'custom_' + Date.now().toString(36),
    type,
    name,
    icon: name.charAt(0),
    color: color || CATEGORY_COLORS[0]
  }
  cats.push(cat)
  saveCustomCategories(cats)
  return cat
}

/** 删除自定义分类 */
export function deleteCustomCategory(key) {
  const cats = wx.getStorageSync(CUSTOM_CAT_KEY) || []
  saveCustomCategories(cats.filter(c => c.key !== key))
}

/** 隐藏预设分类 */
export function hidePresetCategory(key) {
  const hidden = wx.getStorageSync(HIDDEN_CAT_KEY) || []
  if (!hidden.includes(key)) {
    hidden.push(key)
    wx.setStorageSync(HIDDEN_CAT_KEY, hidden)
  }
}

/** 恢复所有隐藏的预设分类 */
export function restoreAllPresetCategories() {
  wx.setStorageSync(HIDDEN_CAT_KEY, [])
}

/** 通用删除分类（自动区分预设/自定义） */
export function deleteCategory(type, key) {
  if (key.startsWith('custom_')) {
    deleteCustomCategory(key)
  } else {
    hidePresetCategory(key)
  }
}

/** 获取分类列表（预设 - 已隐藏 + 自定义） */
export function getCategories(type) {
  const hidden = wx.getStorageSync(HIDDEN_CAT_KEY) || []
  const presets = (type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)
    .filter(c => !hidden.includes(c.key))
  const customs = getCustomCategories(type)
  return [...presets, ...customs]
}

export function findCategory(type, key) {
  return getCategories(type).find(c => c.key === key) || EXPENSE_CATEGORIES[10]
}

/** 读取全部账单（按时间倒序） */
export function getBills() {
  const bills = wx.getStorageSync(STORAGE_KEY) || []
  return bills.sort((a, b) => b.createdAt - a.createdAt)
}

/** 保存全部账单 */
function saveBills(bills) {
  wx.setStorageSync(STORAGE_KEY, bills)
}

/** 新增账单（同时调整关联账户余额） */
export function addBill(bill) {
  const bills = wx.getStorageSync(STORAGE_KEY) || []
  bill.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  bill.createdAt = Date.now()
  bills.push(bill)
  saveBills(bills)
  // 调整账户余额
  if (bill.walletId) {
    adjustBalance(bill.walletId, bill.type, bill.amount)
  }
  return bill
}

/** 更新账单 */
export function updateBill(bill) {
  const bills = wx.getStorageSync(STORAGE_KEY) || []
  const idx = bills.findIndex(b => b.id === bill.id)
  if (idx >= 0) {
    bills[idx] = bill
    saveBills(bills)
  }
}

/**
 * 更新账单并处理余额转移
 * @param {object} oldBill  修改前的账单对象（从 storage 读出）
 * @param {object} newBill  修改后的账单对象
 */
export function updateBillWithBalance(oldBill, newBill) {
  // 先回滚旧账单的余额影响
  if (oldBill.walletId) {
    reverseBalance(oldBill.walletId, oldBill.type, oldBill.amount)
  }
  // 更新账单
  updateBill(newBill)
  // 再按新账单扣减余额
  if (newBill.walletId) {
    adjustBalance(newBill.walletId, newBill.type, newBill.amount)
  }
}

/** 删除账单（同时回滚关联账户余额） */
export function deleteBill(id) {
  const bills = wx.getStorageSync(STORAGE_KEY) || []
  const bill = bills.find(b => b.id === id)
  if (bill && bill.walletId) {
    reverseBalance(bill.walletId, bill.type, bill.amount)
  }
  const filtered = bills.filter(b => b.id !== id)
  saveBills(filtered)
}

/** 获取指定账单 */
export function getBillById(id) {
  const bills = wx.getStorageSync(STORAGE_KEY) || []
  return bills.find(b => b.id === id)
}

/** 获取某月账单 */
export function getBillsByMonth(monthStr) {
  // monthStr 格式 'YYYY-MM'
  return getBills().filter(b => b.date && b.date.startsWith(monthStr))
}

/** 获取某年账单（year 为数字或字符串，如 2026） */
export function getBillsByYear(year) {
  const prefix = String(year)
  return getBills().filter(b => b.date && b.date.startsWith(prefix))
}

/** 获取日期区间内的账单（含起止；date 为 'YYYY-MM-DD'，字符串比较即可） */
export function getBillsByRange(start, end) {
  const s = start || '1970-01-01'
  const e = end || '2999-12-31'
  return getBills().filter(b => b.date && b.date >= s && b.date <= e)
}

/** 按分类聚合（type: 'expense' | 'income'），返回带元数据的排行与合计 */
export function getCategoryBreakdown(bills, type) {
  const map = {}
  let total = 0
  for (const b of bills) {
    if (b.type !== type) continue
    const amt = Number(b.amount) || 0
    if (amt <= 0) continue
    map[b.category] = (map[b.category] || 0) + amt
    total += amt
  }
  const list = Object.keys(map).map(key => {
    const cat = findCategory(type, key)
    return {
      key,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      amount: map[key],
      amountText: formatAmount(map[key]),
      percent: total > 0 ? Math.round((map[key] / total) * 100) : 0
    }
  })
  list.sort((a, b) => b.amount - a.amount)
  return { list, total, totalText: formatAmount(total) }
}

/** 某年 12 个月的 income/expense 合计（用于年度月度趋势） */
export function getYearMonthTrend(year) {
  const yearPrefix = String(year)
  const bills = getBills().filter(b => b.date && b.date.startsWith(yearPrefix))
  const months = []
  let maxExpense = 0
  for (let m = 1; m <= 12; m++) {
    const ms = `${yearPrefix}-${String(m).padStart(2, '0')}`
    const sum = getMonthSummary(bills.filter(b => b.date.startsWith(ms)))
    maxExpense = Math.max(maxExpense, sum.expense)
    months.push({
      month: m,
      monthLabel: `${m}月`,
      incomeText: sum.incomeText,
      expenseText: sum.expenseText,
      expense: sum.expense
    })
  }
  months.forEach(it => {
    it.barWidth = maxExpense > 0 ? Math.round((it.expense / maxExpense) * 100) : 0
  })
  return months
}

/** 金额格式化 */
export function formatAmount(amount) {
  return Number(amount || 0).toFixed(2)
}

/** 计算月度汇总 */
export function getMonthSummary(bills) {
  let income = 0
  let expense = 0
  for (const b of bills) {
    const amt = Number(b.amount) || 0
    if (b.type === 'income') income += amt
    else expense += amt
  }
  return {
    income,
    expense,
    balance: income - expense,
    incomeText: formatAmount(income),
    expenseText: formatAmount(expense),
    balanceText: formatAmount(income - expense)
  }
}

/** 按日期分组（同一天的多合并为一组） */
export function groupByDate(bills) {
  const map = {}
  for (const b of bills) {
    const date = b.date
    if (!map[date]) map[date] = []
    map[date].push(b)
  }
  const dates = Object.keys(map).sort((a, b) => b.localeCompare(a))
  return dates.map(date => {
    const dayBills = map[date]
    let dayExpense = 0
    const enriched = dayBills.map(b => {
      const cat = findCategory(b.type, b.category)
      if (b.type !== 'income') dayExpense += Number(b.amount) || 0
      const wallet = getWalletById(b.walletId)
      return {
        ...b,
        categoryName: cat.name,
        categoryIcon: cat.icon,
        categoryColor: cat.color,
        amountText: formatAmount(b.amount),
        walletName: wallet ? wallet.name : '',
        walletIcon: wallet ? wallet.icon : '',
        walletColor: wallet ? wallet.color : ''
      }
    })
    return {
      date,
      dateLabel: formatDateLabel(date),
      bills: enriched,
      dayExpenseText: formatAmount(dayExpense)
    }
  })
}

/** '2026-07-31' → '7月31日 周四' */
function formatDateLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const month = d.getMonth() + 1
  const day = d.getDate()
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${month}月${day}日 ${weekdays[d.getDay()]}`
}

/** 获取今天日期 'YYYY-MM-DD' */
export function getToday() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 获取当前月份 'YYYY-MM' */
export function getCurrentMonth() {
  return getToday().slice(0, 7)
}

/** 月份偏移：'2026-07' + delta → '2026-08' / '2026-06' */
export function shiftMonth(monthStr, delta) {
  const [y, m] = monthStr.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  const ny = d.getFullYear()
  const nm = String(d.getMonth() + 1).padStart(2, '0')
  return `${ny}-${nm}`
}

/** 月份显示文本 '2026-07' → '2026年7月' */
export function formatMonthLabel(monthStr) {
  const [y, m] = monthStr.split('-').map(Number)
  return `${y}年${m}月`
}
