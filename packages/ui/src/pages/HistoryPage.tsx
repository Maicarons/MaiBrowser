import { useState } from '@lynx-js/react'
import { displayUrl, truncate } from '@maibrowser/core'
import { formatDateTime } from '@maibrowser/i18n'
import { PrimaryButton, TextField } from '../primitives'
import type { InternalPageProps } from '../types'
import { ConfirmModal, PageShell, RowAction } from './shared'

export function HistoryPage(props: InternalPageProps) {
  const { theme, t } = props
  const [query, setQuery] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)

  const search = () => props.refreshHistory(query)

  return (
    <PageShell
      theme={theme}
      title={t('history.title')}
      subtitle={t('history.searchPlaceholder')}
      motion={props.settings.motion}
      onBack={() => props.openInternal('newtab')}
      actions={
        <PrimaryButton
          label={t('history.clear')}
          theme={theme}
          kind="ghost"
          onTap={() => setConfirmClear(true)}
          disabled={props.history.length === 0}
        />
      }
    >
      <view className="input-row" style={{ marginBottom: '14px' }}>
        <view style={{ flex: 1, marginRight: '8px' }}>
          <TextField
            theme={theme}
            value={query}
            placeholder={t('history.searchPlaceholder')}
            onInput={setQuery}
          />
        </view>
        <PrimaryButton
          label={t('common.search')}
          theme={theme}
          onTap={search}
        />
      </view>

      {props.history.length === 0 ? (
        <view
          style={{ paddingTop: '48px', display: 'flex', alignItems: 'center' }}
        >
          <text style={{ color: theme.textFaint, fontSize: '13px' }}>
            {t('history.empty')}
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
          {props.history.map((entry, index) => (
            <view
              key={entry.id}
              className="list-row"
              style={{
                borderBottomWidth:
                  index === props.history.length - 1 ? '0px' : '1px',
                borderColor: theme.border,
              }}
            >
              <view
                className="list-main"
                bindtap={() => props.navigate(entry.url)}
              >
                <text
                  className="list-title"
                  style={{ color: theme.text }}
                  text-maxline="1"
                >
                  {entry.title || displayUrl(entry.url)}
                </text>
                <text
                  className="list-sub"
                  style={{ color: theme.textFaint }}
                  text-maxline="1"
                >
                  {truncate(displayUrl(entry.url), 80)}
                </text>
                <text
                  style={{
                    color: theme.textFaint,
                    fontSize: '10px',
                    marginTop: '3px',
                  }}
                >
                  {formatDateTime(entry.visitedAt, props.locale)} ·{' '}
                  {entry.visitCount}×
                </text>
              </view>
              <view className="list-actions">
                <RowAction
                  theme={theme}
                  label={t('common.delete')}
                  danger
                  onTap={() => props.deleteHistory(entry.id)}
                />
              </view>
            </view>
          ))}
        </view>
      )}

      {confirmClear ? (
        <ConfirmModal
          theme={theme}
          title={t('history.clear')}
          body={t('history.clearConfirm')}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          danger
          onCancel={() => setConfirmClear(false)}
          onConfirm={() => {
            setConfirmClear(false)
            props.clearHistory()
          }}
        />
      ) : null}
    </PageShell>
  )
}
