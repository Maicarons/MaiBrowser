import { useState } from '@lynx-js/react'
import { displayUrl, isInternalUrl, truncate } from '@maibrowser/core'
import { PrimaryButton, TextField } from '../primitives'
import type { InternalPageProps } from '../types'
import { PageShell, RowAction } from './shared'

export function BookmarksPage(props: InternalPageProps) {
  const { theme, t } = props
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [showForm, setShowForm] = useState(false)

  const add = () => {
    const target = url.trim()
    if (!target) return
    props.addBookmark(title.trim() || displayUrl(target), target)
    setTitle('')
    setUrl('')
    setShowForm(false)
  }

  const addCurrent = () => {
    if (!props.currentUrl || isInternalUrl(props.currentUrl)) {
      props.notify(t('bookmarks.add'))
      return
    }
    props.addBookmark(
      props.currentTitle || displayUrl(props.currentUrl),
      props.currentUrl,
    )
  }

  return (
    <PageShell
      theme={theme}
      title={t('bookmarks.title')}
      subtitle={`${props.bookmarks.length} ${props.bookmarks.length === 1 ? 'bookmark' : 'bookmarks'}`}
      motion={props.settings.motion}
      onBack={() => props.openInternal('newtab')}
      actions={
        <view style={{ display: 'flex', flexDirection: 'row' }}>
          <PrimaryButton
            label={t('common.add')}
            theme={theme}
            kind="ghost"
            onTap={() => {
              setTitle(props.currentTitle)
              setUrl(isInternalUrl(props.currentUrl) ? '' : props.currentUrl)
              setShowForm(!showForm)
            }}
          />
          <view style={{ width: '8px' }} />
          <PrimaryButton
            label={t('bookmarks.add')}
            theme={theme}
            onTap={addCurrent}
          />
        </view>
      }
    >
      <view
        className="input-row"
        style={{ justifyContent: 'flex-end', marginBottom: '10px' }}
      >
        <PrimaryButton
          label={t('bookmarks.import')}
          theme={theme}
          kind="ghost"
          onTap={() => void props.importBookmarks()}
        />
        <view style={{ width: '8px' }} />
        <PrimaryButton
          label={t('bookmarks.export')}
          theme={theme}
          kind="ghost"
          onTap={() => void props.exportBookmarks()}
        />
      </view>

      {showForm ? (
        <view
          className="section-card"
          style={{ backgroundColor: theme.surface, borderColor: theme.border }}
        >
          <TextField
            theme={theme}
            value={title}
            placeholder={t('bookmarks.name')}
            onInput={setTitle}
          />
          <TextField
            theme={theme}
            value={url}
            placeholder={t('bookmarks.url')}
            onInput={setUrl}
          />
          <view
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'flex-end',
            }}
          >
            <PrimaryButton
              label={t('common.cancel')}
              theme={theme}
              kind="ghost"
              onTap={() => setShowForm(false)}
            />
            <view style={{ width: '8px' }} />
            <PrimaryButton
              label={t('common.save')}
              theme={theme}
              onTap={add}
              disabled={!url.trim()}
            />
          </view>
        </view>
      ) : null}

      {props.bookmarks.length === 0 ? (
        <view
          style={{ paddingTop: '48px', display: 'flex', alignItems: 'center' }}
        >
          <text style={{ color: theme.textFaint, fontSize: '13px' }}>
            {t('bookmarks.empty')}
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
          {props.bookmarks.map((bookmark, index) => (
            <view
              key={bookmark.id}
              className="list-row"
              style={{
                borderBottomWidth:
                  index === props.bookmarks.length - 1 ? '0px' : '1px',
                borderColor: theme.border,
              }}
            >
              <view
                className="list-main"
                bindtap={() => props.navigate(bookmark.url)}
              >
                <text
                  className="list-title"
                  style={{ color: theme.text }}
                  text-maxline="1"
                >
                  {bookmark.title || displayUrl(bookmark.url)}
                </text>
                <text
                  className="list-sub"
                  style={{ color: theme.textFaint }}
                  text-maxline="1"
                >
                  {truncate(displayUrl(bookmark.url), 80)}
                </text>
              </view>
              <view className="list-actions">
                <RowAction
                  theme={theme}
                  label={t('common.open')}
                  onTap={() => props.navigate(bookmark.url)}
                />
                <RowAction
                  theme={theme}
                  label={t('common.delete')}
                  danger
                  onTap={() => props.deleteBookmark(bookmark.id)}
                />
              </view>
            </view>
          ))}
        </view>
      )}
    </PageShell>
  )
}
