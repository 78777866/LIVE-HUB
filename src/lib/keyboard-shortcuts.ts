import { KeyboardShortcut } from '@/state/preferences-store'

export class KeyboardShortcutRegistry {
  private shortcuts: Map<string, KeyboardShortcut> = new Map()
  private handlers: Map<string, (event: KeyboardEvent) => void> = new Map()

  constructor() {
    // Set up global keyboard event listener
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeyDown.bind(this))
    }
  }

  registerShortcut(shortcut: KeyboardShortcut, handler: (event: KeyboardEvent) => void) {
    this.shortcuts.set(shortcut.id, shortcut)
    this.handlers.set(shortcut.id, handler)
  }

  unregisterShortcut(shortcutId: string) {
    this.shortcuts.delete(shortcutId)
    this.handlers.delete(shortcutId)
  }

  updateShortcut(shortcut: KeyboardShortcut) {
    this.shortcuts.set(shortcut.id, shortcut)
  }

  getShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values())
  }

  getShortcut(shortcutId: string): KeyboardShortcut | undefined {
    return this.shortcuts.get(shortcutId)
  }

  private handleKeyDown(event: KeyboardEvent) {
    for (const [shortcutId, shortcut] of this.shortcuts) {
      if (!shortcut.enabled) continue

      if (
        event.key === shortcut.key &&
        !!shortcut.ctrlKey === event.ctrlKey &&
        !!shortcut.shiftKey === event.shiftKey &&
        !!shortcut.altKey === event.altKey
      ) {
        const handler = this.handlers.get(shortcutId)
        if (handler) {
          event.preventDefault()
          event.stopPropagation()
          handler(event)
          break
        }
      }
    }
  }
}

export const keyboardRegistry = new KeyboardShortcutRegistry()