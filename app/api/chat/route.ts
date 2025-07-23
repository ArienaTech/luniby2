import { NextRequest, NextResponse } from 'next/server'
import { generateTriageResponse, VetTriageContext } from '@/lib/openai'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { petName, region, messages } = body as VetTriageContext

    if (!petName || !region || !messages) {
      return NextResponse.json(
        { error: 'Missing required fields: petName, region, or messages' },
        { status: 400 }
      )
    }

    const response = await generateTriageResponse({ petName, region, messages })

    return NextResponse.json({ response })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    )
  }
}