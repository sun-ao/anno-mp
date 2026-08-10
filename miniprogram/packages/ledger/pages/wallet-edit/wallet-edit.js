import {
  WALLET_TYPES, findWalletType, getWalletById, addWallet, updateWallet, deleteWallet
} from '../../model/wallet'
import { formatAmount } from '../../model/bill'

Page({
  data: {
    walletTypes: WALLET_TYPES,
    selectedType: 'cash',
    name: '',
    balance: '',
    isEdit: false,
    walletId: ''
  },

  onLoad(query) {
    if (query && query.id) {
      const wallet = getWalletById(query.id)
      if (wallet) {
        this.setData({
          isEdit: true,
          walletId: wallet.id,
          selectedType: wallet.type,
          name: wallet.name,
          balance: wallet.balance > 0 ? String(wallet.balance) : ''
        })
        // 编辑模式下更新页面标题
        wx.setNavigationBarTitle({ title: '编辑账户' })
        return
      }
    }
    // 新增模式：默认选中现金
    this.setData({
      name: WALLET_TYPES[0].name
    })
  },

  onSelectType(e) {
    if (this.data.isEdit) return // 编辑模式不允许改类型
    const key = e.currentTarget.dataset.key
    const type = findWalletType(key)
    this.setData({
      selectedType: key,
      name: type.name
    })
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value })
  },

  onBalanceInput(e) {
    this.setData({ balance: e.detail.value })
  },

  onSave() {
    const name = this.data.name.trim()
    if (!name) {
      wx.showToast({ title: '请输入账户名称', icon: 'none' })
      return
    }

    const balance = parseFloat(this.data.balance) || 0

    const wallet = {
      type: this.data.selectedType,
      name,
      icon: findWalletType(this.data.selectedType).icon,
      color: findWalletType(this.data.selectedType).color,
      balance: Math.round(balance * 100) / 100,
      initialBalance: Math.round(balance * 100) / 100
    }

    if (this.data.isEdit) {
      wallet.id = this.data.walletId
      // 保留原有的 icon/color（用户可能自定义过）
      const old = getWalletById(this.data.walletId)
      if (old) {
        wallet.icon = old.icon
        wallet.color = old.color
      }
      updateWallet(wallet)
    } else {
      addWallet(wallet)
    }

    wx.showToast({ title: '已保存', icon: 'success' })
    this._backTimer = setTimeout(() => wx.navigateBack(), 600)
  },

  onDelete() {
    wx.showModal({
      title: '删除账户',
      content: '确定删除此账户吗？关联的账单不会被删除。',
      confirmColor: '#C41E3A',
      success: (res) => {
        if (res.confirm) {
          deleteWallet(this.data.walletId)
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
