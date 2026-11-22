import { displayUrl, formatBytes, truncate } from '@maibrowser/core'
import { formatDateTime } from '@maibrowser/i18n'
import { PrimaryButton } from '../primitives'
import type { InternalPageProps } from '../types'
import { PageShell, RowAction } from './shared'

function stateLabel(state: string, t: InternalPageProps['t']): string {
  if (state === 'completed') return t('downloads.completed')
  if (state === 'failed' || state === 'cancelled') return t('downloads.failed')
  return t('downloads.downloading')
}

export function DownloadsPage(props: InternalPageProps) {
  const { theme, t } = props
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
          <view style={{ width: '8px' }} />
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
          {props.downloads.map((item, index) => (
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
                </text>
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
                <RowAction
                  theme={theme}
                  label={t('downloads.open')}
                  onTap={() => {
                    if (item.filePath) props.openPath(item.filePath)
                  }}
                />
                <RowAction
                  theme={theme}
                  label={t('downloads.showInFolder')}
                  onTap={() => {
                    if (item.filePath) props.showInFolder(item.filePath)
                  }}
                />
                <RowAction
                  theme={theme}
                  label={t('downloads.remove')}
                  danger
                  onTap={() => props.deleteDownload(item.id)}
                />
              </view>
            </view>
          ))}
        </view>
      )}
    </PageShell>
  )
}
