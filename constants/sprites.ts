// Centralized sprite catalog for UI and engine features
// Keep IDs consistent with engine rendering branches (e.g., 'database', 'circle', 'square', 'star', plus emoji-like ids)

export type SpriteDef = { id: string; name: string; emoji?: string }

export const ALL_SPRITES: SpriteDef[] = [
  { id: 'database', name: 'Database' },
  { id: 'circle', name: 'Circle' },
  { id: 'square', name: 'Square' },
  { id: 'star', name: 'Star' },
  { id: 'triangle', name: 'Triangle' },
  { id: 'diamond_shape', name: 'Diamond Shape' },
  { id: 'hexagon', name: 'Hexagon' },
  { id: 'ring', name: 'Ring' },
  { id: 'plus', name: 'Plus' },
  // New drawn shapes (locked by default for testing)
  { id: 'pentagon', name: 'Pentagon' },
  { id: 'octagon', name: 'Octagon' },
  { id: 'chevron', name: 'Chevron' },
  // Emoji/text-based
  { id: 'heart', name: 'Heart', emoji: '❤️' },
  { id: 'club', name: 'Club', emoji: '♣️' },
  { id: 'diamond', name: 'Diamond', emoji: '♦️' },
  { id: 'spade', name: 'Spade', emoji: '♠️' },
  { id: 'laughing', name: 'Laughing', emoji: '😄' },
  { id: 'heart_eyes', name: 'Heart Eyes', emoji: '😍' },
  { id: 'rofl', name: 'ROFL', emoji: '🤣' },
  { id: 'smile', name: 'Smile', emoji: '😊' },
  { id: 'sob', name: 'Sob', emoji: '😭' },
  { id: 'fire', name: 'Fire', emoji: '🔥' },
  { id: 'thinking', name: 'Thinking', emoji: '🤔' },
  { id: 'cool', name: 'Cool', emoji: '😎' },
  { id: 'angel', name: 'Angel', emoji: '😇' },
  { id: 'hundred', name: 'Hundred', emoji: '💯' },
  { id: 'exclamation', name: 'Exclamation', emoji: '❗' },
  { id: 'hearts', name: 'Hearts', emoji: '💖' },
  { id: 'peace', name: 'Peace', emoji: '✌️' },
  { id: 'sparkles', name: 'Sparkles', emoji: '✨' },
  { id: 'shrug', name: 'Shrug', emoji: '🤷' },
  { id: 'shocked', name: 'Shocked', emoji: '😲' },
  { id: 'sweat', name: 'Sweat', emoji: '😅' },
  { id: 'numbered', name: 'Numbered', emoji: '#️⃣' },
  // New emoji sprites (locked by default for testing)
  { id: 'rocket', name: 'Rocket', emoji: '🚀' },
  { id: 'unicorn', name: 'Unicorn', emoji: '🦄' },
]

export const ALL_SPRITE_IDS: string[] = ALL_SPRITES.map(s => s.id)

export const SPRITE_EMOJI: Record<string, string> = Object.fromEntries(
  ALL_SPRITES.filter(s => s.emoji).map(s => [s.id, s.emoji as string])
)

// IDs that should be locked by default on fresh installs for testing
export const DEFAULT_LOCKED_SPRITES: string[] = ['pentagon', 'octagon', 'chevron', 'rocket', 'unicorn']

