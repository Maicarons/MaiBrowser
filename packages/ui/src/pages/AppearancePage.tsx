import { Switch, SwitchThumb, SwitchTrack } from '@lynx-js/lynx-ui'
import { MotionView } from '../motion'
import { Icon, PrimaryButton } from '../primitives'
import type { AccentId } from '../theme'
import { ACCENTS } from '../theme'
import type { InternalPageProps, ThemePreference } from '../types'
import { SettingsGroup, SettingsRow } from './settingsShared'
import { PageShell } from './shared'

const PREVIEWS = {
  light: {
    bg: '#eef1f5',
    surface: '#ffffff',
    bar: '#dde3ea',
    text: '#111820',
  },
  dark: {
    bg: '#0a0f13',
    surface: '#111a20',
    bar: '#22313b',
    text: '#e8f0f4',
  },
} as const

function ThemePreview(props: {
  mode: 'light' | 'dark'
  accent: string
  compact?: boolean
}) {
  const preview = PREVIEWS[props.mode]
  return (
    <view
      className={props.compact ? 'theme-preview compact' : 'theme-preview'}
      style={{ backgroundColor: preview.bg }}
    >
      <view
        className="theme-preview-bar"
        style={{ backgroundColor: preview.surface, borderColor: preview.bar }}
      >
        <view
          style={{
            width: '5px',
            height: '5px',
            borderRadius: '3px',
            backgroundColor: props.accent,
          }}
        />
        <view className="theme-preview-dots">
          <view
            style={{
              width: '12px',
              height: '3px',
              borderRadius: '2px',
              backgroundColor: preview.bar,
            }}
          />
          <view
            style={{
              width: '8px',
              height: '3px',
              borderRadius: '2px',
              backgroundColor: preview.bar,
            }}
          />
        </view>
      </view>
      <view className="theme-preview-body">
        <view
          style={{
            width: '38%',
            height: '5px',
            borderRadius: '3px',
            backgroundColor: preview.text,
          }}
        />
        <view
          style={{
            width: '64%',
            height: '3px',
            borderRadius: '2px',
            backgroundColor: preview.bar,
            marginTop: '6px',
          }}
        />
        <view
          style={{
            width: '52%',
            height: '3px',
            borderRadius: '2px',
            backgroundColor: preview.bar,
            marginTop: '4px',
          }}
        />
        <view
          style={{
            width: '28%',
            height: '10px',
            borderRadius: '5px',
            backgroundColor: props.accent,
            marginTop: '8px',
          }}
        />
      </view>
    </view>
  )
}

export function AppearancePage(props: InternalPageProps) {
  const { theme, t, settings } = props
  const modeOptions: {
    value: ThemePreference
    label: string
    icon: 'monitor' | 'sun' | 'moon'
  }[] = [
    { value: 'system', label: t('settings.themeSystem'), icon: 'monitor' },
    { value: 'light', label: t('settings.themeLight'), icon: 'sun' },
    { value: 'dark', label: t('settings.themeDark'), icon: 'moon' },
  ]

  return (
    <PageShell
      theme={theme}
      title={t('settings.appearance')}
      subtitle={t('appearance.subtitle')}
      motion={props.settings.motion}
      onBack={() => props.openInternal('settings')}
    >
      <SettingsGroup theme={theme} title={t('appearance.mode')}>
        <view className="theme-mode-grid">
          {modeOptions.map((option, index) => {
            const active = settings.theme === option.value
            return (
              <view
                key={option.value}
                className="theme-mode-card"
                style={{
                  backgroundColor: active ? theme.accentSoft : theme.surfaceAlt,
                  borderColor: active ? theme.accent : theme.border,
                  marginRight: index === modeOptions.length - 1 ? '0px' : '7px',
                }}
                accessibility-label={option.label}
                bindtap={() => props.updateSettings({ theme: option.value })}
              >
                <ThemePreview
                  mode={
                    option.value === 'dark'
                      ? 'dark'
                      : option.value === 'light'
                        ? 'light'
                        : theme.mode
                  }
                  accent={theme.accent}
                  compact
                />
                <view className="theme-mode-label">
                  <Icon
                    name={option.icon}
                    size={14}
                    color={active ? theme.accent : theme.textMuted}
                  />
                  <text
                    className="theme-mode-text"
                    style={{
                      color: active ? theme.accent : theme.textMuted,
                    }}
                  >
                    {option.label}
                  </text>
                </view>
                {active ? (
                  <view
                    className="theme-mode-check"
                    style={{ backgroundColor: theme.accent }}
                  >
                    <Icon name="check" size={10} color={theme.accentText} />
                  </view>
                ) : null}
              </view>
            )
          })}
        </view>
      </SettingsGroup>

      <SettingsGroup theme={theme} title={t('appearance.accent')}>
        <text className="settings-copy" style={{ color: theme.textMuted }}>
          {t('appearance.accentHint')}
        </text>
        <view className="accent-grid">
          {ACCENTS.map((accent) => {
            const active = settings.accent === accent.id
            return (
              <view
                key={accent.id}
                className="accent-swatch-wrap"
                accessibility-label={accent.id}
                bindtap={() =>
                  props.updateSettings({ accent: accent.id as AccentId })
                }
              >
                <view
                  className="accent-swatch"
                  style={{
                    backgroundColor: accent.color[theme.mode],
                    borderColor: active ? theme.text : 'transparent',
                  }}
                >
                  {active ? (
                    <Icon
                      name="check"
                      size={16}
                      color={accent.text[theme.mode]}
                    />
                  ) : null}
                </view>
              </view>
            )
          })}
        </view>
      </SettingsGroup>

      <SettingsGroup theme={theme} title={t('appearance.motion')}>
        <SettingsRow
          theme={theme}
          title={t('appearance.motionTitle')}
          hint={t('appearance.motionHint')}
          last
        >
          <Switch
            className="switch"
            checked={settings.motion}
            onChange={(checked: boolean) =>
              props.updateSettings({ motion: checked })
            }
          >
            <SwitchTrack
              className="switch-track"
              style={{
                backgroundColor: settings.motion
                  ? theme.accent
                  : theme.borderStrong,
              }}
            />
            <SwitchThumb
              className="switch-thumb"
              style={{ backgroundColor: theme.surface }}
            />
          </Switch>
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup theme={theme} title={t('appearance.interface')}>
        <SettingsRow
          theme={theme}
          title={t('settings.bookmarksBar')}
          hint={t('settings.bookmarksBarHint')}
          last
        >
          <Switch
            className="switch"
            checked={settings.showBookmarksBar}
            onChange={(checked: boolean) =>
              props.updateSettings({ showBookmarksBar: checked })
            }
          >
            <SwitchTrack
              className="switch-track"
              style={{
                backgroundColor: settings.showBookmarksBar
                  ? theme.accent
                  : theme.borderStrong,
              }}
            />
            <SwitchThumb
              className="switch-thumb"
              style={{ backgroundColor: theme.surface }}
            />
          </Switch>
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup theme={theme} title={t('appearance.preview')}>
        <MotionView
          key={`${theme.mode}-${settings.accent}`}
          enabled={settings.motion}
          style={{ display: 'flex', width: '100%' }}
        >
          <ThemePreview mode={theme.mode} accent={theme.accent} />
        </MotionView>
        <view className="appearance-preview-footer">
          <text className="settings-copy" style={{ color: theme.textMuted }}>
            {t('appearance.previewHint')}
          </text>
          <PrimaryButton
            label={t('appearance.reset')}
            theme={theme}
            kind="ghost"
            onTap={() => {
              props.updateSettings({
                theme: 'system',
                accent: 'teal',
                motion: true,
              })
              props.notify(t('appearance.resetDone'))
            }}
          />
        </view>
      </SettingsGroup>
    </PageShell>
  )
}
