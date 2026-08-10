import { post } from '../../utils/request'
import { ENDPOINTS } from '../../config/index'
import {
  FACE_DEFS, CENTER_INDEX, SOLVE_PAYLOAD_KEY,
  createSolvedState, validateState, stateToKociemba, cloneState
} from '../../model/cube-state'

/** 展开图布局：U 在上，L F R B 一排，D 在下（各面均按"面对该面"视角绘制） */
const NET_LAYOUT = [
  [null, 0, null, null],
  [4, 2, 1, 5],
  [null, 3, null, null]
]

function buildNet(state) {
  return NET_LAYOUT.map(row =>
    row.map(faceId => {
      if (faceId === null) return { type: 'spacer' }
      const cells = state[faceId].map((v, c) => ({
        v,
        hex: v >= 0 ? FACE_DEFS[v].hex : '#e8e6e0',
        textOn: v >= 0 ? FACE_DEFS[v].textOn : '#999999',
        isCenter: c === CENTER_INDEX,
        letter: FACE_DEFS[faceId].letter
      }))
      return { type: 'face', face: faceId, cells }
    })
  )
}

Page({
  data: {
    mode: 'edit',
    state: createSolvedState(),
    netRows: [],
    palette: [],
    selectedColor: 2,
    errorText: '',
    canSolve: true,
    solving: false
  },

  onLoad() {
    this.refresh()
  },

  onShow() {
    // 从拍照识别页返回时，读取识别到的状态
    const captureState = wx.getStorageSync('cube:captureState')
    if (captureState) {
      wx.removeStorageSync('cube:captureState')
      this.setData({ state: captureState })
      this.refresh()
    }
  },

  /** 根据 state 重算展开图、计数、校验 */
  refresh() {
    const state = this.data.state
    const result = validateState(state)
    this.setData({
      netRows: buildNet(state),
      palette: FACE_DEFS.map((d, i) => ({ id: d.id, hex: d.hex, count: result.counts[i] })),
      errorText: result.ok ? '' : result.errors[0],
      canSolve: result.ok
    })
  },

  onSwitchMode(e) {
    this.setData({ mode: e.currentTarget.dataset.mode })
  },

  onSelectColor(e) {
    this.setData({ selectedColor: Number(e.currentTarget.dataset.id) })
  },

  onPaint(e) {
    const face = Number(e.currentTarget.dataset.face)
    const cell = Number(e.currentTarget.dataset.cell)
    if (cell === CENTER_INDEX) {
      wx.showToast({ title: '中心块颜色固定', icon: 'none' })
      return
    }
    const state = this.data.state.map(f => f.slice())
    state[face][cell] = this.data.selectedColor
    this.setData({ state })
    this.refresh()
  },

  /** 3D 模式下点按贴纸上色（由 cube3d 组件 raycaster 回调） */
  on3DPaint(e) {
    const { face, cell } = e.detail
    if (cell === CENTER_INDEX) {
      wx.showToast({ title: '中心块颜色固定', icon: 'none' })
      return
    }
    const state = this.data.state.map(f => f.slice())
    state[face][cell] = this.data.selectedColor
    this.setData({ state })
    this.refresh()
  },

  onReset() {
    this.setData({ state: createSolvedState() })
    this.refresh()
  },

  onGotoCapture() {
    wx.navigateTo({ url: '/packages/cube/pages/capture/capture' })
  },

  onSolve() {
    if (!this.data.canSolve || this.data.solving) return
    const state = this.data.state
    const check = validateState(state)
    if (!check.ok) {
      wx.showToast({ title: check.errors[0], icon: 'none' })
      return
    }
    const stateStr = stateToKociemba(state)
    this.setData({ solving: true })
    wx.showLoading({ title: '求解中…', mask: true })
    post(ENDPOINTS.CUBE_SOLVE, {
      cube_state: stateStr
    }).then(res => {
      if (res.solution) {
        wx.setStorageSync(SOLVE_PAYLOAD_KEY, {
          solution: res.solution,
          state,
          kociemba: stateStr
        })
        wx.navigateTo({ url: '/packages/cube/pages/solve-choice/solve-choice' })
      } else {
        wx.showToast({ title: '求解失败，请检查配色', icon: 'none' })
      }
    }).catch(err => {
      wx.showToast({ title: err.message || '网络异常', icon: 'none' })
    }).finally(() => {
      wx.hideLoading()
      this.setData({ solving: false })
    })
  }
})
