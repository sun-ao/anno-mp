const GESTURES = [
  { key: 'rock', name: '石头', emoji: '✊' },
  { key: 'scissors', name: '剪刀', emoji: '✌️' },
  { key: 'paper', name: '布', emoji: '✋' }
]

// RULES[player] = 该出手能打败的出手
const RULES = {
  rock: 'scissors',
  scissors: 'paper',
  paper: 'rock'
}

const HANDS = {
  palm: { name: '手心', emoji: '✋' },
  back: { name: '手背', emoji: '🤚' }
}

function randomGesture() {
  return GESTURES[Math.floor(Math.random() * GESTURES.length)].key
}

function randomHand() {
  return Math.random() < 0.5 ? 'palm' : 'back'
}

function judgeRps(player, computer) {
  if (player === computer) return 'draw'
  return RULES[player] === computer ? 'win' : 'lose'
}

module.exports = { GESTURES, HANDS, randomGesture, randomHand, judgeRps }
