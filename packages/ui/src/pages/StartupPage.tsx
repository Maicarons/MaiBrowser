import { Switch, SwitchThumb, SwitchTrack } from '@lynx-js/lynx-ui'
import { useState } from '@lynx-js/react'
import { PrimaryButton, TextField } from '../primitives'
import type { InternalPageProps } from '../types'
import { SettingsGroup, SettingsRow } from './settingsShared'
import { PageShell } from './shared'

export function StartupPage(props: InternalPageProps) {
  const { theme, t, settings } = props
  const [homepage, setHomepage] = useState(settings.homepage)

  return (
    <PageShell
      theme={theme}
      title={t('settings.startup')}
      subtitle={t('startup.subtitle')}
      motion={props.settings.motion}
      onBack={() => props.openInternal('settings')}
    >
      <SettingsGroup theme={theme} title={t('startup.homepage')}>
        <text className="settings-copy" style={{ color: theme.textMuted }}>
          {t('startup.homepageHint')}
        </text>
        <view className="input-row">
          <view style={{ flex: 1, marginRight: '8px' }}>
            <TextField
              theme={theme}
              value={homepage}
              placeholder="maibrowser://newtab"
              onInput={setHomepage}
            />
          </view>
          <PrimaryButton
            label={t('common.save')}
            theme={theme}
            onTap={() => {
              props.updateSettings({
                homepage: homepage.trim() || 'maibrowser://newtab',
              })
              props.notify(t('common.save'))
            }}
          />
        </view>
      </SettingsGroup>

      <SettingsGroup theme={theme} title={t('settings.startup')}>
        <SettingsRow
          theme={theme}
          title={t('settings.restoreTabs')}
          hint={t('settings.restoreTabsHint')}
          last
        >
          <Switch
            className="switch"
            checked={settings.restoreTabs}
            onChange={(checked: boolean) =>
              props.updateSettings({ restoreTabs: checked })
            }
          >
            <SwitchTrack
              className="switch-track"
              style={{
                backgroundColor: settings.restoreTabs
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
    </PageShell>
  )
}
