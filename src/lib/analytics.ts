import { usePreferencesStore } from '@/state/preferences-store'

export interface AnalyticsEvent {
  event: string
  properties?: Record<string, any>
  timestamp?: string
}

class Analytics {
  private isEnabled: boolean = false
  private eventQueue: AnalyticsEvent[] = []
  private apiUrl: string = '/api/analytics'

  constructor() {
    this.loadSettings()
  }

  private loadSettings() {
    if (typeof window !== 'undefined') {
      this.isEnabled = localStorage.getItem('livehub-preferences')?.includes('"telemetryEnabled":true') ?? false
    }
  }

  enable() {
    this.isEnabled = true
    this.flushQueue()
  }

  disable() {
    this.isEnabled = false
  }

  track(event: string, properties?: Record<string, any>) {
    const analyticsEvent: AnalyticsEvent = {
      event,
      properties,
      timestamp: new Date().toISOString(),
    }

    if (this.isEnabled) {
      this.sendEvent(analyticsEvent)
    } else {
      this.eventQueue.push(analyticsEvent)
    }
  }

  private async sendEvent(event: AnalyticsEvent) {
    try {
      await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      })
    } catch (error) {
      console.warn('Failed to send analytics event:', error)
    }
  }

  private flushQueue() {
    if (this.eventQueue.length > 0) {
      const events = [...this.eventQueue]
      this.eventQueue = []
      events.forEach(event => this.sendEvent(event))
    }
  }
}

export const analytics = new Analytics()

// Hook for React components
export function useAnalytics() {
  const { telemetryEnabled } = usePreferencesStore()

  return {
    track: (event: string, properties?: Record<string, any>) => {
      if (telemetryEnabled) {
        analytics.track(event, properties)
      }
    },
    isEnabled: telemetryEnabled,
  }
}