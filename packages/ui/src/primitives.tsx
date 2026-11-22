import { Button, Input, TextArea } from '@lynx-js/lynx-ui'
import type { ReactNode } from '@lynx-js/react'
import { ICON_SOURCES, type IconName } from './icons'
import type { Theme } from './theme'

export interface PressableProps {
  onTap?: () => void
  children: ReactNode
  style?: Record<string, string | number>
  disabled?: boolean
  className?: string
  label?: string
}

export function Pressable(props: PressableProps) {
  const { onTap, children, style, disabled, className, label } = props
  return (
    <Button
      className={className ? `pressable ${className}` : 'pressable'}
      onClick={onTap}
      disabled={disabled}
      buttonProps={label ? { 'accessibility-label': label } : undefined}
    >
      {({ active = false }) => (
        <view
          style={{ ...style, opacity: disabled ? 0.42 : active ? 0.66 : 1 }}
        >
          {children}
        </view>
      )}
    </Button>
  )
}

export function Icon(props: {
  name: IconName
  size?: number
  color: string
  style?: Record<string, string | number>
}) {
  const { name, size = 18, color } = props
  return (
    <image
      src={ICON_SOURCES[name]}
      tint-color={color}
      mode="aspectFit"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        ...props.style,
      }}
    />
  )
}

export function IconButton(props: {
  icon: IconName
  label: string
  theme: Theme
  onTap?: () => void
  disabled?: boolean
  size?: number
  accent?: boolean
}) {
  const { icon, theme, onTap, disabled, size = 32, accent } = props
  return (
    <Pressable onTap={onTap} disabled={disabled} label={props.label}>
      <view
        style={{
          width: `${size}px`,
          height: `${size}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: `${Math.round(size / 2.6)}px`,
          backgroundColor: accent ? theme.accentSoft : 'transparent',
        }}
      >
        <Icon
          name={icon}
          size={Math.round(size * 0.52)}
          color={
            disabled ? theme.textFaint : accent ? theme.accent : theme.text
          }
        />
      </view>
    </Pressable>
  )
}

export function PrimaryButton(props: {
  label: string
  theme: Theme
  onTap?: () => void
  disabled?: boolean
  kind?: 'primary' | 'ghost' | 'danger'
}) {
  const { label, theme, onTap, disabled, kind = 'primary' } = props
  const bg =
    kind === 'primary'
      ? theme.accent
      : kind === 'danger'
        ? theme.dangerSoft
        : 'transparent'
  const color =
    kind === 'primary'
      ? theme.accentText
      : kind === 'danger'
        ? theme.danger
        : theme.text
  return (
    <Pressable onTap={onTap} disabled={disabled} label={label}>
      <view
        style={{
          paddingLeft: '14px',
          paddingRight: '14px',
          height: '34px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '9px',
          backgroundColor: bg,
          borderWidth: kind === 'ghost' ? '1px' : '0px',
          borderColor: theme.border,
        }}
      >
        <text style={{ color, fontSize: '13px', fontWeight: '600' }}>
          {label}
        </text>
      </view>
    </Pressable>
  )
}

export function TextField(props: {
  theme: Theme
  value: string
  placeholder?: string
  onInput: (value: string) => void
  multiline?: boolean
  rows?: number
}) {
  const { theme, value, placeholder, onInput, multiline = false } = props
  if (multiline) {
    return (
      <TextArea
        className="text-field text-area"
        value={value}
        placeholder={placeholder}
        onInput={onInput}
        style={{
          color: theme.text,
          backgroundColor: theme.surfaceAlt,
          borderColor: theme.border,
        }}
      />
    )
  }
  return (
    <Input
      className="text-field"
      value={value}
      placeholder={placeholder}
      onInput={onInput}
      style={{
        color: theme.text,
        backgroundColor: theme.surfaceAlt,
        borderColor: theme.border,
      }}
    />
  )
}

export function Section(props: {
  theme: Theme
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <view
      style={{ display: 'flex', flexDirection: 'column', marginBottom: '22px' }}
    >
      <text
        style={{
          color: props.theme.text,
          fontSize: '14px',
          fontWeight: '700',
          marginBottom: '4px',
        }}
      >
        {props.title}
      </text>
      {props.hint ? (
        <text
          style={{
            color: props.theme.textMuted,
            fontSize: '12px',
            lineHeight: '18px',
            marginBottom: '10px',
          }}
        >
          {props.hint}
        </text>
      ) : null}
      <view style={{ display: 'flex', flexDirection: 'column' }}>
        {props.children}
      </view>
    </view>
  )
}

export function Card(props: {
  theme: Theme
  children: ReactNode
  style?: Record<string, string | number>
}) {
  return (
    <view
      style={{
        backgroundColor: props.theme.surface,
        borderRadius: '14px',
        borderWidth: '1px',
        borderColor: props.theme.border,
        padding: '14px',
        ...props.style,
      }}
    >
      {props.children}
    </view>
  )
}

export function EmptyState(props: {
  theme: Theme
  icon: IconName
  title: string
  hint?: string
}) {
  return (
    <view
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: '64px',
        paddingBottom: '64px',
      }}
    >
      <Icon name={props.icon} size={34} color={props.theme.textFaint} />
      <text
        style={{
          color: props.theme.text,
          fontSize: '16px',
          fontWeight: '600',
          marginTop: '12px',
        }}
      >
        {props.title}
      </text>
      {props.hint ? (
        <text
          style={{
            color: props.theme.textMuted,
            fontSize: '13px',
            marginTop: '6px',
            textAlign: 'center',
            maxWidth: '420px',
          }}
        >
          {props.hint}
        </text>
      ) : null}
    </view>
  )
}

export function Divider(props: { theme: Theme }) {
  return (
    <view
      style={{
        height: '1px',
        backgroundColor: props.theme.border,
        width: '100%',
      }}
    />
  )
}

export function Badge(props: {
  theme: Theme
  label: string
  accent?: boolean
}) {
  return (
    <view
      style={{
        paddingLeft: '7px',
        paddingRight: '7px',
        paddingTop: '2px',
        paddingBottom: '2px',
        borderRadius: '6px',
        backgroundColor: props.accent
          ? props.theme.accentSoft
          : props.theme.surfaceAlt,
      }}
    >
      <text
        style={{
          color: props.accent ? props.theme.accent : props.theme.textMuted,
          fontSize: '10px',
          fontWeight: '600',
        }}
      >
        {props.label}
      </text>
    </view>
  )
}
