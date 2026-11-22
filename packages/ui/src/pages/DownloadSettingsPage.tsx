import { Icon, PrimaryButton } from '../primitives'
import type { InternalPageProps } from '../types'
import { SettingsGroup, SettingsRow } from './settingsShared'
import { PageShell } from './shared'

export function DownloadSettingsPage(props: InternalPageProps) {
  const { theme, t, settings } = props
  const folder = settings.downloadDir || props.appInfo?.downloadsPath || ''
  return (
    <PageShell
      theme={theme}
      title={t('settings.downloads')}
      subtitle={t('downloadSettings.subtitle')}
      motion={props.settings.motion}
      onBack={() => props.openInternal('settings')}
    >
      <SettingsGroup theme={theme} title={t('downloadSettings.location')}>
        <view className="settings-info-row">
          <view
            className="settings-info-icon"
            style={{ backgroundColor: theme.accentSoft }}
          >
            <Icon name="folder" size={17} color={theme.accent} />
          </view>
          <view className="settings-info-copy">
            <text
              className="settings-choice-title"
              style={{ color: theme.text }}
            >
              {t('downloadSettings.folder')}
            </text>
            <text
              className="settings-choice-hint"
              style={{ color: theme.textMuted }}
              text-maxline="2"
            >
              {folder || t('downloadSettings.unavailable')}
            </text>
          </view>
        </view>
        <view style={{ display: 'flex', marginTop: '12px' }}>
          <PrimaryButton
            label={t('downloadSettings.openFolder')}
            theme={theme}
            kind="ghost"
            disabled={!folder}
            onTap={() => {
              if (folder) props.openPath(folder)
            }}
          />
        </view>
      </SettingsGroup>

      <SettingsGroup theme={theme}>
        <SettingsRow
          theme={theme}
          title={t('downloadSettings.manage')}
          hint={t('downloadSettings.manageHint')}
          last
        >
          <PrimaryButton
            label={t('common.open')}
            theme={theme}
            kind="ghost"
            onTap={() => props.openInternal('downloads')}
          />
        </SettingsRow>
      </SettingsGroup>
    </PageShell>
  )
}
