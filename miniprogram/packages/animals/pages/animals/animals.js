// 动物叫声：真实录音（Freesound CC0，见 audio/NOTICE.md）+ 合成兜底
const { playMeow, playWoof, playMoo, playQuack, playCluck, playBleat } = require('../../../../utils/kids-audio')

// 合成兜底仅覆盖早期几种；其余全部用真实录音
const SYNTH_FALLBACK = {
  cat: playMeow, dog: playWoof, cow: playMoo, duck: playQuack, chick: playCluck, sheep: playBleat
}

// 26 种动物，key 与 audio/<key>.mp3 对应
const ANIMALS = [
  { key: 'cat', name: '小猫', emoji: '🐱' },
  { key: 'dog', name: '小狗', emoji: '🐶' },
  { key: 'cow', name: '奶牛', emoji: '🐮' },
  { key: 'duck', name: '鸭子', emoji: '🦆' },
  { key: 'chick', name: '小鸡', emoji: '🐔' },
  { key: 'sheep', name: '绵羊', emoji: '🐑' },
  { key: 'lion', name: '狮子', emoji: '🦁' },
  { key: 'pig', name: '小猪', emoji: '🐷' },
  { key: 'horse', name: '马', emoji: '🐴' },
  { key: 'frog', name: '青蛙', emoji: '🐸' },
  { key: 'bee', name: '蜜蜂', emoji: '🐝' },
  { key: 'bird', name: '小鸟', emoji: '🐦' },
  { key: 'owl', name: '猫头鹰', emoji: '🦉' },
  { key: 'elephant', name: '大象', emoji: '🐘' },
  { key: 'monkey', name: '猴子', emoji: '🐵' },
  { key: 'tiger', name: '老虎', emoji: '🐯' },
  { key: 'bear', name: '熊', emoji: '🐻' },
  { key: 'wolf', name: '狼', emoji: '🐺' },
  { key: 'snake', name: '蛇', emoji: '🐍' },
  { key: 'mouse', name: '老鼠', emoji: '🐭' },
  { key: 'rooster', name: '公鸡', emoji: '🐓' },
  { key: 'turkey', name: '火鸡', emoji: '🦃' },
  { key: 'cricket', name: '蟋蟀', emoji: '🦗' },
  { key: 'dolphin', name: '海豚', emoji: '🐬' },
  { key: 'whale', name: '鲸鱼', emoji: '🐳' },
  { key: 'seal', name: '海豹', emoji: '🦭' }
]

const AUDIO_BASE = '/packages/animals/audio/'

Page({
  data: {
    animals: ANIMALS.map(a => ({ key: a.key, name: a.name, emoji: a.emoji })),
    activeKey: ''
  },

  onLoad() {
    this._audio = wx.createInnerAudioContext()
    this._lastKey = ''
    // 真实录音缺失时退回合成（兜底，正常不会触发）
    this._audio.onError(() => {
      const s = SYNTH_FALLBACK[this._lastKey]
      if (s) s()
    })
  },

  onTap(e) {
    const key = e.currentTarget.dataset.key
    this._play(key)
    if (wx.vibrateShort) wx.vibrateShort({ type: 'light' })
    this.setData({ activeKey: key })
    if (this._hlTimer) clearTimeout(this._hlTimer)
    // 高亮保持到播放结束（录音最长 6 秒）
    this._hlTimer = setTimeout(() => this.setData({ activeKey: '' }), 6500)
  },

  _play(key) {
    this._lastKey = key
    const a = this._audio
    if (!a) return
    a.stop()
    a.src = AUDIO_BASE + key + '.mp3'
    a.play()
  },

  onHide() {
    if (this._audio) this._audio.stop()
  },

  onUnload() {
    if (this._audio) {
      this._audio.stop()
      if (typeof this._audio.destroy === 'function') this._audio.destroy()
    }
    if (this._hlTimer) clearTimeout(this._hlTimer)
  }
})
