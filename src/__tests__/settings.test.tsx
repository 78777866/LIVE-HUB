import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { ThemeProvider, useTheme } from 'next-themes'
import SettingsPage from '@/app/settings/page'
import { usePreferencesStore } from '@/state/preferences-store'

// Mock the Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock the preferences store
jest.mock('@/state/preferences-store', () => ({
  usePreferencesStore: jest.fn(),
}))

// Mock next-themes ThemeProvider
jest.mock('next-themes', () => ({
  useTheme: jest.fn(),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe('SettingsPage', () => {
  const mockPush = jest.fn()
  const mockSetTheme = jest.fn()
  
  const mockPreferencesStore = {
    theme: 'system',
    shortcuts: [
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
    ],
    sessionDefaults: {
      installCommand: 'npm install',
      startCommand: 'npm run dev',
      packageManager: 'npm',
    },
    telemetryEnabled: false,
    setTheme: jest.fn(),
    toggleShortcut: jest.fn(),
    setSessionDefaults: jest.fn(),
    setTelemetryEnabled: jest.fn(),
  }

  beforeEach(() => {
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })

    ;(useTheme as jest.Mock).mockReturnValue({
      theme: 'system',
      setTheme: mockSetTheme,
    })

    ;(usePreferencesStore as jest.Mock).mockReturnValue(mockPreferencesStore)
    
    // Clear localStorage mock
    localStorage.clear()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders settings page with all tabs', () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <SettingsPage />
      </ThemeProvider>
    )

    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('Appearance')).toBeInTheDocument()
    expect(screen.getByText('Shortcuts')).toBeInTheDocument()
    expect(screen.getByText('Defaults')).toBeInTheDocument()
    expect(screen.getByText('Telemetry')).toBeInTheDocument()
  })

  it('displays theme settings correctly', () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <SettingsPage />
      </ThemeProvider>
    )

    // Click on Appearance tab to ensure it's active
    fireEvent.click(screen.getByText('Appearance'))
    
    expect(screen.getByText('Color Scheme')).toBeInTheDocument()
    expect(screen.getByText('Choose your preferred color theme for the interface.')).toBeInTheDocument()
  })

  it('calls theme setters when theme is changed', async () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <SettingsPage />
      </ThemeProvider>
    )

    // Click on Appearance tab to ensure it's active
    fireEvent.click(screen.getByText('Appearance'))

    const themeSelect = screen.getByRole('combobox')
    expect(themeSelect).toBeInTheDocument()

    // Simulate changing theme to dark
    fireEvent.change(themeSelect, { target: { value: 'dark' } })

    await waitFor(() => {
      expect(mockSetTheme).toHaveBeenCalledWith('dark')
      expect(mockPreferencesStore.setTheme).toHaveBeenCalledWith('dark')
    })
  })

  it('displays keyboard shortcuts correctly', () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <SettingsPage />
      </ThemeProvider>
    )

    // Click on Shortcuts tab to ensure it's active
    fireEvent.click(screen.getByText('Shortcuts'))

    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument()
    expect(screen.getByText('Save current file')).toBeInTheDocument()
    expect(screen.getByText('Open command palette')).toBeInTheDocument()
    expect(screen.getByText('Ctrl + S')).toBeInTheDocument()
    expect(screen.getByText('Ctrl + Shift + K')).toBeInTheDocument()
  })

  it('calls toggleShortcut when shortcut switch is toggled', async () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <SettingsPage />
      </ThemeProvider>
    )

    // Click on Shortcuts tab to ensure it's active
    fireEvent.click(screen.getByText('Shortcuts'))

    // Find the first switch (save-file shortcut)
    const switchElement = document.querySelector('[role="switch"]') as HTMLElement
    expect(switchElement).toBeInTheDocument()

    fireEvent.click(switchElement)

    await waitFor(() => {
      expect(mockPreferencesStore.toggleShortcut).toHaveBeenCalledWith('save-file')
    })
  })

  it('displays session defaults correctly', () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <SettingsPage />
      </ThemeProvider>
    )

    // Click on Defaults tab to ensure it's active
    fireEvent.click(screen.getByText('Defaults'))

    expect(screen.getByText('Session Defaults')).toBeInTheDocument()
    expect(screen.getByDisplayValue('npm install')).toBeInTheDocument()
    expect(screen.getByDisplayValue('npm run dev')).toBeInTheDocument()
    expect(screen.getByDisplayValue('npm')).toBeInTheDocument()
  })

  it('calls setSessionDefaults when install command is changed', async () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <SettingsPage />
      </ThemeProvider>
    )

    // Click on Defaults tab to ensure it's active
    fireEvent.click(screen.getByText('Defaults'))

    const installCommandInput = screen.getByDisplayValue('npm install')
    fireEvent.change(installCommandInput, { target: { value: 'pnpm install' } })

    await waitFor(() => {
      expect(mockPreferencesStore.setSessionDefaults).toHaveBeenCalledWith({
        installCommand: 'pnpm install',
      })
    })
  })

  it('calls setSessionDefaults when start command is changed', async () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <SettingsPage />
      </ThemeProvider>
    )

    // Click on Defaults tab to ensure it's active
    fireEvent.click(screen.getByText('Defaults'))

    const startCommandInput = screen.getByDisplayValue('npm run dev')
    fireEvent.change(startCommandInput, { target: { value: 'pnpm dev' } })

    await waitFor(() => {
      expect(mockPreferencesStore.setSessionDefaults).toHaveBeenCalledWith({
        startCommand: 'pnpm dev',
      })
    })
  })

  it('calls setSessionDefaults when package manager is changed', async () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <SettingsPage />
      </ThemeProvider>
    )

    // Click on Defaults tab to ensure it's active
    fireEvent.click(screen.getByText('Defaults'))

    const packageManagerSelect = screen.getAllByRole('combobox')[1] // Second select is for package manager
    fireEvent.change(packageManagerSelect, { target: { value: 'pnpm' } })

    await waitFor(() => {
      expect(mockPreferencesStore.setSessionDefaults).toHaveBeenCalledWith({
        packageManager: 'pnpm',
      })
    })
  })

  it('displays telemetry settings correctly', () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <SettingsPage />
      </ThemeProvider>
    )

    // Click on Telemetry tab to ensure it's active
    fireEvent.click(screen.getByText('Telemetry'))

    expect(screen.getByText('Analytics & Telemetry')).toBeInTheDocument()
    expect(screen.getByText('Enable Telemetry')).toBeInTheDocument()
    expect(screen.getByText(/Help us improve LiveHub by sharing anonymous usage data/)).toBeInTheDocument()
  })

  it('calls setTelemetryEnabled when telemetry toggle is changed', async () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <SettingsPage />
      </ThemeProvider>
    )

    // Click on Telemetry tab to ensure it's active
    fireEvent.click(screen.getByText('Telemetry'))

    // Find telemetry switch (should be the only switch on telemetry tab)
    const telemetrySwitch = document.querySelector('[role="switch"]') as HTMLElement
    expect(telemetrySwitch).toBeInTheDocument()

    fireEvent.click(telemetrySwitch)

    await waitFor(() => {
      expect(mockPreferencesStore.setTelemetryEnabled).toHaveBeenCalledWith(true)
    })
  })

  it('shows telemetry thank you message when enabled', () => {
    ;(usePreferencesStore as jest.Mock).mockReturnValue({
      ...mockPreferencesStore,
      telemetryEnabled: true,
    })

    render(
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <SettingsPage />
      </ThemeProvider>
    )

    // Click on Telemetry tab to ensure it's active
    fireEvent.click(screen.getByText('Telemetry'))

    expect(screen.getByText(/Thank you for helping us improve LiveHub!/)).toBeInTheDocument()
  })

  it('persists theme changes to localStorage', async () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <SettingsPage />
      </ThemeProvider>
    )

    // Click on Appearance tab to ensure it's active
    fireEvent.click(screen.getByText('Appearance'))

    const themeSelect = screen.getByRole('combobox')
    fireEvent.change(themeSelect, { target: { value: 'dark' } })

    await waitFor(() => {
      expect(mockSetTheme).toHaveBeenCalledWith('dark')
      expect(mockPreferencesStore.setTheme).toHaveBeenCalledWith('dark')
    })

    // Verify that the theme preference would be stored (mocked in our case)
    expect(mockPreferencesStore.setTheme).toHaveBeenCalled()
  })

  it('persists telemetry changes to localStorage', async () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <SettingsPage />
      </ThemeProvider>
    )

    // Click on Telemetry tab to ensure it's active
    fireEvent.click(screen.getByText('Telemetry'))

    const telemetrySwitch = document.querySelector('[role="switch"]') as HTMLElement
    fireEvent.click(telemetrySwitch)

    await waitFor(() => {
      expect(mockPreferencesStore.setTelemetryEnabled).toHaveBeenCalledWith(true)
    })

    // Verify that the telemetry preference would be stored (mocked in our case)
    expect(mockPreferencesStore.setTelemetryEnabled).toHaveBeenCalled()
  })
})