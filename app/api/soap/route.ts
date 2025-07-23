import { NextRequest, NextResponse } from 'next/server'
import { generateSOAPNote } from '@/lib/openai'

export async function POST(request: NextRequest) {
  try {
    const { messages, petName } = await request.json()

    if (!messages || !petName) {
      return NextResponse.json(
        { error: 'Messages and petName are required' },
        { status: 400 }
      )
    }

    const soapNote = await generateSOAPNote(messages, petName)

    return NextResponse.json({ soapNote })
  } catch (error) {
    console.error('SOAP API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate SOAP note' },
      { status: 500 }
    )
  }
}