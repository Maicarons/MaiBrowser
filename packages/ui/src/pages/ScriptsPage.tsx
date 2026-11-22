import { Switch, SwitchThumb, SwitchTrack } from '@lynx-js/lynx-ui'
import { useState } from '@lynx-js/react'
import { Badge, PrimaryButton, TextField } from '../primitives'
import type { InternalPageProps } from '../types'
import { PageShell, RowAction } from './shared'

function metaList(metadata: string, key: string): string[] {
  try {
    const parsed = JSON.parse(metadata) as Record<string, unknown>
    const value = parsed[key]
    return Array.isArray(value) ? value.map(String) : []
  } catch {
    return []
  }
}

export function ScriptsPage(props: InternalPageProps) {
  const { theme, t } = props
  const [url, setUrl] = useState('')
  const [source, setSource] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showSource, setShowSource] = useState(false)
  const [updating, setUpdating] = useState(false)

  const checkUpdates = async () => {
    if (updating) return
    setUpdating(true)
    try {
      await props.checkScriptUpdates()
    } finally {
      setUpdating(false)
    }
  }

  const install = async () => {
    setError('')
    if (!url.trim() && !source.trim()) {
      setError(t('scripts.installHint'))
      return
    }
    setBusy(true)
    try {
      const fetched = url.trim() ? await props.fetchScript(url.trim()) : source
      await props.installScript(fetched, url.trim() || undefined)
      setUrl('')
      setSource('')
      props.notify(t('common.save'))
    } catch (installError) {
      setError(
        installError instanceof Error
          ? installError.message
          : String(installError),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageShell
      theme={theme}
      title={t('scripts.title')}
      subtitle={`${props.scripts.length} installed · ${t('scripts.installConfirm')}`}
      motion={props.settings.motion}
      onBack={() => props.openInternal('newtab')}
      actions={
        <view
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <PrimaryButton
            label={updating ? t('common.loading') : t('scripts.checkUpdates')}
            theme={theme}
            kind="ghost"
            onTap={updating ? undefined : () => void checkUpdates()}
            disabled={updating}
          />
          <view style={{ width: '8px' }} />
          <PrimaryButton
            label={
              showSource ? t('scripts.installFromUrl') : t('scripts.install')
            }
            theme={theme}
            kind="ghost"
            onTap={() => setShowSource(!showSource)}
          />
        </view>
      }
    >
      <view
        className="section-card"
        style={{ backgroundColor: theme.surface, borderColor: theme.border }}
      >
        <text
          style={{
            color: theme.text,
            fontSize: '13px',
            fontWeight: '700',
            marginBottom: '4px',
          }}
        >
          {t('scripts.install')}
        </text>
        <text
          style={{
            color: theme.textMuted,
            fontSize: '11px',
            lineHeight: '17px',
            marginBottom: '10px',
          }}
        >
          {t('scripts.installHint')}
        </text>
        <TextField
          theme={theme}
          value={url}
          placeholder="https://example.com/script.user.js"
          onInput={setUrl}
        />
        {showSource ? (
          <TextField
            theme={theme}
            value={source}
            placeholder="// ==UserScript== ... // ==/UserScript=="
            onInput={setSource}
            multiline
          />
        ) : null}
        {error ? (
          <text
            style={{
              color: theme.danger,
              fontSize: '11px',
              marginBottom: '8px',
            }}
          >
            {error}
          </text>
        ) : null}
        <view
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'flex-end',
          }}
        >
          <PrimaryButton
            label={busy ? t('common.loading') : t('scripts.install')}
            theme={theme}
            onTap={busy ? undefined : install}
            disabled={busy}
          />
        </view>
      </view>

      {props.scripts.length === 0 ? (
        <view
          style={{ paddingTop: '28px', display: 'flex', alignItems: 'center' }}
        >
          <text style={{ color: theme.textFaint, fontSize: '13px' }}>
            {t('scripts.empty')}
          </text>
        </view>
      ) : (
        <view>
          {props.scripts.map((script) => {
            const matches = [
              ...metaList(script.metadata, 'match'),
              ...metaList(script.metadata, 'include'),
            ]
            const grants = metaList(script.metadata, 'grant')
            return (
              <view
                key={script.id}
                className="script-card"
                style={{
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                }}
              >
                <view
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <view style={{ flex: 1, minWidth: 0 }}>
                    <view
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}
                    >
                      <text
                        style={{
                          color: theme.text,
                          fontSize: '13px',
                          fontWeight: '700',
                        }}
                        text-maxline="1"
                      >
                        {script.name}
                      </text>
                      <view style={{ width: '7px' }} />
                      <Badge
                        theme={theme}
                        label={`v${script.version || '0.0.0'}`}
                      />
                    </view>
                    <text
                      style={{
                        color: theme.textMuted,
                        fontSize: '11px',
                        marginTop: '3px',
                      }}
                      text-maxline="2"
                    >
                      {script.description || script.namespace || script.id}
                    </text>
                  </view>
                  <Switch
                    className="switch"
                    checked={script.enabled}
                    onChange={(checked: boolean) =>
                      props.toggleScript(script.id, checked)
                    }
                  >
                    <SwitchTrack
                      className="switch-track"
                      style={{
                        backgroundColor: script.enabled
                          ? theme.accent
                          : theme.borderStrong,
                      }}
                    />
                    <SwitchThumb
                      className="switch-thumb"
                      style={{ backgroundColor: theme.surface }}
                    />
                  </Switch>
                </view>

                <view className="badge-row">
                  <view className="badge-gap">
                    <Badge
                      theme={theme}
                      label={
                        script.enabled
                          ? t('scripts.enabled')
                          : t('scripts.disabled')
                      }
                      accent={script.enabled}
                    />
                  </view>
                  {grants.length > 0 ? (
                    <view className="badge-gap">
                      <Badge
                        theme={theme}
                        label={`${t('scripts.gmApis')}: ${grants.length}`}
                      />
                    </view>
                  ) : null}
                  {matches.slice(0, 2).map((match) => (
                    <view key={match} className="badge-gap">
                      <Badge theme={theme} label={match} />
                    </view>
                  ))}
                </view>

                <view
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'flex-end',
                    marginTop: '8px',
                  }}
                >
                  <RowAction
                    theme={theme}
                    label={t('scripts.delete')}
                    danger
                    onTap={() => props.deleteScript(script.id)}
                  />
                </view>
              </view>
            )
          })}
        </view>
      )}
    </PageShell>
  )
}
