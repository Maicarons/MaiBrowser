import { Icon } from '../primitives'
import type { InternalPageProps } from '../types'
import { SettingsGroup } from './settingsShared'
import { PageShell } from './shared'

function engineHost(template: string): string {
  return (
    template
      .replace(/^https?:\/\//, '')
      .split('/')[0]
      ?.replace(/^www\./, '') ?? template
  )
}

export function SearchSettingsPage(props: InternalPageProps) {
  const { theme, t, settings } = props
  return (
    <PageShell
      theme={theme}
      title={t('settings.searchEngine')}
      subtitle={t('searchSettings.subtitle')}
      motion={props.settings.motion}
      onBack={() => props.openInternal('settings')}
    >
      <SettingsGroup theme={theme}>
        {props.searchEngines.map((engine, index) => {
          const active = settings.searchEngineId === engine.id
          return (
            <view
              key={engine.id}
              className="settings-choice"
              style={{
                backgroundColor: active ? theme.accentSoft : 'transparent',
                borderBottomWidth:
                  index === props.searchEngines.length - 1 ? '0px' : '1px',
                borderColor: theme.border,
              }}
              accessibility-label={engine.name}
              bindtap={() =>
                props.updateSettings({ searchEngineId: engine.id })
              }
            >
              <view
                className="settings-choice-icon"
                style={{
                  backgroundColor: active ? theme.surface : theme.surfaceAlt,
                }}
              >
                <Icon
                  name="search"
                  size={15}
                  color={active ? theme.accent : theme.textMuted}
                />
              </view>
              <view className="settings-choice-copy">
                <text
                  className="settings-choice-title"
                  style={{ color: theme.text }}
                >
                  {engine.name}
                </text>
                <text
                  className="settings-choice-hint"
                  style={{ color: theme.textMuted }}
                >
                  {engineHost(engine.template)}
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
        {t('searchSettings.hint')}
      </text>
    </PageShell>
  )
}
