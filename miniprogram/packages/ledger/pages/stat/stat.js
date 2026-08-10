import {
  getBillsByMonth, getBillsByYear, getBillsByRange,
  getMonthSummary, getCategoryBreakdown, getYearMonthTrend,
  getCurrentMonth, shiftMonth, formatMonthLabel
} from '../../model/bill'

function pad(n) { return String(n).padStart(2, '0') }

Page({
  data: {
    mode: 'month',            // month | year | custom
    year: new Date().getFullYear(),
    month: '',
    customStart: '',
    customEnd: '',
    periodLabel: '',
    summary: { incomeText: '0.00', expenseText: '0.00', balanceText: '0.00' },
    expenseCats: [],
    expenseTotalText: '0.00',
    incomeCats: [],
    incomeTotalText: '0.00',
    hasIncome: false,
    monthTrend: [],
    isEmpty: true
  },

  onLoad() {
    const now = new Date()
    const y = now.getFullYear()
    const m = pad(now.getMonth() + 1)
    const d = pad(now.getDate())
    this.setData({
      month: getCurrentMonth(),
      customStart: `${y}-${m}-01`,
      customEnd: `${y}-${m}-${d}`
    })
    this.loadStats()
  },

  onShow() {
    this.loadStats()
  },

  onSelectMode(e) {
    const mode = e.currentTarget.dataset.mode
    if (mode === this.data.mode) return
    this.setData({ mode })
    this.loadStats()
  },

  onPrev() {
    if (this.data.mode === 'month') {
      this.setData({ month: shiftMonth(this.data.month, -1) })
    } else if (this.data.mode === 'year') {
      this.setData({ year: this.data.year - 1 })
    }
    this.loadStats()
  },

  onNext() {
    if (this.data.mode === 'month') {
      this.setData({ month: shiftMonth(this.data.month, 1) })
    } else if (this.data.mode === 'year') {
      this.setData({ year: this.data.year + 1 })
    }
    this.loadStats()
  },

  onPickStart(e) {
    this.setData({ customStart: e.detail.value })
    this.loadStats()
  },

  onPickEnd(e) {
    this.setData({ customEnd: e.detail.value })
    this.loadStats()
  },

  loadStats() {
    const { mode, month, year, customStart, customEnd } = this.data
    let bills = []
    let periodLabel = ''
    if (mode === 'month') {
      bills = getBillsByMonth(month)
      periodLabel = formatMonthLabel(month)
    } else if (mode === 'year') {
      bills = getBillsByYear(year)
      periodLabel = `${year}年`
    } else {
      bills = getBillsByRange(customStart, customEnd)
      periodLabel = `${customStart} ~ ${customEnd}`
    }

    const summary = getMonthSummary(bills)
    const expense = getCategoryBreakdown(bills, 'expense')
    const income = getCategoryBreakdown(bills, 'income')
    const monthTrend = mode === 'year' ? getYearMonthTrend(year) : []

    this.setData({
      periodLabel,
      summary,
      expenseCats: expense.list,
      expenseTotalText: expense.totalText,
      incomeCats: income.list,
      incomeTotalText: income.totalText,
      hasIncome: income.total > 0,
      monthTrend,
      isEmpty: bills.length === 0
    })
  }
})
