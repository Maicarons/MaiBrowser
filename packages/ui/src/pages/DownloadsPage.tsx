import { displayUrl, formatBytes, truncate } from '@maibrowser/core'
import { formatDateTime } from '@maibrowser/i18n'
import { PrimaryButton } from '../primitives'
import type { DownloadItem, InternalPageProps } from '../types'
import { PageShell, RowAction } from './shared'

function stateLabel(state: string, t: InternalPageProps['t']): string {
  if (state === 'completed') return t('downloads.completed')
  if (state === 'failed') return t('downloads.failed')
  if (state === 'cancelled') return t('downloads.cancelled')
  if (state === 'paused') return t('downloads.paused')
  if (state === 'queued') return t('downloads.queued')
  return t('downloads.downloading')
}

function isActive(item: DownloadItem): boolean {
  return (
    item.state === 'downloading' ||
    item.state === 'queued' ||
    item.state === 'paused'
  )
}

export function DownloadsPage(props: InternalPageProps) {
  const { theme, t } = props
  const android = props.appInfo?.platform === 'android'
  return (
    <PageShell
      theme={theme}
      title={t('downloads.title')}
      subtitle={`${props.downloads.length} ${props.downloads.length === 1 ? 'file' : 'files'}`}
      motion={props.settings.motion}
      onBack={() => props.openInternal('newtab')}
      actions={
        <view style={{ display: 'flex', flexDirection: 'row' }}>
          <PrimaryButton
            label={t('common.reload')}
            theme={theme}
            kind="ghost"
            onTap={props.refreshDownloads}
          />
          {!android ? <view style={{ width: '8px' }} /> : null}
          {!android ? (
            <PrimaryButton
              label={t('downloads.showInFolder')}
              theme={theme}
              onTap={() => {
                const item = props.downloads[0]
                if (item?.filePath) props.showInFolder(item.filePath)
                else if (props.settings.downloadDir)
                  props.openPath(props.settings.downloadDir)
                else props.notify(t('downloads.empty'))
              }}
            />
          ) : null}
        </view>
      }
    >
      {props.downloads.length === 0 ? (
        <view
          style={{ paddingTop: '48px', display: 'flex', alignItems: 'center' }}
        >
          <text style={{ color: theme.textFaint, fontSize: '13px' }}>
            {t('downloads.empty')}
          </text>
        </view>
      ) : (
        <view
          style={{
            backgroundColor: theme.surface,
            borderRadius: '13px',
            borderWidth: '1px',
            borderColor: theme.border,
            paddingLeft: '13px',
            paddingRight: '13px',
          }}
        >
          {props.downloads.map((item, index) => {
            const active = isActive(item)
            const percent =
              item.totalBytes > 0
                ? Math.min(
                    100,
                    Math.round((item.receivedBytes / item.totalBytes) * 100),
                  )
                : 0
            return (
              <view
                key={item.id}
                className="list-row"
                style={{
                  borderBottomWidth:
                    index === props.downloads.length - 1 ? '0px' : '1px',
                  borderColor: theme.border,
                }}
              >
                <view className="list-main">
                  <text
                    className="list-title"
                    style={{ color: theme.text }}
                    text-maxline="1"
                  >
                    {item.fileName || displayUrl(item.url)}
                  </text>
                  <text
                    className="list-sub"
                    style={{ color: theme.textFaint }}
                    text-maxline="1"
                  >
                    {truncate(item.url, 72)}
                  </text>
                  <text
                    style={{
                      color: theme.textFaint,
                      fontSize: '10px',
                      marginTop: '3px',
                    }}
                  >
                    {stateLabel(item.state, t)} ·{' '}
                    {formatBytes(item.receivedBytes)}
                    {item.totalBytes > 0
                      ? ` / ${formatBytes(item.totalBytes)}`
                      : ''}{' '}
                    · {formatDateTime(item.startedAt, props.locale)}
                    {active && item.totalBytes > 0 ? ` · ${percent}%` : ''}
                  </text>
                  {active ? (
                    <view
                      style={{
                        height: '3px',
                        backgroundColor: theme.border,
                        borderRadius: '2px',
                        marginTop: '6px',
                        marginBottom: '2px',
                      }}
                    >
                      <view
                        style={{
                          height: '3px',
                          width: `${percent}%`,
                          backgroundColor: theme.accent,
                          borderRadius: '2px',
                        }}
                      />
                    </view>
                  ) : null}
                  {item.error ? (
                    <text
                      style={{
                        color: theme.danger,
                        fontSize: '10px',
                        marginTop: '2px',
                      }}
                    >
                      {item.error}
                    </text>
                  ) : null}
                </view>
                <view className="list-actions">
                  {item.state === 'completed' ? (
                    <RowAction
                      theme={theme}
                      label={t('downloads.open')}
                      onTap={() => {
                        if (item.filePath) props.openPath(item.filePath)
                      }}
                    />
                  ) : null}
                  {item.state === 'completed' && !android ? (
                    <RowAction
                      theme={theme}
                      label={t('downloads.showInFolder')}
                      onTap={() => {
                        if (item.filePath) props.showInFolder(item.filePath)
                      }}
                    />
                  ) : null}
                  {item.state === 'downloading' && !android ? (
                    <RowAction
                      theme={theme}
                      label={t('downloads.pause')}
                      onTap={() => props.pauseDownload(item)}
                    />
                  ) : null}
                  {item.state === 'paused' && !android ? (
                    <RowAction
                      theme={theme}
                      label={t('downloads.resume')}
                      onTap={() => props.resumeDownload(item)}
                    />
                  ) : null}
                  {active ? (
                    <RowAction
                      theme={theme}
                      label={t('downloads.cancel')}
                      danger
                      onTap={() => props.cancelDownload(item)}
                    />
                  ) : null}
                  {item.state === 'failed' || item.state === 'cancelled' ? (
                    <RowAction
                      theme={theme}
                      label={t('downloads.retry')}
                      onTap={() => props.retryDownload(item)}
                    />
                  ) : null}
                  <RowAction
                    theme={theme}
                    label={t('downloads.remove')}
                    danger
                    onTap={() => props.deleteDownload(item.id)}
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
