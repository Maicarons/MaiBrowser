import type { InternalPageProps } from '../types'
import { AboutPage } from './AboutPage'
import { AppearancePage } from './AppearancePage'
import { BookmarksPage } from './BookmarksPage'
import { DownloadSettingsPage } from './DownloadSettingsPage'
import { DownloadsPage } from './DownloadsPage'
import { HistoryPage } from './HistoryPage'
import { LanguagePage } from './LanguagePage'
import { NewTabPage } from './NewTabPage'
import { PrivacyPage } from './PrivacyPage'
import { ScriptsPage } from './ScriptsPage'
import { SearchSettingsPage } from './SearchSettingsPage'
import { SettingsPage } from './SettingsPage'
import { StartupPage } from './StartupPage'
import { StoragePage } from './StoragePage'

export function InternalPage(props: InternalPageProps) {
  if (props.page === 'history') return <HistoryPage {...props} />
  if (props.page === 'bookmarks') return <BookmarksPage {...props} />
  if (props.page === 'downloads') return <DownloadsPage {...props} />
  if (props.page === 'settings') return <SettingsPage {...props} />
  if (props.page === 'appearance') return <AppearancePage {...props} />
  if (props.page === 'search') return <SearchSettingsPage {...props} />
  if (props.page === 'startup') return <StartupPage {...props} />
  if (props.page === 'language') return <LanguagePage {...props} />
  if (props.page === 'privacy') return <PrivacyPage {...props} />
  if (props.page === 'download-settings')
    return <DownloadSettingsPage {...props} />
  if (props.page === 'storage') return <StoragePage {...props} />
  if (props.page === 'scripts') return <ScriptsPage {...props} />
  if (props.page === 'about') return <AboutPage {...props} />
  return <NewTabPage {...props} />
}
