import {
  getWallets, deleteWallet, getTotalAssets, getTotalAssetsBalance, getTotalCreditDebt
} from '../../model/wallet'
import { formatAmount } from '../../model/bill'
import { confirm as modalConfirm } from '../../../../utils/modal'

Page({
  data: {
    wallets: [],
    totalAssetsText: '0.00',
    totalDebt: 0,
    totalDebtText: '0.00',
    totalAssetsBalanceText: '0.00'
  },

  onShow() {
    this.loadWallets()
  },

  loadWallets() {
    const wallets = getWallets().map(w => {
      const balance = Number(w.balance) || 0
      return {
        ...w,
        balanceText: formatAmount(balance)
      }
    })
    const totalAssets = getTotalAssets()
    const totalDebt = getTotalCreditDebt()
    const totalAssetsBalance = getTotalAssetsBalance()
    this.setData({
      wallets,
      totalAssetsText: formatAmount(totalAssets),
      totalDebt,
      totalDebtText: formatAmount(totalDebt),
      totalAssetsBalanceText: formatAmount(totalAssetsBalance)
    })
  },

  onAddWallet() {
    wx.navigateTo({ url: '/packages/ledger/pages/wallet-edit/wallet-edit' })
  },

  onTapWallet(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/packages/ledger/pages/wallet-edit/wallet-edit?id=' + id })
  },

  onLongPressWallet(e) {
    const id = e.currentTarget.dataset.id
    const wallet = getWallets().find(w => w.id === id)
    if (!wallet) return
    modalConfirm({
      title: '删除账户',
      content: `确定删除"${wallet.name}"吗？关联的账单不会被删除，但将变为未关联账户。`
    }).then((ok) => {
      if (!ok) return
      deleteWallet(id)
      wx.showToast({ title: '已删除', icon: 'success' })
      this.loadWallets()
    })
  }
})
