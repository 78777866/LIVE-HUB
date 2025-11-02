'use client'

import { useTheme } from 'next-themes'
import { usePreferencesStore } from '@/state/preferences-store'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Monitor, Moon, Sun, Keyboard, Settings, BarChart3 } from 'lucide-react'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const {
    shortcuts,
    sessionDefaults,
    telemetryEnabled,
    setTheme: setPrefTheme,
    toggleShortcut,
    setSessionDefaults,
    setTelemetryEnabled,
  } = usePreferencesStore()

  const handleThemeChange = (newTheme: 'dark' | 'light' | 'system') => {
    setTheme(newTheme)
    setPrefTheme(newTheme)
  }

  const formatShortcut = (shortcut: typeof shortcuts[0]) => {
    const parts = []
    if (shortcut.ctrlKey) parts.push('Ctrl')
    if (shortcut.shiftKey) parts.push('Shift')
    if (shortcut.altKey) parts.push('Alt')
    parts.push(shortcut.key.toUpperCase())
    return parts.join(' + ')
  }

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your preferences, shortcuts, and workspace defaults.
        </p>
      </div>

      <Tabs defaultValue="appearance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="shortcuts" className="flex items-center gap-2">
            <Keyboard className="h-4 w-4" />
            Shortcuts
          </TabsTrigger>
          <TabsTrigger value="defaults" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Defaults
          </TabsTrigger>
          <TabsTrigger value="telemetry" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Telemetry
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="space-y-4">
          <div className="rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Theme</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="theme">Color Scheme</Label>
                  <p className="text-sm text-muted-foreground">
                    Choose your preferred color theme for the interface.
                  </p>
                </div>
                <Select value={theme} onValueChange={handleThemeChange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light" className="flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      Light
                    </SelectItem>
                    <SelectItem value="dark" className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      Dark
                    </SelectItem>
                    <SelectItem value="system" className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      System
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="shortcuts" className="space-y-4">
          <div className="rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Keyboard Shortcuts</h2>
            <div className="space-y-4">
              {shortcuts.map((shortcut) => (
                <div key={shortcut.id} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor={shortcut.id}>{shortcut.description}</Label>
                    <p className="text-sm text-muted-foreground">
                      {formatShortcut(shortcut)}
                    </p>
                  </div>
                  <Switch
                    id={shortcut.id}
                    checked={shortcut.enabled}
                    onCheckedChange={() => toggleShortcut(shortcut.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="defaults" className="space-y-4">
          <div className="rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Session Defaults</h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="package-manager">Package Manager</Label>
                <Select
                  value={sessionDefaults.packageManager}
                  onValueChange={(value: 'npm' | 'pnpm' | 'yarn') =>
                    setSessionDefaults({ packageManager: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="npm">npm</SelectItem>
                    <SelectItem value="pnpm">pnpm</SelectItem>
                    <SelectItem value="yarn">yarn</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="install-command">Install Command</Label>
                <Input
                  id="install-command"
                  value={sessionDefaults.installCommand}
                  onChange={(e) => setSessionDefaults({ installCommand: e.target.value })}
                  placeholder="npm install"
                />
                <p className="text-sm text-muted-foreground">
                  Command used to install dependencies in new workspaces.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="start-command">Start Command</Label>
                <Input
                  id="start-command"
                  value={sessionDefaults.startCommand}
                  onChange={(e) => setSessionDefaults({ startCommand: e.target.value })}
                  placeholder="npm run dev"
                />
                <p className="text-sm text-muted-foreground">
                  Command used to start the development server.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="telemetry" className="space-y-4">
          <div className="rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Analytics & Telemetry</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="telemetry">Enable Telemetry</Label>
                  <p className="text-sm text-muted-foreground">
                    Help us improve LiveHub by sharing anonymous usage data. We only collect
                    non-identifying information about feature usage and performance.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <a href="#" className="underline">
                      Learn more about our privacy policy
                    </a>
                  </p>
                </div>
                <Switch
                  id="telemetry"
                  checked={telemetryEnabled}
                  onCheckedChange={setTelemetryEnabled}
                />
              </div>

              {telemetryEnabled && (
                <div className="mt-4 p-4 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">
                    Thank you for helping us improve LiveHub! Telemetry data helps us understand
                    how the application is used and prioritize feature development.
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}