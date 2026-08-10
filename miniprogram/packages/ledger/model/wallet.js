/**
 * 钱包/账户数据模型
 * 账户存储在 wx.storage，键名 'ledger:wallets'
 * balance 单位：元（浮点），显示时 toFixed(2)
 */

import { formatAmount } from './bill'

export const WALLET_STORAGE_KEY = 'ledger:wallets'

/** 上次使用的账户 id */
const LAST_WALLET_KEY = 'ledger:lastWalletId'

/** 预设账户类型 */
export const WALLET_TYPES = [
  { key: 'cash',    name: '现金',     icon: '现', color: '#E24B4A' },
  { key: 'debit',   name: '储蓄卡',   icon: '储', color: '#378ADD' },
  { key: 'credit',  name: '信用卡',   icon: '信', color: '#BA7517' },
  { key: 'alipay',  name: '支付宝',   icon: '支', color: '#185FA5' },
  { key: 'wechat',  name: '微信',     icon: '微', color: '#0F6E56' },
  { key: 'custom',  name: '自定义',   icon: '他', color: '#888780' }
]

/** 查找预设类型定义 */
export function findWalletType(key) {
  return WALLET_TYPES.find(t => t.key === key) || WALLET_TYPES[5]
}

// ==================== CRUD ====================

/** 读取全部账户 */
export function getWallets() {
  return wx.getStorageSync(WALLET_STORAGE_KEY) || []
}

/** 保存全部账户 */
function saveWallets(wallets) {
  wx.setStorageSync(WALLET_STORAGE_KEY, wallets)
}

/** 按 id 查找账户 */
export function getWalletById(id) {
  if (!id) return null
  return getWallets().find(w => w.id === id) || null
}

/** 新增账户 */
export function addWallet(wallet) {
  const wallets = getWallets()
  wallet.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  wallet.createdAt = Date.now()
  wallets.push(wallet)
  saveWallets(wallets)
  return wallet
}

/** 更新账户 */
export function updateWallet(wallet) {
  const wallets = getWallets()
  const idx = wallets.findIndex(w => w.id === wallet.id)
  if (idx >= 0) {
    wallets[idx] = wallet
    saveWallets(wallets)
  }
}

/** 删除账户（不级联删除账单，仅移除账户记录） */
export function deleteWallet(id) {
  const wallets = getWallets().filter(w => w.id !== id)
  saveWallets(wallets)
}

// ==================== 余额操作 ====================

/**
 * 记账时调整账户余额
 * 普通账户：expense → 余额减少，income → 余额增加
 * 信用卡：  expense → 欠款增加，income → 欠款减少
 */
export function adjustBalance(walletId, type, amount) {
  if (!walletId) return
  const wallets = getWallets()
  const w = wallets.find(w => w.id === walletId)
  if (!w) return
  const amt = Number(amount) || 0
  const isCredit = w.type === 'credit'
  let delta
  if (isCredit) {
    delta = type === 'expense' ? amt : -amt
  } else {
    delta = type === 'expense' ? -amt : amt
  }
  w.balance = Math.round((w.balance + delta) * 100) / 100
  saveWallets(wallets)
}

/**
 * 删除/修改账单时回滚余额（与 adjustBalance 反向）
 * 普通账户：expense → 余额恢复，income → 余额扣回
 * 信用卡：  expense → 欠款减少，income → 欠款恢复
 */
export function reverseBalance(walletId, type, amount) {
  if (!walletId) return
  const wallets = getWallets()
  const w = wallets.find(w => w.id === walletId)
  if (!w) return
  const amt = Number(amount) || 0
  const isCredit = w.type === 'credit'
  let delta
  if (isCredit) {
    delta = type === 'expense' ? -amt : amt
  } else {
    delta = type === 'expense' ? amt : -amt
  }
  w.balance = Math.round((w.balance + delta) * 100) / 100
  saveWallets(wallets)
}

/**
 * 编辑账单时的余额转移：先回滚旧账单，再扣减新账单
 */
export function transferBalance(oldWalletId, newWalletId, type, oldAmount, newAmount) {
  reverseBalance(oldWalletId, type, oldAmount)
  adjustBalance(newWalletId, type, newAmount)
}

// ==================== 上次使用账户 ====================

export function getLastWalletId() {
  return wx.getStorageSync(LAST_WALLET_KEY) || ''
}

export function setLastWalletId(id) {
  wx.setStorageSync(LAST_WALLET_KEY, id)
}

// ==================== 汇总 ====================

/** 资产总额 = 非信用卡余额之和 */
export function getTotalAssetsBalance() {
  return getWallets()
    .filter(w => w.type !== 'credit')
    .reduce((sum, w) => sum + Math.max(Number(w.balance) || 0, 0), 0)
}

/** 负债总额 = 信用卡欠款之和 */
export function getTotalCreditDebt() {
  return getWallets()
    .filter(w => w.type === 'credit')
    .reduce((sum, w) => sum + Math.max(Number(w.balance) || 0, 0), 0)
}

/** 净资产 = 资产 - 负债 */
export function getTotalAssets() {
  return getTotalAssetsBalance() - getTotalCreditDebt()
}
