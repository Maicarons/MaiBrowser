import { describe, expect, test } from 'bun:test'
import { createTranslator, formatDateTime, translate } from './index'

describe('i18n', () => {
  test('translates Chinese and English strings', () => {
    expect(translate('zh-Hans', 'common.cancel')).toBe('取消')
    expect(translate('en', 'common.cancel')).toBe('Cancel')
    expect(translate('zh-Hans', 'app.name')).toBe('MaiBrowser')
  })

  test('interpolates parameters', () => {
    expect(
      translate('en', 'address.searchWith', { engine: 'Bing', query: 'lynx' }),
    ).toContain('Bing')
    expect(
      translate('zh-Hans', 'address.searchWith', {
        engine: 'Bing',
        query: 'lynx',
      }),
    ).toContain('lynx')
  })

  test('creates a translator with locale normalization', () => {
    const translator = createTranslator('zh-CN')
    expect(translator.locale).toBe('zh-Hans')
    expect(translator.t('history.title')).toBe('历史记录')
    expect(createTranslator('fr').locale).toBe('en')
  })

  test('formats dates without throwing', () => {
    const value = formatDateTime(Date.UTC(2026, 0, 2, 3, 4), 'en')
    expect(value.length).toBeGreaterThan(0)
  })
})
