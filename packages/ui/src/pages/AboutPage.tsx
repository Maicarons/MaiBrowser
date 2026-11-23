import type { InternalPageProps } from '../types'
import { PageShell } from './shared'

export function AboutPage(props: InternalPageProps) {
  const { theme, t, appInfo } = props
  return (
    <PageShell
      theme={theme}
      title={t('menu.about')}
      subtitle={appInfo?.versionLabel}
      motion={props.settings.motion}
      onBack={() => props.openInternal('newtab')}
    >
      <view
        className="section-card"
        style={{ backgroundColor: theme.surface, borderColor: theme.border }}
      >
        <text
          style={{ color: theme.text, fontSize: '20px', fontWeight: '800' }}
        >
          MaiBrowser
        </text>
        <text
          style={{
            color: theme.textMuted,
            fontSize: '12px',
            marginTop: '4px',
            lineHeight: '19px',
          }}
        >
          {t('welcome.subtitle')}
        </text>
        <view style={{ height: '12px' }} />
        <text style={{ color: theme.textMuted, fontSize: '11px' }}>
          Version {appInfo?.version ?? '0.1.2'} ·{' '}
          {appInfo?.platform ?? 'windows'}
        </text>
        <text
          style={{ color: theme.textMuted, fontSize: '11px', marginTop: '4px' }}
        >
          Engine: {appInfo?.engine ?? 'Lynxtron + CEF'}
        </text>
        <text
          style={{ color: theme.textMuted, fontSize: '11px', marginTop: '4px' }}
        >
          License: AGPL-3.0
        </text>
      </view>

      <view
        className="section-card"
        style={{ backgroundColor: theme.surface, borderColor: theme.border }}
      >
        <text
          style={{
            color: theme.text,
            fontSize: '13px',
            fontWeight: '700',
            marginBottom: '8px',
          }}
        >
          Built with
        </text>
        <text
          style={{
            color: theme.textMuted,
            fontSize: '11.5px',
            lineHeight: '20px',
          }}
        >
          Lynx 4.x · ReactLynx · @lynx-js/lynx-ui · @lynx-js/motion
        </text>
        <text
          style={{
            color: theme.textMuted,
            fontSize: '11.5px',
            lineHeight: '20px',
          }}
        >
          CEF · DuckDB · Bun · TypeScript
        </text>
        <view style={{ height: '10px' }} />
        <text
          style={{
            color: theme.textMuted,
            fontSize: '11.5px',
            lineHeight: '20px',
          }}
        >
          A local-first browser. History, bookmarks and userscripts stay on this
          device.
        </text>
      </view>

      <view
        className="section-card"
        style={{ backgroundColor: theme.surface, borderColor: theme.border }}
      >
        <text
          style={{
            color: theme.text,
            fontSize: '13px',
            fontWeight: '700',
            marginBottom: '8px',
          }}
        >
          Data
        </text>
        <text
          style={{
            color: theme.textMuted,
            fontSize: '11px',
            lineHeight: '18px',
          }}
        >
          {appInfo?.dbPath || 'maibrowser.duckdb'}
        </text>
        <view style={{ height: '8px' }} />
        <text
          style={{
            color: theme.textFaint,
            fontSize: '10px',
            lineHeight: '16px',
          }}
        >
          MaiBrowser is free software under the GNU Affero General Public
          License v3.0.
        </text>
      </view>
    </PageShell>
  )
}
