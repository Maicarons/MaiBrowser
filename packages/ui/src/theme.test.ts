import { describe, expect, test } from 'bun:test'
import { ACCENTS, accentFor, themeFor } from './theme'
import { DEFAULT_SETTINGS } from './types'

describe('theme appearance', () => {
  test('applies the selected accent in both modes', () => {
    const light = themeFor('light', 'azure')
    expect(light.accent).toBe('#2563eb')
    expect(light.accentSoft).toBe('#e3edff')
    expect(light.accentText).toBe('#ffffff')
    const dark = themeFor('dark', 'azure')
    expect(dark.accent).toBe('#60a5fa')
    expect(dark.accentSoft).toBe('#14284d')
  })

  test('exposes every accent and falls back safely', () => {
    expect(ACCENTS).toHaveLength(7)
    expect(accentFor('teal').id).toBe('teal')
    expect(accentFor('missing' as never).id).toBe('teal')
  })

  test('ships a complete default appearance', () => {
    expect(DEFAULT_SETTINGS.theme).toBe('system')
    expect(DEFAULT_SETTINGS.accent).toBe('teal')
    expect(DEFAULT_SETTINGS.motion).toBe(true)
  })
})
