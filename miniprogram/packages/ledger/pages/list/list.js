import {
  getBillsByMonth, getMonthSummary, groupByDate, deleteBill,
  getCurrentMonth, shiftMonth, formatMonthLabel
} from '../../model/bill'

Page({
  data: {
    currentMonth: '',
    monthLabel: '',
    summary: { incomeText: '0.00', expenseText: '0.00', balanceText: '0.00' },
    groups: []
  },

  onLoad() {
    this.setData({ currentMonth: getCurrentMonth() })
    this.loadBills()
  },

  onShow() {
    if (this.data.currentMonth) this.loadBills()
  },

  loadBills() {
    const month = this.data.currentMonth
    const bills = getBillsByMonth(month)
    const summary = getMonthSummary(bills)
    const groups = groupByDate(bills)
    this.setData({ monthLabel: formatMonthLabel(month), summary, groups })
  },

  onPrevMonth() {
    this.setData({ currentMonth: shiftMonth(this.data.currentMonth, -1) })
    this.loadBills()
  },

  onNextMonth() {
    this.setData({ currentMonth: shiftMonth(this.data.currentMonth, 1) })
    this.loadBills()
  },

  onAdd() {
    wx.navigateTo({ url: '/packages/ledger/pages/edit/edit' })
  },

  onGoWallet() {
    wx.navigateTo({ url: '/packages/ledger/pages/wallet/wallet' })
  },

  onGoStat() {
    wx.navigateTo({ url: '/packages/ledger/pages/stat/stat' })
  },

  onTapBill(e) {
    wx.navigateTo({ url: '/packages/ledger/pages/edit/edit?id=' + e.currentTarget.dataset.id })
  },

  onLongPressBill(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除账单',
      content: '确定删除这条记录吗？',
      success: (res) => {
        if (res.confirm) {
          deleteBill(id)
          wx.showToast({ title: '已删除', icon: 'success' })
          this.loadBills()
        }
      }
    })
  }
})
