export interface SpeechRecognitionResult {
  transcript: string
  confidence: number
}

export class SpeechRecognitionManager {
  private recognition: any = null
  private isListening = false
  private onResult?: (result: SpeechRecognitionResult) => void
  private onError?: (error: string) => void
  private onStart?: () => void
  private onEnd?: () => void

  constructor() {
    if (typeof window !== 'undefined') {
      // Check for Web Speech API support
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition()
        this.setupRecognition()
      }
    }
  }

  private setupRecognition() {
    if (!this.recognition) return

    this.recognition.continuous = false
    this.recognition.interimResults = false
    this.recognition.lang = 'en-US'

    this.recognition.onstart = () => {
      this.isListening = true
      this.onStart?.()
    }

    this.recognition.onresult = (event: any) => {
      const result = event.results[0]
      if (result.isFinal) {
        const transcript = result[0].transcript
        const confidence = result[0].confidence
        this.onResult?.({ transcript, confidence })
      }
    }

    this.recognition.onerror = (event: any) => {
      this.isListening = false
      this.onError?.(event.error)
    }

    this.recognition.onend = () => {
      this.isListening = false
      this.onEnd?.()
    }
  }

  public startListening(
    onResult: (result: SpeechRecognitionResult) => void,
    onError?: (error: string) => void,
    onStart?: () => void,
    onEnd?: () => void
  ) {
    if (!this.recognition) {
      onError?.('Speech recognition not supported')
      return
    }

    if (this.isListening) {
      this.stopListening()
    }

    this.onResult = onResult
    this.onError = onError
    this.onStart = onStart
    this.onEnd = onEnd

    try {
      this.recognition.start()
    } catch (error) {
      onError?.('Failed to start speech recognition')
    }
  }

  public stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop()
    }
  }

  public isSupported(): boolean {
    return !!this.recognition
  }

  public getIsListening(): boolean {
    return this.isListening
  }
}

// Alternative: Use browser's built-in speech synthesis for simple TTS
export class BrowserSpeechSynthesis {
  private synth: SpeechSynthesis | null = null
  private voices: SpeechSynthesisVoice[] = []

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis
      this.loadVoices()
    }
  }

  private loadVoices() {
    if (!this.synth) return

    const updateVoices = () => {
      this.voices = this.synth!.getVoices()
    }

    updateVoices()
    
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = updateVoices
    }
  }

  public speak(text: string, rate: number = 1, pitch: number = 1): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synth) {
        reject(new Error('Speech synthesis not supported'))
        return
      }

      // Cancel any ongoing speech
      this.synth.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      
      // Try to use a female voice
      const femaleVoice = this.voices.find(voice => 
        voice.name.toLowerCase().includes('female') || 
        voice.name.toLowerCase().includes('woman') ||
        voice.name.toLowerCase().includes('karen') ||
        voice.name.toLowerCase().includes('susan')
      )
      
      if (femaleVoice) {
        utterance.voice = femaleVoice
      }

      utterance.rate = rate
      utterance.pitch = pitch
      utterance.volume = 1

      utterance.onend = () => resolve()
      utterance.onerror = (event) => reject(new Error('Speech synthesis failed'))

      this.synth.speak(utterance)
    })
  }

  public stop() {
    if (this.synth) {
      this.synth.cancel()
    }
  }

  public isSupported(): boolean {
    return !!this.synth
  }
}