import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'dark' | 'light' | 'system'

export type KeyboardShortcut = {
  id: string
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  description: string
  enabled: boolean
}

export type SessionDefaults = {
  installCommand: string
  startCommand: string
  packageManager: 'npm' | 'pnpm' | 'yarn'
}

export type Preferences = {
  theme: Theme
  shortcuts: KeyboardShortcut[]
  sessionDefaults: SessionDefaults
  telemetryEnabled: boolean
}

type PreferencesStore = Preferences & {
  setTheme: (theme: Theme) => void
  setShortcuts: (shortcuts: KeyboardShortcut[]) => void
  toggleShortcut: (id: string) => void
  setSessionDefaults: (defaults: Partial<SessionDefaults>) => void
  setTelemetryEnabled: (enabled: boolean) => void
}

const defaultShortcuts: KeyboardShortcut[] = [
  {
    id: 'save-file',
    key: 's',
    ctrlKey: true,
    description: 'Save current file',
    enabled: true,
  },
  {
    id: 'open-command-palette',
    key: 'k',
    ctrlKey: true,
    shiftKey: true,
    description: 'Open command palette',
    enabled: true,
  },
  {
    id: 'toggle-sidebar',
    key: 'b',
    ctrlKey: true,
    description: 'Toggle sidebar',
    enabled: true,
  },
  {
    id: 'toggle-console',
    key: '`',
    ctrlKey: true,
    description: 'Toggle console',
    enabled: true,
  },
]

const defaultSessionDefaults: SessionDefaults = {
  installCommand: 'npm install',
  startCommand: 'npm run dev',
  packageManager: 'npm',
}

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set, get) => ({
      theme: 'system',
      shortcuts: defaultShortcuts,
      sessionDefaults: defaultSessionDefaults,
      telemetryEnabled: false,

      setTheme: (theme) => set({ theme }),

      setShortcuts: (shortcuts) => set({ shortcuts }),

      toggleShortcut: (id) =>
        set((state) => ({
          shortcuts: state.shortcuts.map((shortcut) =>
            shortcut.id === id
              ? { ...shortcut, enabled: !shortcut.enabled }
              : shortcut
          ),
        })),

      setSessionDefaults: (defaults) =>
        set((state) => ({
          sessionDefaults: { ...state.sessionDefaults, ...defaults },
        })),

      setTelemetryEnabled: (enabled) => set({ telemetryEnabled: enabled }),
    }),
    {
      name: 'livehub-preferences',
    }
  )
)