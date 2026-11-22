import { useState } from '@lynx-js/react'
import { Icon, PrimaryButton } from '../primitives'
import type { InternalPageProps } from '../types'
import { SettingsGroup } from './settingsShared'
import { ConfirmModal, PageShell } from './shared'

export function PrivacyPage(props: InternalPageProps) {
  const { theme, t } = props
  const [confirmClear, setConfirmClear] = useState(false)
  return (
    <PageShell
      theme={theme}
      title={t('settings.privacy')}
      subtitle={t('privacy.subtitle')}
      motion={props.settings.motion}
      onBack={() => props.openInternal('settings')}
    >
      <SettingsGroup theme={theme} title={t('privacy.privateWindow')}>
        <view className="settings-info-row">
          <view
            className="settings-info-icon"
            style={{ backgroundColor: theme.accentSoft }}
          >
            <Icon name="incognito" size={17} color={theme.accent} />
          </view>
          <text className="settings-copy" style={{ color: theme.textMuted }}>
            {t('privacy.privateWindowHint')}
          </text>
        </view>
      </SettingsGroup>

      <SettingsGroup theme={theme} title={t('privacy.clearDataTitle')}>
        <text className="settings-copy" style={{ color: theme.textMuted }}>
          {t('privacy.clearDataHint')}
        </text>
        <view style={{ marginTop: '12px', display: 'flex' }}>
          <PrimaryButton
            label={t('settings.clearData')}
            theme={theme}
            kind="danger"
            onTap={() => setConfirmClear(true)}
          />
        </view>
      </SettingsGroup>

      {confirmClear ? (
        <ConfirmModal
          theme={theme}
          title={t('settings.clearData')}
          body={t('settings.clearDataConfirm')}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          danger
          onCancel={() => setConfirmClear(false)}
          onConfirm={() => {
            setConfirmClear(false)
            props.clearBrowsingData()
          }}
        />
      ) : null}
    </PageShell>
  )
}
