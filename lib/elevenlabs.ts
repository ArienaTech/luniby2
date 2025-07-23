export async function generateSpeech(text: string): Promise<ArrayBuffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  
  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured')
  }

  // Using a professional female voice for veterinary context
  const voiceId = '21m00Tcm4TlvDq8ikWAM' // Rachel voice
  
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5,
        style: 0.0,
        use_speaker_boost: true
      }
    }),
  })

  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.status}`)
  }

  return response.arrayBuffer()
}

export function createAudioFromBuffer(buffer: ArrayBuffer): HTMLAudioElement {
  const blob = new Blob([buffer], { type: 'audio/mpeg' })
  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
  
  // Clean up the URL when audio is done playing
  audio.addEventListener('ended', () => {
    URL.revokeObjectURL(url)
  })
  
  return audio
}