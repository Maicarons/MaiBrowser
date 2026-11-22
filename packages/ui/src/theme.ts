export type ThemeMode = 'light' | 'dark'

export type AccentId =
  | 'teal'
  | 'azure'
  | 'violet'
  | 'rose'
  | 'amber'
  | 'lime'
  | 'graphite'

export interface AccentDefinition {
  id: AccentId
  color: { light: string; dark: string }
  soft: { light: string; dark: string }
  text: { light: string; dark: string }
}

export const ACCENTS: AccentDefinition[] = [
  {
    id: 'teal',
    color: { light: '#0c8f7c', dark: '#2dd4bf' },
    soft: { light: '#dff4ef', dark: '#0f312d' },
    text: { light: '#ffffff', dark: '#04211d' },
  },
  {
    id: 'azure',
    color: { light: '#2563eb', dark: '#60a5fa' },
    soft: { light: '#e3edff', dark: '#14284d' },
    text: { light: '#ffffff', dark: '#06152e' },
  },
  {
    id: 'violet',
    color: { light: '#7c3aed', dark: '#a78bfa' },
    soft: { light: '#f0e8ff', dark: '#291a45' },
    text: { light: '#ffffff', dark: '#12052b' },
  },
  {
    id: 'rose',
    color: { light: '#db2777', dark: '#f472b6' },
    soft: { light: '#fde7f1', dark: '#3b1224' },
    text: { light: '#ffffff', dark: '#2b0615' },
  },
  {
    id: 'amber',
    color: { light: '#b45309', dark: '#fbbf24' },
    soft: { light: '#fef0d9', dark: '#3a2a0a' },
    text: { light: '#ffffff', dark: '#241a04' },
  },
  {
    id: 'lime',
    color: { light: '#4d7c0f', dark: '#a3e635' },
    soft: { light: '#eef7d6', dark: '#22330a' },
    text: { light: '#ffffff', dark: '#101f03' },
  },
  {
    id: 'graphite',
    color: { light: '#334155', dark: '#cbd5e1' },
    soft: { light: '#e8edf3', dark: '#263341' },
    text: { light: '#ffffff', dark: '#0b141c' },
  },
]

export interface Theme {
  mode: ThemeMode
  bg: string
  surface: string
  surfaceAlt: string
  surfaceHover: string
  border: string
  borderStrong: string
  text: string
  textMuted: string
  textFaint: string
  accent: string
  accentText: string
  accentSoft: string
  danger: string
  dangerSoft: string
  success: string
  warning: string
  shadow: string
  overlay: string
}

export const lightTheme: Theme = {
  mode: 'light',
  bg: '#eef1f5',
  surface: '#ffffff',
  surfaceAlt: '#f5f7fa',
  surfaceHover: '#e9edf2',
  border: '#dde3ea',
  borderStrong: '#c6ced8',
  text: '#111820',
  textMuted: '#586474',
  textFaint: '#8b96a5',
  accent: '#0c8f7c',
  accentText: '#ffffff',
  accentSoft: '#dff4ef',
  danger: '#c9372c',
  dangerSoft: '#fde8e6',
  success: '#1f8a4c',
  warning: '#a66a00',
  shadow: 'rgba(17, 24, 32, 0.12)',
  overlay: 'rgba(9, 14, 20, 0.45)',
}

export const darkTheme: Theme = {
  mode: 'dark',
  bg: '#0a0f13',
  surface: '#111a20',
  surfaceAlt: '#162129',
  surfaceHover: '#1c2a33',
  border: '#22313b',
  borderStrong: '#33444f',
  text: '#e8f0f4',
  textMuted: '#9babb7',
  textFaint: '#6d7f8c',
  accent: '#2dd4bf',
  accentText: '#04211d',
  accentSoft: '#0f312d',
  danger: '#ff7b72',
  dangerSoft: '#3a1b1a',
  success: '#3fb950',
  warning: '#d29922',
  shadow: 'rgba(0, 0, 0, 0.4)',
  overlay: 'rgba(0, 0, 0, 0.58)',
}

export function accentFor(id: AccentId): AccentDefinition {
  return ACCENTS.find((accent) => accent.id === id) ?? ACCENTS[0]
}

export function themeFor(mode: ThemeMode, accentId: AccentId = 'teal'): Theme {
  const base = mode === 'dark' ? darkTheme : lightTheme
  const accent = accentFor(accentId)
  return {
    ...base,
    accent: accent.color[mode],
    accentSoft: accent.soft[mode],
    accentText: accent.text[mode],
  }
}
