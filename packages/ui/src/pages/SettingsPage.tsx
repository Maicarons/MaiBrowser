import { accentFor } from '../theme'
import type { InternalPageProps } from '../types'
import { SettingsGroup, SettingsLinkRow } from './settingsShared'
import { PageShell } from './shared'

export function SettingsPage(props: InternalPageProps) {
  const { theme, t, settings } = props
  const accent = accentFor(settings.accent)
  const engine =
    props.searchEngines.find((item) => item.id === settings.searchEngineId) ??
    props.searchEngine
  const themeLabel =
    settings.theme === 'system'
      ? t('settings.themeSystem')
      : settings.theme === 'dark'
        ? t('settings.themeDark')
        : t('settings.themeLight')
  const accentName =
    accent.id === 'azure'
      ? t('settings.accentAzure')
      : accent.id === 'violet'
        ? t('settings.accentViolet')
        : accent.id === 'rose'
          ? t('settings.accentRose')
          : accent.id === 'amber'
            ? t('settings.accentAmber')
            : accent.id === 'lime'
              ? t('settings.accentLime')
              : accent.id === 'graphite'
                ? t('settings.accentGraphite')
                : t('settings.accentTeal')

  return (
    <PageShell
      theme={theme}
      title={t('settings.title')}
      subtitle={props.appInfo?.versionLabel ?? ''}
      motion={props.settings.motion}
      onBack={() => props.openInternal('newtab')}
    >
      <view
        className="settings-profile"
        style={{ backgroundColor: theme.surface, borderColor: theme.border }}
      >
        <view
          className="settings-profile-mark"
          style={{ backgroundColor: theme.accent }}
        >
          <text
            className="settings-profile-mark-text"
            style={{ color: theme.accentText }}
          >
            M
          </text>
        </view>
        <view className="settings-profile-copy">
          <text
            className="settings-profile-title"
            style={{ color: theme.text }}
          >
            MaiBrowser
          </text>
          <text
            className="settings-profile-hint"
            style={{ color: theme.textMuted }}
          >
            {t('settings.profileHint')}
          </text>
        </view>
        <text
          className="settings-profile-version"
          style={{ color: theme.textFaint }}
        >
          v{props.appInfo?.version ?? '0.1.0'}
        </text>
      </view>

      <SettingsGroup theme={theme} title={t('settings.groupBrowse')}>
        <SettingsLinkRow
          theme={theme}
          icon="palette"
          title={t('settings.appearance')}
          hint={t('settings.appearanceHint')}
          value={`${themeLabel} · ${accentName}`}
          onTap={() => props.openInternal('appearance')}
        />
        <SettingsLinkRow
          theme={theme}
          icon="search"
          title={t('settings.searchEngine')}
          hint={t('settings.searchEngineHint')}
          value={engine.name}
          onTap={() => props.openInternal('search')}
        />
        <SettingsLinkRow
          theme={theme}
          icon="home"
          title={t('settings.startup')}
          hint={t('settings.startupHint')}
          onTap={() => props.openInternal('startup')}
        />
        <SettingsLinkRow
          theme={theme}
          icon="globe"
          title={t('settings.language')}
          hint={t('settings.languageHint')}
          value={
            settings.locale === 'en' ? 'English' : t('settings.languageZh')
          }
          onTap={() => props.openInternal('language')}
          last
        />
      </SettingsGroup>

      <SettingsGroup theme={theme} title={t('settings.groupPrivacy')}>
        <SettingsLinkRow
          theme={theme}
          icon="shield"
          title={t('settings.privacy')}
          hint={t('settings.privacyHint')}
          onTap={() => props.openInternal('privacy')}
        />
        <SettingsLinkRow
          theme={theme}
          icon="script"
          title={t('settings.scripts')}
          hint={t('settings.scriptsHint')}
          onTap={() => props.openInternal('scripts')}
          last
        />
      </SettingsGroup>

      <SettingsGroup theme={theme} title={t('settings.groupSystem')}>
        <SettingsLinkRow
          theme={theme}
          icon="download"
          title={t('settings.downloads')}
          hint={t('settings.downloadsHint')}
          onTap={() => props.openInternal('download-settings')}
        />
        <SettingsLinkRow
          theme={theme}
          icon="folder"
          title={t('settings.storage')}
          hint={t('settings.storageHint')}
          onTap={() => props.openInternal('storage')}
        />
        <SettingsLinkRow
          theme={theme}
          icon="info"
          title={t('settings.about')}
          hint={t('settings.aboutHint')}
          value={props.appInfo?.versionLabel ?? ''}
          onTap={() => props.openInternal('about')}
          last
        />
      </SettingsGroup>

      <view className="settings-footer">
        <text
          className="settings-footer-text"
          style={{ color: theme.textFaint }}
        >
          MaiBrowser · AGPL-3.0
        </text>
      </view>
    </PageShell>
  )
}
