import { Icon, PrimaryButton } from '../primitives'
import type { InternalPageProps } from '../types'
import { SettingsGroup, SettingsRow } from './settingsShared'
import { PageShell } from './shared'

export function StoragePage(props: InternalPageProps) {
  const { theme, t } = props
  const stats = [
    { label: t('storage.history'), value: props.history.length },
    { label: t('storage.bookmarks'), value: props.bookmarks.length },
    { label: t('storage.scripts'), value: props.scripts.length },
    { label: t('storage.downloads'), value: props.downloads.length },
  ]
  return (
    <PageShell
      theme={theme}
      title={t('settings.storage')}
      subtitle={t('storage.subtitle')}
      motion={props.settings.motion}
      onBack={() => props.openInternal('settings')}
    >
      <SettingsGroup theme={theme}>
        <view className="storage-grid">
          {stats.map((stat) => (
            <view
              key={stat.label}
              className="storage-stat"
              style={{ backgroundColor: theme.surfaceAlt }}
            >
              <text
                className="storage-stat-value"
                style={{ color: theme.text }}
              >
                {stat.value}
              </text>
              <text
                className="storage-stat-label"
                style={{ color: theme.textMuted }}
              >
                {stat.label}
              </text>
            </view>
          ))}
        </view>
      </SettingsGroup>

      <SettingsGroup theme={theme} title={t('storage.paths')}>
        <SettingsRow
          theme={theme}
          title={t('settings.storagePath')}
          hint={props.appInfo?.dbPath}
        >
          <Icon name="folder" size={16} color={theme.textFaint} />
        </SettingsRow>
        <SettingsRow
          theme={theme}
          title={t('storage.dataFolder')}
          hint={props.appInfo?.dataPath}
          last
        >
          <PrimaryButton
            label={t('settings.openDataFolder')}
            theme={theme}
            kind="ghost"
            onTap={() => {
              if (props.appInfo?.dataPath)
                props.openPath(props.appInfo.dataPath)
            }}
          />
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup theme={theme} title={t('storage.maintenance')}>
        <view className="settings-info-row">
          <view
            className="settings-info-icon"
            style={{ backgroundColor: theme.accentSoft }}
          >
            <Icon name="lock" size={17} color={theme.accent} />
          </view>
          <text className="settings-copy" style={{ color: theme.textMuted }}>
            {t('storage.localHint')}
          </text>
        </view>
        <view style={{ display: 'flex', marginTop: '12px' }}>
          <PrimaryButton
            label={t('settings.clearData')}
            theme={theme}
            kind="danger"
            onTap={() => props.openInternal('privacy')}
          />
        </view>
      </SettingsGroup>
    </PageShell>
  )
}
