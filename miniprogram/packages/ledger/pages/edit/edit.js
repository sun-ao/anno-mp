import {
  getCategories, addBill, updateBill, updateBillWithBalance, deleteBill, getBillById,
  getToday, findCategory, formatAmount, addCustomCategory, deleteCategory, CATEGORY_COLORS
} from '../../model/bill'
import { getWallets, getWalletById, getLastWalletId, setLastWalletId } from '../../model/wallet'

function dateDisplay(dateStr) {
  const [, m, d] = dateStr.split('-').map(Number)
  return `${m}月${d}日`
}

Page({
  data: {
    type: 'expense',
    amount: '',
    categories: [],
    selectedCategory: '',
    note: '',
    date: '',
    dateLabel: '',
    today: '',
    isEdit: false,
    billId: '',
    // 钱包相关
    walletId: '',
    walletName: '',
    walletIcon: '',
    walletColor: '',
    // 自定义分类弹窗
    showAddCategory: false,
    catName: '',
    catColor: '#E24B4A',
    catColors: CATEGORY_COLORS,
    // 钱包选择弹窗
    showWalletPicker: false,
    walletList: [],
    // 日历弹窗
    showCalendar: false,
    calendarTitle: '',
    calendarDays: [],
    weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    viewYear: 0,
    viewMonth: 0,
    canNext: true
  },

  onLoad(query) {
    const today = getToday()
    if (query && query.id) {
      const bill = getBillById(query.id)
      if (bill) {
        const wallet = getWalletById(bill.walletId)
        this.setData({
          isEdit: true,
          billId: bill.id,
          type: bill.type,
          amount: String(bill.amount),
          selectedCategory: bill.category,
          note: bill.note || '',
          date: bill.date,
          dateLabel: dateDisplay(bill.date),
          today,
          categories: getCategories(bill.type),
          walletId: bill.walletId || '',
          walletName: wallet ? wallet.name : '',
          walletIcon: wallet ? wallet.icon : '',
          walletColor: wallet ? wallet.color : ''
        })
        return
      }
    }
    // 新增模式：设置默认账户
    const defaultWallet = this._getDefaultWallet()
    this.setData({
      date: today,
      dateLabel: dateDisplay(today),
      today,
      categories: getCategories('expense'),
      walletId: defaultWallet ? defaultWallet.id : '',
      walletName: defaultWallet ? defaultWallet.name : '',
      walletIcon: defaultWallet ? defaultWallet.icon : '',
      walletColor: defaultWallet ? defaultWallet.color : ''
    })
  },

  /** 获取默认账户：上次使用的 > 唯一的 > 无 */
  _getDefaultWallet() {
    const wallets = getWallets()
    if (wallets.length === 0) return null
    if (wallets.length === 1) return wallets[0]
    const lastId = getLastWalletId()
    if (lastId) {
      const last = wallets.find(w => w.id === lastId)
      if (last) return last
    }
    return wallets[0]
  },

  onSwitchType(e) {
    const type = e.currentTarget.dataset.type
    if (type === this.data.type) return
    this.setData({
      type,
      categories: getCategories(type),
      selectedCategory: ''
    })
  },

  onAmountInput(e) {
    this.setData({ amount: e.detail.value })
  },

  onNoteInput(e) {
    this.setData({ note: e.detail.value })
  },

  onSelectCategory(e) {
    this.setData({ selectedCategory: e.currentTarget.dataset.key })
  },

  onLongPressCategory(e) {
    const key = e.currentTarget.dataset.key
    const cat = this.data.categories.find(c => c.key === key)
    if (!cat) return
    wx.showModal({
      title: '删除分类',
      content: `确定删除「${cat.name}」吗？`,
      confirmColor: '#C41E3A',
      success: (res) => {
        if (res.confirm) {
          deleteCategory(this.data.type, key)
          const categories = getCategories(this.data.type)
          this.setData({
            categories,
            selectedCategory: this.data.selectedCategory === key ? '' : this.data.selectedCategory
          })
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      }
    })
  },

  noop() {},

  onAddCategory() {
    this.setData({ showAddCategory: true, catName: '', catColor: '#E24B4A' })
  },

  onCloseAddCategory() {
    this.setData({ showAddCategory: false })
  },

  onCatNameInput(e) {
    this.setData({ catName: e.detail.value })
  },

  onSelectCatColor(e) {
    this.setData({ catColor: e.currentTarget.dataset.color })
  },

  onCatColorInput(e) {
    let val = e.detail.value.trim()
    if (val && val.charAt(0) !== '#') {
      val = '#' + val
    }
    this.setData({ catColor: val })
  },

  onConfirmAddCategory() {
    const name = this.data.catName.trim()
    if (!name) {
      wx.showToast({ title: '请输入分类名称', icon: 'none' })
      return
    }
    // 校验颜色，非法则用默认色
    let color = this.data.catColor
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
      color = CATEGORY_COLORS[0]
    }
    const cat = addCustomCategory(this.data.type, name, color)
    this.setData({
      showAddCategory: false,
      categories: getCategories(this.data.type),
      selectedCategory: cat.key
    })
  },

  // ==================== 日历弹窗 ====================

  onOpenCalendar() {
    const [y, m] = this.data.date.split('-').map(Number)
    this.setData({
      showCalendar: true,
      viewYear: y,
      viewMonth: m
    }, () => this.buildCalendar())
  },

  onCloseCalendar() {
    this.setData({ showCalendar: false })
  },

  onCalendarPrevMonth() {
    let y = this.data.viewYear
    let m = this.data.viewMonth - 1
    if (m < 1) { m = 12; y -= 1 }
    this.setData({ viewYear: y, viewMonth: m }, () => this.buildCalendar())
  },

  onCalendarNextMonth() {
    let y = this.data.viewYear
    let m = this.data.viewMonth + 1
    if (m > 12) { m = 1; y += 1 }
    // 不允许翻到未来月份
    const [ty, tm] = this.data.today.split('-').map(Number)
    if (y > ty || (y === ty && m > tm)) return
    this.setData({ viewYear: y, viewMonth: m }, () => this.buildCalendar())
  },

  onSelectCalendarDay(e) {
    const date = e.currentTarget.dataset.date
    if (!date) return
    this.setData({
      date,
      dateLabel: dateDisplay(date),
      showCalendar: false
    })
  },

  buildCalendar() {
    const y = this.data.viewYear
    const m = this.data.viewMonth
    const today = this.data.today
    const firstWeekday = new Date(y, m - 1, 1).getDay()
    const daysInMonth = new Date(y, m, 0).getDate()
    const days = []
    let idx = 0
    for (let i = 0; i < firstWeekday; i++) {
      days.push({ idx: idx++, date: '', label: '', blank: true })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      days.push({
        idx: idx++,
        date: dateStr,
        label: String(d),
        isToday: dateStr === today,
        disabled: dateStr > today
      })
    }
    const [ty, tm] = today.split('-').map(Number)
    this.setData({
      calendarDays: days,
      calendarTitle: `${y}年${m}月`,
      canNext: !(y === ty && m >= tm)
    })
  },

  onSelectWallet() {
    const wallets = getWallets()
    if (wallets.length === 0) {
      wx.showModal({
        title: '暂无钱包',
        content: '请先添加一个钱包',
        confirmText: '去添加',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/packages/ledger/pages/wallet-edit/wallet-edit' })
          }
        }
      })
      return
    }
    this.setData({
      showWalletPicker: true,
      walletList: wallets.map(w => ({
        ...w,
        balanceText: formatAmount(w.balance)
      }))
    })
  },

  onCloseWalletPicker() {
    this.setData({ showWalletPicker: false })
  },

  onPickWallet(e) {
    const id = e.currentTarget.dataset.id
    const selected = this.data.walletList.find(w => w.id === id)
    if (!selected) return
    this.setData({
      showWalletPicker: false,
      walletId: selected.id,
      walletName: selected.name,
      walletIcon: selected.icon,
      walletColor: selected.color
    })
  },

  onSave() {
    const amount = parseFloat(this.data.amount)
    if (!amount || amount <= 0) {
      wx.showToast({ title: '请输入金额', icon: 'none' })
      return
    }
    if (!this.data.selectedCategory) {
      wx.showToast({ title: '请选择分类', icon: 'none' })
      return
    }

    const bill = {
      type: this.data.type,
      amount: Math.round(amount * 100) / 100,
      category: this.data.selectedCategory,
      note: this.data.note.trim(),
      date: this.data.date,
      walletId: this.data.walletId || ''
    }

    if (this.data.isEdit) {
      bill.id = this.data.billId
      const oldBill = getBillById(this.data.billId)
      updateBillWithBalance(oldBill, bill)
    } else {
      addBill(bill)
      // 记住上次使用的账户
      if (bill.walletId) {
        setLastWalletId(bill.walletId)
      }
    }

    wx.showToast({ title: '已保存', icon: 'success' })
    this._backTimer = setTimeout(() => wx.navigateBack(), 600)
  },

  onDelete() {
    wx.showModal({
      title: '删除账单',
      content: '确定删除这条记录吗？',
      success: (res) => {
        if (res.confirm) {
          deleteBill(this.data.billId)
          wx.showToast({ title: '已删除', icon: 'success' })
          this._backTimer = setTimeout(() => wx.navigateBack(), 600)
        }
      }
    })
  },

  onUnload() {
    if (this._backTimer) {
      clearTimeout(this._backTimer)
      this._backTimer = null
    }
  }
})
