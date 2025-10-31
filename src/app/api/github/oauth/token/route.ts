import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientId, deviceCode } = body

    if (!clientId || !deviceCode) {
      return NextResponse.json(
        { error: 'Client ID and device code are required' },
        { status: 400 }
      )
    }

    // Make request to GitHub's access token endpoint
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'LiveHub-Playground',
      },
      body: new URLSearchParams({
        client_id: clientId,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    })

    const data = await response.json()
    
    // If the response contains an error, pass it through with the same status
    // This allows the client to handle authorization_pending, slow_down, etc.
    if (data.error) {
      console.error('GitHub access token error:', response.status, data)
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Access token proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}