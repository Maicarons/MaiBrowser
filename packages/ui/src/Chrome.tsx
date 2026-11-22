import { animate } from '@lynx-js/motion'
import {
  runOnMainThread,
  useEffect,
  useMainThreadRef,
  useMemo,
  useRef,
} from '@lynx-js/react'
import type { MainThread } from '@lynx-js/types'
import type { AddressSuggestion, Platform, Tab } from '@maibrowser/core'
import { displayUrl, type securityState, truncate } from '@maibrowser/core'
import type { Translator } from '@maibrowser/i18n'
import type { IconName } from './icons'
import { Icon, IconButton, Pressable } from './primitives'
import type { Theme } from './theme'

function EditableInput(props: {
  value: string
  placeholder: string
  confirmType: 'go' | 'search'
  onInput: (value: string) => void
  onConfirm: () => void
  onFocus: () => void
  onBlur: () => void
  color: string
  inputId?: string
}) {
  const current = useRef(props.value)
  const ref = useRef<{
    invoke?: (
      method: string,
      params?: Record<string, unknown>,
    ) => Promise<unknown>
  } | null>(null)
  useEffect(() => {
    if (current.current === props.value) return
    current.current = props.value
    const timer = setTimeout(() => {
      try {
        const node = ref.current
        if (node?.invoke) {
          void node.invoke('setValue', { value: props.value }).catch(() => {})
        } else {
          lynx
            .createSelectorQuery()
            .select(`#${props.inputId ?? 'address-input'}`)
            .invoke({
              method: 'setValue',
              params: { value: props.value },
              success: () => {},
              fail: () => {},
            })
            .exec()
        }
      } catch {
        // the input is not mounted yet
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [props.inputId, props.value])
  return (
    <input
      ref={ref as never}
      id={props.inputId ?? 'address-input'}
      className="address-input"
      default-value={props.value}
      placeholder={props.placeholder}
      confirm-type={props.confirmType}
      maxlength={4096}
      bindinput={(event: { detail: { value: string } }) => {
        current.current = event.detail.value
        props.onInput(event.detail.value)
      }}
      bindconfirm={props.onConfirm}
      bindfocus={props.onFocus}
      bindblur={props.onBlur}
      style={{ color: props.color }}
    />
  )
}

export function TitleBar(props: {
  theme: Theme
  platform: Platform
  onMinimize: () => void
  onMaximize: () => void
  onClose: () => void
}) {
  const { theme, platform } = props
  return (
    <view className="titlebar" style={{ backgroundColor: theme.bg }}>
      <view className="brand">
        <view className="brand-mark" style={{ backgroundColor: theme.accent }}>
          <text
            style={{
              color: theme.accentText,
              fontSize: '11px',
              fontWeight: '800',
            }}
          >
            M
          </text>
        </view>
        <text className="brand-text" style={{ color: theme.textMuted }}>
          MaiBrowser
        </text>
      </view>
      <view className="grow" />
      {platform === 'windows' ? (
        <view className="window-controls">
          <Pressable onTap={props.onMinimize} label="Minimize">
            <view className="window-btn">
              <Icon name="minimize" size={12} color={theme.textMuted} />
            </view>
          </Pressable>
          <Pressable onTap={props.onMaximize} label="Maximize">
            <view className="window-btn">
              <Icon name="maximize" size={11} color={theme.textMuted} />
            </view>
          </Pressable>
          <Pressable onTap={props.onClose} label="Close">
            <view className="window-btn">
              <Icon name="close" size={13} color={theme.textMuted} />
            </view>
          </Pressable>
        </view>
      ) : null}
    </view>
  )
}

function faviconLetter(tab: Tab, fallback: string): string {
  if (tab.kind === 'internal') return 'M'
  const source = tab.title || tab.url
  if (!source) return fallback
  const host = tab.url
    .match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/([^/?#]+)/)?.[1]
    ?.replace(/^www\./, '')
  return (host?.[0] || source[0] || '?').toUpperCase()
}

function hashColor(seed: string, theme: Theme): string {
  const palette =
    theme.mode === 'dark'
      ? ['#1f6f64', '#365a8c', '#7a4b8c', '#8c5a36', '#3f6b3a', '#6b3f4a']
      : ['#d7f0ea', '#dce7f8', '#efdff3', '#f6e5d6', '#e1efd8', '#f6dde0']
  let hash = 0
  for (let i = 0; i < seed.length; i++)
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  return palette[Math.abs(hash) % palette.length]
}

export function TabStrip(props: {
  theme: Theme
  tabs: (Tab & { private?: boolean })[]
  activeId: string
  t: Translator['t']
  onActivate: (id: string) => void
  onClose: (id: string) => void
  onNewTab: () => void
}) {
  const { theme } = props
  return (
    <view
      className="tabstrip"
      style={{
        backgroundColor: theme.surfaceAlt,
        borderTopWidth: '1px',
        borderColor: theme.border,
      }}
    >
      <scroll-view className="tabstrip-scroll" scroll-x={true}>
        <view className="tabstrip-inner">
          {props.tabs.map((tab) => {
            const active = tab.id === props.activeId
            const bg = active ? theme.surface : theme.surfaceAlt
            return (
              <view
                key={tab.id}
                className={tab.pinned ? 'tab tab-pinned' : 'tab'}
                accessibility-label={tab.title || tab.url}
                style={{
                  backgroundColor: bg,
                  borderColor: active ? theme.border : 'transparent',
                  borderTopWidth: active ? '1px' : '0px',
                  borderLeftWidth: active ? '1px' : '0px',
                  borderRightWidth: active ? '1px' : '0px',
                }}
                bindtap={() => props.onActivate(tab.id)}
              >
                <view
                  className="tab-favicon"
                  style={{
                    backgroundColor:
                      tab.kind === 'internal' || tab.private
                        ? theme.accentSoft
                        : hashColor(tab.url, theme),
                  }}
                >
                  {tab.private ? (
                    <Icon name="incognito" size={13} color={theme.accent} />
                  ) : (
                    <text
                      className="tab-favicon-text"
                      style={{
                        color:
                          tab.kind === 'internal' ? theme.accent : theme.text,
                      }}
                    >
                      {faviconLetter(tab, props.t('tabs.untitled')[0])}
                    </text>
                  )}
                </view>
                {tab.pinned ? null : (
                  <text
                    className="tab-title"
                    style={{ color: active ? theme.text : theme.textMuted }}
                    text-maxline="1"
                  >
                    {truncate(
                      tab.title ||
                        (tab.kind === 'internal'
                          ? props.t('tabs.untitled')
                          : displayUrl(tab.url)),
                      30,
                    )}
                  </text>
                )}
                <view
                  className="tab-close"
                  catchtap={() => props.onClose(tab.id)}
                  style={{
                    backgroundColor: active
                      ? theme.surfaceHover
                      : 'transparent',
                  }}
                >
                  <Icon name="close" size={12} color={theme.textFaint} />
                </view>
              </view>
            )
          })}
          <Pressable onTap={props.onNewTab}>
            <view
              className="tab-add"
              style={{ backgroundColor: theme.surfaceHover }}
            >
              <Icon name="add" size={16} color={theme.textMuted} />
            </view>
          </Pressable>
        </view>
      </scroll-view>
    </view>
  )
}

export function Toolbar(props: {
  theme: Theme
  t: Translator['t']
  address: string
  onAddressChange: (value: string) => void
  onFocus: () => void
  onBlur: () => void
  onSubmit: () => void
  onBack: () => void
  onForward: () => void
  onReload: () => void
  onStop: () => void
  onHome: () => void
  onToggleBookmark: () => void
  onMenu: () => void
  loading: boolean
  bookmarked: boolean
  security: ReturnType<typeof securityState>
  engineName: string
}) {
  const { theme } = props
  const secureColor =
    props.security === 'secure'
      ? theme.success
      : props.security === 'insecure'
        ? theme.warning
        : props.security === 'internal'
          ? theme.accent
          : theme.textFaint
  return (
    <view
      className="toolbar"
      style={{
        backgroundColor: theme.surface,
        borderBottomWidth: '1px',
        borderColor: theme.border,
      }}
    >
      <view className="nav-group">
        <IconButton
          icon="back"
          label={props.t('nav.back')}
          theme={theme}
          onTap={props.onBack}
        />
        <IconButton
          icon="forward"
          label={props.t('nav.forward')}
          theme={theme}
          onTap={props.onForward}
        />
        <IconButton
          icon={props.loading ? 'close' : 'reload'}
          label={props.loading ? props.t('nav.stop') : props.t('nav.reload')}
          theme={theme}
          onTap={props.loading ? props.onStop : props.onReload}
        />
        <IconButton
          icon="home"
          label={props.t('nav.home')}
          theme={theme}
          onTap={props.onHome}
        />
      </view>
      <view
        className="address-shell"
        style={{
          backgroundColor: theme.surfaceAlt,
          borderWidth: '1px',
          borderColor: theme.border,
        }}
      >
        <view className="address-security">
          <Icon
            name={
              props.security === 'secure'
                ? 'lock'
                : props.security === 'insecure'
                  ? 'warning'
                  : props.security === 'internal'
                    ? 'sparkle'
                    : 'globe'
            }
            size={12}
            color={secureColor}
          />
        </view>
        <EditableInput
          inputId="address-input"
          value={props.address}
          placeholder={props.t('address.placeholder')}
          confirmType="go"
          onInput={props.onAddressChange}
          onConfirm={props.onSubmit}
          onFocus={props.onFocus}
          onBlur={props.onBlur}
          color={theme.text}
        />
        <text className="address-hint" style={{ color: theme.textFaint }}>
          {props.engineName}
        </text>
        <view className="address-go" bindtap={props.onSubmit}>
          <Icon name="forward" size={15} color={theme.accent} />
        </view>
      </view>
      <view className="toolbar-actions">
        <IconButton
          icon={props.bookmarked ? 'starFill' : 'star'}
          label={props.t('bookmarks.add')}
          theme={theme}
          onTap={props.onToggleBookmark}
          accent={props.bookmarked}
        />
        <IconButton
          icon="more"
          label={props.t('common.more')}
          theme={theme}
          onTap={props.onMenu}
        />
      </view>
    </view>
  )
}

export function AddressSuggestions(props: {
  theme: Theme
  t: Translator['t']
  suggestions: AddressSuggestion[]
  onSelect: (url: string) => void
}) {
  const { theme } = props
  if (props.suggestions.length === 0) return null
  return (
    <view
      className="suggestions"
      style={{ backgroundColor: theme.surface, borderColor: theme.border }}
    >
      {props.suggestions.map((suggestion, index) => {
        const icon: IconName =
          suggestion.kind === 'bookmark'
            ? 'bookmarkFill'
            : suggestion.kind === 'history'
              ? 'history'
              : suggestion.kind === 'search'
                ? 'search'
                : 'external'
        const kindLabel =
          suggestion.kind === 'bookmark'
            ? props.t('address.bookmark')
            : suggestion.kind === 'history'
              ? props.t('address.history')
              : suggestion.kind === 'search'
                ? props.t('address.search')
                : props.t('address.open')
        return (
          <view
            key={`${suggestion.kind}-${suggestion.url}-${index}`}
            className="suggestion"
            style={{ borderColor: theme.border }}
            accessibility-label={suggestion.title}
            bindtouchstart={() => props.onSelect(suggestion.url)}
            bindtap={() => props.onSelect(suggestion.url)}
          >
            <view className="suggestion-glyph">
              <Icon name={icon} size={14} color={theme.textFaint} />
            </view>
            <view className="suggestion-copy">
              <text
                className="suggestion-title"
                style={{ color: theme.text }}
                text-maxline="1"
              >
                {suggestion.title}
              </text>
              <text
                className="suggestion-detail"
                style={{ color: theme.textFaint }}
                text-maxline="1"
              >
                {suggestion.detail}
              </text>
            </view>
            <text
              className="suggestion-kind"
              style={{ color: theme.textFaint }}
            >
              {kindLabel}
            </text>
          </view>
        )
      })}
    </view>
  )
}

export function BookmarkBar(props: {
  theme: Theme
  bookmarks: { id: string; title: string; url: string }[]
  onOpen: (url: string) => void
}) {
  const { theme } = props
  if (props.bookmarks.length === 0) return null
  return (
    <view
      className="bookmarkbar"
      style={{ backgroundColor: theme.surface, borderColor: theme.border }}
    >
      <scroll-view className="bookmarkbar-scroll" scroll-x={true}>
        <view className="bookmarkbar-inner">
          {props.bookmarks.map((bookmark) => (
            <view
              key={bookmark.id}
              className="bookmark-chip"
              style={{ backgroundColor: theme.surfaceAlt }}
              accessibility-label={bookmark.title || bookmark.url}
              bindtap={() => props.onOpen(bookmark.url)}
            >
              <view className="bookmark-chip-glyph">
                <Icon name="bookmarkFill" size={11} color={theme.accent} />
              </view>
              <text
                className="bookmark-chip-text"
                style={{ color: theme.textMuted }}
                text-maxline="1"
              >
                {truncate(bookmark.title || displayUrl(bookmark.url), 26)}
              </text>
            </view>
          ))}
        </view>
      </scroll-view>
    </view>
  )
}

export function FindBar(props: {
  theme: Theme
  t: Translator['t']
  value: string
  onChange: (value: string) => void
  onNext: () => void
  onPrev: () => void
  onClose: () => void
}) {
  const { theme } = props
  return (
    <view
      className="findbar"
      style={{ backgroundColor: theme.surface, borderColor: theme.border }}
    >
      <view className="findbar-glyph">
        <Icon name="search" size={15} color={theme.textFaint} />
      </view>
      <view
        className="findbar-input"
        style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }}
      >
        <EditableInput
          inputId="find-input"
          value={props.value}
          placeholder={props.t('find.placeholder')}
          confirmType="search"
          onInput={props.onChange}
          onConfirm={props.onNext}
          onFocus={() => {}}
          onBlur={() => {}}
          color={theme.text}
        />
      </view>
      <IconButton
        icon="up"
        label={props.t('find.prev')}
        theme={theme}
        onTap={props.onPrev}
      />
      <IconButton
        icon="down"
        label={props.t('find.next')}
        theme={theme}
        onTap={props.onNext}
      />
      <IconButton
        icon="close"
        label={props.t('find.close')}
        theme={theme}
        onTap={props.onClose}
      />
    </view>
  )
}

export interface MenuAction {
  icon: IconName
  label: string
  onTap: () => void
  separatorBefore?: boolean
}

export function AppMenu(props: {
  theme: Theme
  actions: MenuAction[]
  onDismiss: () => void
  motionEnabled: boolean
}) {
  const { theme } = props
  const panelRef = useMainThreadRef<MainThread.Element>(null)
  useMemo(() => animate, [])
  useEffect(() => {
    if (!props.motionEnabled) return
    const timer = setTimeout(() => {
      runOnMainThread(() => {
        'main thread'
        if (!panelRef.current) return
        animate(
          panelRef.current as never,
          { y: [-10, 0], scale: [0.97, 1] },
          { duration: 0.22, ease: 'easeOut' },
        )
      })()
    }, 40)
    return () => clearTimeout(timer)
  }, [props.motionEnabled])
  return (
    <view className="menu-overlay" bindtap={props.onDismiss}>
      <view
        main-thread:ref={panelRef}
        className="menu-panel"
        catchtap={() => {}}
        style={{
          backgroundColor: theme.surface,
          borderColor: theme.border,
          boxShadow: `0 12px 32px ${theme.shadow}`,
        }}
      >
        <scroll-view className="menu-scroll" scroll-y={true}>
          <view className="menu-grid">
            {props.actions.map((action, index) => (
              <view
                key={`${action.label}-${index}`}
                className={
                  action.separatorBefore ? 'menu-section' : 'menu-cell'
                }
              >
                {action.separatorBefore ? (
                  <view
                    className="menu-sep"
                    style={{ backgroundColor: theme.border }}
                  />
                ) : null}
                <view
                  className="menu-item"
                  accessibility-label={action.label}
                  bindtap={() => {
                    props.onDismiss()
                    action.onTap()
                  }}
                >
                  <view className="menu-glyph">
                    <Icon
                      name={action.icon}
                      size={17}
                      color={theme.textMuted}
                    />
                  </view>
                  <text
                    className="menu-label"
                    style={{ color: theme.text }}
                    text-maxline="1"
                  >
                    {action.label}
                  </text>
                </view>
              </view>
            ))}
          </view>
        </scroll-view>
      </view>
    </view>
  )
}

export function StatusBar(props: {
  theme: Theme
  t: Translator['t']
  tabCount: number
  url: string
  privateMode: boolean
}) {
  return (
    <view
      className="statusbar"
      style={{
        backgroundColor: props.theme.surface,
        borderTopWidth: '1px',
        borderColor: props.theme.border,
      }}
    >
      <text className="status-text" style={{ color: props.theme.textFaint }}>
        {props.t('app.name')}
      </text>
      {props.privateMode ? (
        <text className="status-private" style={{ color: props.theme.accent }}>
          {props.t('status.private')}
        </text>
      ) : null}
      <view className="grow" />
      <text className="status-text" style={{ color: props.theme.textFaint }}>
        {props.tabCount} tab{props.tabCount === 1 ? '' : 's'} ·{' '}
        {truncate(displayUrl(props.url), 72)}
      </text>
    </view>
  )
}
