import { Icon } from '../primitives'
import type { InternalPageProps } from '../types'
import { SettingsGroup } from './settingsShared'
import { PageShell } from './shared'

export function LanguagePage(props: InternalPageProps) {
  const { theme, t, settings } = props
  const options = [
    { value: 'zh-Hans', label: '中文', hint: '简体中文' },
    { value: 'en', label: 'English', hint: 'English (United States)' },
  ] as const
  return (
    <PageShell
      theme={theme}
      title={t('settings.language')}
      subtitle={t('language.subtitle')}
      motion={props.settings.motion}
      onBack={() => props.openInternal('settings')}
    >
      <SettingsGroup theme={theme}>
        {options.map((option, index) => {
          const active = settings.locale === option.value
          return (
            <view
              key={option.value}
              className="settings-choice"
              style={{
                backgroundColor: active ? theme.accentSoft : 'transparent',
                borderBottomWidth: index === options.length - 1 ? '0px' : '1px',
                borderColor: theme.border,
              }}
              accessibility-label={option.label}
              bindtap={() => props.updateSettings({ locale: option.value })}
            >
              <view
                className="settings-choice-icon"
                style={{
                  backgroundColor: active ? theme.surface : theme.surfaceAlt,
                }}
              >
                <Icon
                  name="globe"
                  size={15}
                  color={active ? theme.accent : theme.textMuted}
                />
              </view>
              <view className="settings-choice-copy">
                <text
                  className="settings-choice-title"
                  style={{ color: theme.text }}
                >
                  {option.label}
                </text>
                <text
                  className="settings-choice-hint"
                  style={{ color: theme.textMuted }}
                >
                  {option.hint}
                </text>
              </view>
              {active ? (
                <Icon name="check" size={17} color={theme.accent} />
              ) : null}
            </view>
          )
        })}
      </SettingsGroup>
      <text className="settings-copy" style={{ color: theme.textMuted }}>
        {t('language.hint')}
      </text>
    </PageShell>
  )
}
