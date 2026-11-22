import type { ReactNode } from '@lynx-js/react'
import type { IconName } from '../icons'
import { Icon } from '../primitives'
import type { Theme } from '../theme'

export function SettingsGroup(props: {
  theme: Theme
  title?: string
  children: ReactNode
}) {
  const { theme } = props
  return (
    <view
      className="section-card"
      style={{ backgroundColor: theme.surface, borderColor: theme.border }}
    >
      {props.title ? (
        <text className="settings-group-title" style={{ color: theme.text }}>
          {props.title}
        </text>
      ) : null}
      {props.children}
    </view>
  )
}

export function SettingsLinkRow(props: {
  theme: Theme
  icon: IconName
  title: string
  hint?: string
  value?: string
  onTap: () => void
  last?: boolean
}) {
  const { theme } = props
  return (
    <view
      className="settings-link"
      style={{
        borderBottomWidth: props.last ? '0px' : '1px',
        borderColor: theme.border,
      }}
      accessibility-label={props.title}
      bindtap={props.onTap}
    >
      <view
        className="settings-link-icon"
        style={{ backgroundColor: theme.accentSoft }}
      >
        <Icon name={props.icon} size={16} color={theme.accent} />
      </view>
      <view className="settings-link-copy">
        <text className="settings-link-title" style={{ color: theme.text }}>
          {props.title}
        </text>
        {props.hint ? (
          <text
            className="settings-link-hint"
            style={{ color: theme.textMuted }}
          >
            {props.hint}
          </text>
        ) : null}
      </view>
      {props.value ? (
        <text
          className="settings-link-value"
          style={{ color: theme.textFaint }}
          text-maxline="1"
        >
          {props.value}
        </text>
      ) : null}
      <Icon name="forward" size={14} color={theme.textFaint} />
    </view>
  )
}

export function SettingsRow(props: {
  theme: Theme
  title: string
  hint?: string
  children: ReactNode
  last?: boolean
}) {
  return (
    <view
      className="setting-row"
      style={{
        borderBottomWidth: props.last ? '0px' : '1px',
        borderColor: props.theme.border,
      }}
    >
      <view className="setting-label">
        <text className="setting-title" style={{ color: props.theme.text }}>
          {props.title}
        </text>
        {props.hint ? (
          <text
            className="setting-hint"
            style={{ color: props.theme.textMuted }}
          >
            {props.hint}
          </text>
        ) : null}
      </view>
      {props.children}
    </view>
  )
}

export function Segmented(props: {
  theme: Theme
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}) {
  const { theme } = props
  return (
    <view className="segmented" style={{ backgroundColor: theme.surfaceAlt }}>
      {props.options.map((option) => {
        const active = option.value === props.value
        return (
          <view
            key={option.value}
            className="segment"
            style={{
              backgroundColor: active ? theme.accentSoft : 'transparent',
            }}
            bindtap={() => props.onChange(option.value)}
          >
            <text
              className="segment-text"
              style={{ color: active ? theme.accent : theme.textMuted }}
            >
              {option.label}
            </text>
          </view>
        )
      })}
    </view>
  )
}
