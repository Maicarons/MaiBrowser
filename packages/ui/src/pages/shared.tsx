import type { ReactNode } from '@lynx-js/react'
import { useEntranceMotion } from '../motion'
import { IconButton, PrimaryButton } from '../primitives'
import type { Theme } from '../theme'

export function PageShell(props: {
  theme: Theme
  title: string
  subtitle?: string
  onBack: () => void
  motion?: boolean
  actions?: ReactNode
  children: ReactNode
}) {
  const pageRef = useEntranceMotion(props.motion ?? true)
  return (
    <view
      main-thread:ref={pageRef}
      className="page"
      style={{ backgroundColor: props.theme.bg }}
    >
      <view
        className="page-header"
        style={{ borderBottomWidth: '1px', borderColor: props.theme.border }}
      >
        <IconButton
          icon="back"
          label="Back"
          theme={props.theme}
          onTap={props.onBack}
        />
        <view
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginLeft: '4px',
            flex: 1,
          }}
        >
          <text className="page-title" style={{ color: props.theme.text }}>
            {props.title}
          </text>
          {props.subtitle ? (
            <text
              className="page-subtitle"
              style={{ color: props.theme.textMuted }}
            >
              {props.subtitle}
            </text>
          ) : null}
        </view>
        {props.actions}
      </view>
      <scroll-view className="page-scroll" scroll-y={true}>
        <view className="page-content">{props.children}</view>
      </scroll-view>
    </view>
  )
}

export function ConfirmModal(props: {
  theme: Theme
  title: string
  body: string
  confirmLabel: string
  cancelLabel: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <view
      className="modal-overlay"
      style={{ backgroundColor: props.theme.overlay }}
    >
      <view
        className="modal-card"
        style={{
          backgroundColor: props.theme.surface,
          borderColor: props.theme.border,
        }}
      >
        <text className="modal-title" style={{ color: props.theme.text }}>
          {props.title}
        </text>
        <text className="modal-body" style={{ color: props.theme.textMuted }}>
          {props.body}
        </text>
        <view className="modal-actions">
          <PrimaryButton
            label={props.cancelLabel}
            theme={props.theme}
            kind="ghost"
            onTap={props.onCancel}
          />
          <view style={{ width: '8px' }} />
          <PrimaryButton
            label={props.confirmLabel}
            theme={props.theme}
            kind={props.danger ? 'danger' : 'primary'}
            onTap={props.onConfirm}
          />
        </view>
      </view>
    </view>
  )
}

export function RowAction(props: {
  theme: Theme
  label: string
  onTap: () => void
  danger?: boolean
}) {
  return (
    <view
      className="small-action"
      style={{
        backgroundColor: props.danger
          ? props.theme.dangerSoft
          : props.theme.surfaceAlt,
      }}
      bindtap={props.onTap}
    >
      <text
        className="small-action-text"
        style={{
          color: props.danger ? props.theme.danger : props.theme.textMuted,
        }}
      >
        {props.label}
      </text>
    </view>
  )
}
