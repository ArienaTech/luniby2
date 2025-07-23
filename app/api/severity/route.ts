import { NextRequest, NextResponse } from 'next/server'
import { assessSeverity } from '@/lib/openai'

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    const severity = await assessSeverity(messages)

    return NextResponse.json({ severity })
  } catch (error) {
    console.error('Severity API error:', error)
    return NextResponse.json(
      { error: 'Failed to assess severity' },
      { status: 500 }
    )
  }
}