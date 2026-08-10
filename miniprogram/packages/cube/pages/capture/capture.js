import { upload, post } from '../../utils/request'
import { ENDPOINTS } from '../../config/index'
import {
  FACE_DEFS, CENTER_INDEX, SOLVE_PAYLOAD_KEY,
  createEmptyState, cloneState, validateState, stateToKociemba, stateToColorNames
} from '../../model/cube-state'

/** 后端返回的颜色名 → 前端颜色索引 */
const COLOR_NAME_TO_ID = { yellow: 0, green: 1, red: 2, white: 3, blue: 4, orange: 5 }

/** 拍照提示文案 */
const FACE_TIPS = [
  '拍摄中心黄色的面，注意拍摄方位',
  '拍摄中心绿色的面，注意拍摄方位',
  '拍摄中心红色的面，注意拍摄方位',
  '拍摄中心白色的面，注意拍摄方位',
  '拍摄中心蓝色的面，注意拍摄方位',
  '拍摄中心橙色的面，注意拍摄方位'
]

/**
 * 各面朝向摄像头时的四邻面（上、右、下、左）
 * 用于十字方位图显示，帮助用户正确持握魔方
 */
const FACE_NEIGHBORS = [
  { top: 5, right: 1, bottom: 2, left: 4 },   // U(黄): 上=橙 右=绿 下=红 左=蓝
  { top: 0, right: 5, bottom: 3, left: 2 },   // R(绿): 上=黄 右=橙 下=白 左=红
  { top: 0, right: 1, bottom: 3, left: 4 },   // F(红): 上=黄 右=绿 下=白 左=蓝
  { top: 2, right: 1, bottom: 5, left: 4 },   // D(白): 上=红 右=绿 下=橙 左=蓝
  { top: 0, right: 2, bottom: 3, left: 5 },   // L(蓝): 上=黄 右=红 下=白 左=橙
  { top: 0, right: 4, bottom: 3, left: 1 }    // B(橙): 上=黄 右=蓝 下=白 左=绿
]

Page({
  data: {
    /** 当前面序号 0-5 */
    currentFace: 0,
    /** 当前面中文名 */
    faceName: '上面',
    /** 当前面字母 */
    faceLetter: 'U',
    /** 拍照提示 */
    tip: '',
    /** 方位提示（如"上方绿色 · 右方红色"） */
    orientHint: '',
    /** 十字方位图数据 */
    crossTop: {},
    crossRight: {},
    crossBottom: {},
    crossLeft: {},
    crossCenter: {},
    /** 阶段：capture | review | done */
    phase: 'capture',
    /** 6 面颜色数据（每面 9 个颜色名） */
    faceColors: [[], [], [], [], [], []],
    /** 各面是否已拍摄 */
    captured: [false, false, false, false, false, false],
    /** 当前面显示的 9 宫格（带 hex/isCenter） */
    gridCells: [],
    /** 是否正在上传识别 */
    uploading: false,
    /** 是否正在求解 */
    solving: false,
    /** 魔方状态（6×9 整数数组） */
    state: createEmptyState(),
    /** 校验信息 */
    errorText: '',
    canSolve: false,
    /** 颜色选择面板 */
    palette: FACE_DEFS.map((d, i) => ({ id: i, hex: d.hex, name: d.colorName }))
  },

  onLoad() {
    this._updateFaceInfo()
  },

  /* ==================== 拍照 & 识别 ==================== */

  /** 点击拍照 */
  onTakePhoto() {
    if (this.data.uploading) return
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      source: ['camera'],
      camera: 'back',
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        this._uploadAndDetect(tempFilePath)
      }
    })
  },

  /** 从相册选择 */
  onChooseFromAlbum() {
    if (this.data.uploading) return
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      source: ['album'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        this._uploadAndDetect(tempFilePath)
      }
    })
  },

  /** 上传照片并识别颜色 */
  _uploadAndDetect(filePath) {
    this.setData({ uploading: true })
    wx.showLoading({ title: '识别中…', mask: true })

    upload(ENDPOINTS.CUBE_PROCESS_UPLOAD, filePath).then(res => {
      wx.hideLoading()
      if (!res.colors || res.colors.length !== 9) {
        wx.showToast({ title: '识别失败，请重拍', icon: 'none' })
        this.setData({ uploading: false })
        return
      }

      const faceId = this.data.currentFace
      const colors = res.colors
      const state = cloneState(this.data.state)

      // 将颜色名转为索引并写入状态
      for (let i = 0; i < 9; i++) {
        const colorId = COLOR_NAME_TO_ID[colors[i]]
        if (colorId !== undefined) {
          state[faceId][i] = colorId
        }
      }

      // 中心块颜色固定为当前面颜色，自动校正识别偏差
      state[faceId][CENTER_INDEX] = faceId
      colors[CENTER_INDEX] = FACE_DEFS[faceId].colorName

      // 更新 faceColors
      const faceColors = this.data.faceColors.map(c => c.slice())
      faceColors[faceId] = colors

      const captured = this.data.captured.slice()
      captured[faceId] = true

      this.setData({
        state,
        faceColors,
        captured,
        phase: 'review',
        uploading: false
      })
      this._updateGrid()
      this._validate()
    }).catch(err => {
      wx.hideLoading()
      wx.showToast({ title: err.message || '识别失败', icon: 'none' })
      this.setData({ uploading: false })
    })
  },

  /* ==================== 颜色校正 ==================== */

  /** 点击格子进行手动校正 */
  onCellTap(e) {
    const cellIndex = e.currentTarget.dataset.cell
    if (cellIndex === CENTER_INDEX) {
      wx.showToast({ title: '中心块不可修改', icon: 'none' })
      return
    }
    this.setData({ _editingCell: cellIndex })
    wx.showActionSheet({
      itemList: FACE_DEFS.map(d => d.colorName === 'yellow' ? '黄色' :
        d.colorName === 'green' ? '绿色' :
        d.colorName === 'red' ? '红色' :
        d.colorName === 'white' ? '白色' :
        d.colorName === 'blue' ? '蓝色' : '橙色'),
      success: (res) => {
        const colorId = res.tapIndex
        const faceId = this.data.currentFace
        const cellIdx = this.data._editingCell

        // 更新 state
        const state = cloneState(this.data.state)
        state[faceId][cellIdx] = colorId
        this.setData({ state })

        // 同步更新 faceColors
        const colorName = FACE_DEFS[colorId].colorName
        const faceColors = this.data.faceColors.map(c => c.slice())
        faceColors[faceId][cellIdx] = colorName
        this.setData({ faceColors })

        this._updateGrid()
        this._validate()
      }
    })
  },

  /** 重拍当前面 */
  onRetake() {
    this.setData({ phase: 'capture' })
  },

  /* ==================== 面切换 & 确认 ==================== */

  /** 点击进度条切换面 */
  onFaceTap(e) {
    const faceId = Number(e.currentTarget.dataset.face)
    if (faceId === this.data.currentFace) return
    // 允许切换到已拍摄的面，或顺序中的下一个未拍摄面
    if (!this.data.captured[faceId]) {
      // 检查是否是第一个未拍摄的面
      for (let i = 0; i < 6; i++) {
        if (!this.data.captured[i]) {
          if (faceId !== i) return
          break
        }
      }
    }
    this.setData({
      currentFace: faceId,
      phase: this.data.captured[faceId] ? 'review' : 'capture'
    })
    this._updateFaceInfo()
    this._updateGrid()
  },

  /** 确认当前面，进入下一面 */
  onConfirm() {
    const next = this.data.currentFace + 1
    if (next >= 6) {
      // 所有面都已拍摄
      this.setData({ phase: 'done' })
      return
    }
    this.setData({ currentFace: next, phase: 'capture' })
    this._updateFaceInfo()
  },

  /* ==================== 求解 ==================== */

  onSolve() {
    if (this.data.solving || !this.data.canSolve) return
    const state = this.data.state
    const check = validateState(state)
    if (!check.ok) {
      wx.showToast({ title: check.errors[0], icon: 'none' })
      return
    }

    this.setData({ solving: true })
    wx.showLoading({ title: '求解中…', mask: true })

    const faces = stateToColorNames(state)
    post(ENDPOINTS.CUBE_SOLVE_BY_COLORS, { faces }).then(res => {
      wx.hideLoading()
      if (res.code === 1 && res.result) {
        wx.setStorageSync(SOLVE_PAYLOAD_KEY, {
          solution: res.result,
          state,
          kociemba: res.state || stateToKociemba(state)
        })
        wx.navigateTo({ url: '/packages/cube/pages/solve-choice/solve-choice' })
      } else {
        wx.showToast({ title: res.message || '求解失败', icon: 'none' })
      }
    }).catch(err => {
      wx.hideLoading()
      wx.showToast({ title: err.message || '网络异常', icon: 'none' })
    }).finally(() => {
      this.setData({ solving: false })
    })
  },

  /** 返回填色页，将当前状态传回 */
  onBackToFill() {
    // 将当前识别到的状态存起来，让 fill 页面读取
    wx.setStorageSync('cube:captureState', this.data.state)
    wx.navigateBack()
  },

  /* ==================== 内部方法 ==================== */

  _updateFaceInfo() {
    const f = this.data.currentFace
    const n = FACE_NEIGHBORS[f]
    const COLOR_CN = { yellow: '黄', green: '绿', red: '红', white: '白', blue: '蓝', orange: '橙' }
    const makeCell = (faceId) => ({
      hex: FACE_DEFS[faceId].hex,
      textOn: FACE_DEFS[faceId].textOn,
      name: FACE_DEFS[faceId].name,
      colorName: COLOR_CN[FACE_DEFS[faceId].colorName]
    })
    this.setData({
      faceName: FACE_DEFS[f].name,
      faceLetter: FACE_DEFS[f].letter,
      tip: FACE_TIPS[f],
      orientHint: `上中心${COLOR_CN[FACE_DEFS[n.top].colorName]} · 右中心${COLOR_CN[FACE_DEFS[n.right].colorName]} · 下中心${COLOR_CN[FACE_DEFS[n.bottom].colorName]} · 左中心${COLOR_CN[FACE_DEFS[n.left].colorName]}`,
      crossTop: makeCell(n.top),
      crossRight: makeCell(n.right),
      crossBottom: makeCell(n.bottom),
      crossLeft: makeCell(n.left),
      crossCenter: makeCell(f)
    })
  },

  /** 根据当前 state 更新显示用的 9 宫格 */
  _updateGrid() {
    const faceId = this.data.currentFace
    const gridCells = this.data.state[faceId].map((v, i) => ({
      hex: v >= 0 ? FACE_DEFS[v].hex : '#e8e6e0',
      textOn: v >= 0 ? FACE_DEFS[v].textOn : '#999',
      isCenter: i === CENTER_INDEX,
      isEmpty: v < 0,
      index: i
    }))
    this.setData({ gridCells })
  },

  /** 校验当前状态 */
  _validate() {
    const result = validateState(this.data.state)
    this.setData({
      canSolve: result.ok,
      errorText: result.ok ? '' : (result.errors[0] || '')
    })
  }
})
