const { playPop, playTada } = require('../../../../utils/kids-audio')

const KEY = 'coloring:total'
function getCount() { return wx.getStorageSync(KEY) || 0 }
function addCount() { const v = getCount() + 1; wx.setStorageSync(KEY, v); return v }

const PALETTE = ['#E53935', '#FB8C00', '#FDD835', '#43A047', '#1E88E5', '#8E24AA', '#EC407A', '#00ACC1']
const BLANK = '#F3F3F3'

// 每个图案返回一组待涂色区域；x/y 为圆心坐标(rpx)，size 为直径(rpx)
function reg(id, x, y, size, radius) {
  return { id, color: BLANK, x, y, size, radius: radius || '50%' }
}

const PATTERNS = [
  {
    name: '小花',
    build: () => [
      reg('c', 300, 300, 120),
      reg('p1', 300, 168, 92),
      reg('p2', 412, 236, 92),
      reg('p3', 378, 384, 92),
      reg('p4', 222, 384, 92),
      reg('p5', 188, 236, 92)
    ]
  },
  {
    name: '毛毛虫',
    build: () => [
      reg('s1', 120, 430, 70),
      reg('s2', 215, 395, 76),
      reg('s3', 315, 410, 82),
      reg('s4', 410, 375, 88),
      reg('head', 495, 330, 96),
      reg('eye1', 525, 305, 16),
      reg('eye2', 470, 300, 14)
    ]
  },
  {
    name: '雪人',
    build: () => [
      reg('bot', 300, 450, 115),
      reg('mid', 300, 310, 90),
      reg('head', 300, 195, 68),
      reg('nose', 300, 198, 18),
      reg('btn1', 300, 300, 16),
      reg('btn2', 300, 335, 16)
    ]
  },
  {
    name: '太阳',
    build: () => [
      reg('center', 300, 300, 120),
      reg('r1', 300, 135, 34),
      reg('r2', 415, 180, 34),
      reg('r3', 465, 300, 34),
      reg('r4', 415, 420, 34),
      reg('r5', 300, 465, 34),
      reg('r6', 185, 420, 34),
      reg('r7', 135, 300, 34),
      reg('r8', 185, 180, 34)
    ]
  },
  {
    name: '蝴蝶',
    build: () => [
      reg('body', 300, 300, 44),
      reg('wUL', 210, 225, 82),
      reg('wUR', 390, 225, 82),
      reg('wDL', 210, 385, 82),
      reg('wDR', 390, 385, 82),
      reg('ant1', 288, 200, 14),
      reg('ant2', 312, 200, 14)
    ]
  },
  {
    name: '小猫',
    build: () => [
      reg('face', 300, 330, 150),
      reg('earL', 215, 205, 64),
      reg('earR', 385, 205, 64),
      reg('eyeL', 255, 320, 24),
      reg('eyeR', 345, 320, 24),
      reg('nose', 300, 365, 20)
    ]
  },
  {
    name: '大树',
    build: () => [
      reg('trunk', 300, 480, 52, '14rpx'),
      reg('can1', 300, 300, 135),
      reg('can2', 215, 365, 82),
      reg('can3', 385, 365, 82),
      reg('can4', 300, 200, 82)
    ]
  },
  {
    name: '小鱼',
    build: () => [
      reg('body', 290, 300, 135),
      reg('tail', 430, 300, 72),
      reg('eye', 215, 262, 20),
      reg('fin', 290, 170, 42),
      reg('bub1', 140, 200, 20),
      reg('bub2', 120, 255, 16)
    ]
  },
  {
    name: '机器人',
    build: () => [
      reg('head', 300, 200, 104),
      reg('eyeL', 262, 200, 26),
      reg('eyeR', 338, 200, 26),
      reg('body', 300, 385, 124),
      reg('armL', 195, 385, 42),
      reg('armR', 405, 385, 42),
      reg('legL', 262, 505, 42),
      reg('legR', 338, 505, 42)
    ]
  },
  {
    name: '气球',
    build: () => [
      reg('ball', 300, 255, 150),
      reg('knot', 300, 340, 24),
      reg('s1', 300, 400, 12),
      reg('s2', 288, 450, 12),
      reg('s3', 312, 500, 12)
    ]
  }
]

Page({
  data: {
    palette: PALETTE,
    selected: PALETTE[0],
    patternIndex: 0,
    patternName: PATTERNS[0].name,
    patternTotal: PATTERNS.length,
    regions: PATTERNS[0].build(),
    done: false,
    count: 0
  },

  onLoad() {
    this.setData({ count: getCount() })
  },

  onSelectColor(e) {
    this.setData({ selected: e.currentTarget.dataset.color })
  },

  onTapRegion(e) {
    if (this.data.done) return
    const id = e.currentTarget.dataset.id
    const regions = this.data.regions.map(r => r.id === id ? Object.assign({}, r, { color: this.data.selected }) : r)
    const colored = regions.filter(r => r.color !== BLANK).length
    playPop()
    if (colored >= regions.length) {
      const count = addCount()
      this.setData({ regions, done: true, count })
      playTada()
    } else {
      this.setData({ regions })
    }
  },

  switchPattern(index) {
    const i = (index + PATTERNS.length) % PATTERNS.length
    const p = PATTERNS[i]
    this.setData({
      patternIndex: i,
      patternName: p.name,
      regions: p.build(),
      done: false
    })
  },

  onPrev() { this.switchPattern(this.data.patternIndex - 1) },
  onNext() { this.switchPattern(this.data.patternIndex + 1) },

  onAgain() {
    this.setData({ regions: PATTERNS[this.data.patternIndex].build(), done: false })
  },

  onClear() {
    wx.showModal({
      title: '清空记录',
      content: '确定要把成绩清零吗？',
      success: (res) => {
        if (res.confirm) {
          wx.setStorageSync(KEY, 0)
          this.setData({ count: 0 })
        }
      }
    })
  }
})
