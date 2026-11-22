import { useState } from '@lynx-js/react'
import { displayUrl, truncate } from '@maibrowser/core'
import { formatRelativeTime } from '@maibrowser/i18n'
import type { IconName } from '../icons'
import { useEntranceMotion } from '../motion'
import { Icon, PrimaryButton } from '../primitives'
import type { InternalPageProps } from '../types'

const FALLBACK_LINKS: { title: string; url: string; icon: IconName }[] = [
  { title: 'GitHub', url: 'https://github.com', icon: 'github' },
  { title: 'Wikipedia', url: 'https://www.wikipedia.org', icon: 'book' },
  { title: 'MDN', url: 'https://developer.mozilla.org', icon: 'code' },
  { title: 'Bing', url: 'https://www.bing.com', icon: 'search' },
]

export function NewTabPage(props: InternalPageProps) {
  const { theme, t } = props
  const pageRef = useEntranceMotion(props.settings.motion)
  const [query, setQuery] = useState('')
  const quick =
    props.bookmarks.length > 0
      ? props.bookmarks.slice(0, 6).map((bookmark) => ({
          title: bookmark.title || displayUrl(bookmark.url),
          url: bookmark.url,
          icon: 'globe' as IconName,
        }))
      : FALLBACK_LINKS
  const recent = props.history.slice(0, 6)

  const submit = () => {
    if (!query.trim()) return
    props.navigate(query)
  }

  return (
    <view
      main-thread:ref={pageRef}
      className="page"
      style={{ backgroundColor: theme.bg }}
    >
      <scroll-view className="page-scroll" scroll-y={true}>
        <view className="hero">
          <view className="hero-mark" style={{ backgroundColor: theme.accent }}>
            <text
              className="hero-mark-text"
              style={{ color: theme.accentText }}
            >
              M
            </text>
          </view>
          <text className="hero-title" style={{ color: theme.text }}>
            MaiBrowser
          </text>
          <text className="hero-sub" style={{ color: theme.textMuted }}>
            {t('newtab.subtitle')}
          </text>
          <view className="hero-search">
            <input
              className="hero-input"
              default-value=""
              placeholder={t('newtab.searchPlaceholder')}
              confirm-type="search"
              bindinput={(event: { detail: { value: string } }) =>
                setQuery(event.detail.value)
              }
              bindconfirm={submit}
              style={{
                color: theme.text,
                backgroundColor: theme.surface,
                borderColor: theme.border,
              }}
            />
            <PrimaryButton
              label={t('common.search')}
              theme={theme}
              onTap={submit}
            />
          </view>
        </view>

        <view
          style={{
            paddingLeft: '18px',
            paddingRight: '18px',
            paddingBottom: '28px',
          }}
        >
          <text
            style={{
              color: theme.textMuted,
              fontSize: '11px',
              fontWeight: '700',
              letterSpacing: '0.6px',
              marginBottom: '9px',
            }}
          >
            {t('newtab.quickLinks').toUpperCase()}
          </text>
          <view className="quick-grid">
            {quick.map((item) => (
              <view
                key={item.url}
                className="quick-card"
                style={{
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                }}
                bindtap={() => props.navigate(item.url)}
              >
                <view
                  className="quick-glyph"
                  style={{ backgroundColor: theme.accentSoft }}
                >
                  <Icon name={item.icon} size={18} color={theme.accent} />
                </view>
                <text
                  className="quick-title"
                  style={{ color: theme.text }}
                  text-maxline="1"
                >
                  {truncate(item.title, 22)}
                </text>
                <text
                  className="quick-url"
                  style={{ color: theme.textFaint }}
                  text-maxline="1"
                >
                  {truncate(displayUrl(item.url), 26)}
                </text>
              </view>
            ))}
          </view>

          <view
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'baseline',
              marginTop: '20px',
              marginBottom: '6px',
            }}
          >
            <text
              style={{ color: theme.text, fontSize: '14px', fontWeight: '700' }}
            >
              {t('newtab.recent')}
            </text>
            <view style={{ width: '8px' }} />
            <text style={{ color: theme.textFaint, fontSize: '11px' }}>
              {t('newtab.bookmarks')}
            </text>
          </view>
          {recent.length === 0 ? (
            <text
              style={{
                color: theme.textFaint,
                fontSize: '12px',
                paddingTop: '8px',
              }}
            >
              {t('newtab.noRecent')}
            </text>
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
              {recent.map((entry, index) => (
                <view
                  key={entry.id}
                  className="list-row"
                  bindtap={() => props.navigate(entry.url)}
                  style={{
                    borderBottomWidth:
                      index === recent.length - 1 ? '0px' : '1px',
                    borderColor: theme.border,
                  }}
                >
                  <view className="list-main">
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
                      {truncate(displayUrl(entry.url), 70)}
                    </text>
                  </view>
                  <text style={{ color: theme.textFaint, fontSize: '10px' }}>
                    {formatRelativeTime(entry.visitedAt, props.locale)}
                  </text>
                </view>
              ))}
            </view>
          )}
        </view>
      </scroll-view>
    </view>
  )
}
