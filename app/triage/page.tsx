'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Send, 
  Image as ImageIcon,
  AlertCircle,
  Info,
  Settings
} from 'lucide-react'
import { supabase, TriageSession, ChatMessage, SOAPNote as SOAPNoteType } from '@/lib/supabase'
import { SpeechRecognitionManager, BrowserSpeechSynthesis } from '@/lib/speech'
import { 
  getGuestSession, 
  saveGuestSession, 
  canGuestStartNewCase, 
  incrementGuestUsage,
  addGuestPurchase 
} from '@/lib/storage'
import PaymentModal from '@/components/PaymentModal'
import SOAPNote from '@/components/SOAPNote'

interface ChatMessageWithId extends ChatMessage {
  isPlaying?: boolean
}

function TriagePageContent() {
  const searchParams = useSearchParams()
  const [isInitialized, setIsInitialized] = useState(false)
  const [session, setSession] = useState<TriageSession | null>(null)
  const [messages, setMessages] = useState<ChatMessageWithId[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'urgent' | null>(null)
  const [soapNote, setSoapNote] = useState<SOAPNoteType | null>(null)
  const [showSetup, setShowSetup] = useState(true)
  const [petName, setPetName] = useState('')
  const [region, setRegion] = useState<'NZ' | 'AU' | 'UK'>('NZ')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const speechRecognition = useRef<SpeechRecognitionManager | null>(null)
  const speechSynthesis = useRef<BrowserSpeechSynthesis | null>(null)

  // Initialize speech services
  useEffect(() => {
    speechRecognition.current = new SpeechRecognitionManager()
    speechSynthesis.current = new BrowserSpeechSynthesis()
  }, [])

  // Check authentication and handle payment success
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
      
      // Handle payment success
      const paymentStatus = searchParams.get('payment')
      const paymentOption = searchParams.get('option')
      
      if (paymentStatus === 'success' && paymentOption) {
        addGuestPurchase(paymentOption)
        // Clear URL params
        window.history.replaceState({}, '', '/triage')
      }
      
      setIsInitialized(true)
    }
    
    checkAuth()
  }, [searchParams])

  // Load existing session
  useEffect(() => {
    if (!isInitialized) return

    if (currentUser) {
      // Load from Supabase for logged-in users
      // TODO: Implement Supabase session loading
    } else {
      // Load from localStorage for guests
      const guestSession = getGuestSession()
      if (guestSession) {
        setSession(guestSession)
        setMessages(guestSession.messages)
        setPetName(guestSession.pet_name)
        setRegion(guestSession.region)
        setSeverity(guestSession.severity || null)
        setSoapNote(guestSession.soap_note || null)
        setShowSetup(false)
      }
    }
  }, [isInitialized, currentUser])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const startNewSession = useCallback(() => {
    if (!petName.trim()) {
      alert('Please enter your pet\'s name')
      return
    }

    // Check if guest can start new case
    if (!currentUser && !canGuestStartNewCase()) {
      setShowPaymentModal(true)
      return
    }

    const newSession: TriageSession = {
      id: `session_${Date.now()}`,
      user_id: currentUser?.id,
      session_name: `${petName} - ${new Date().toLocaleDateString()}`,
      pet_name: petName,
      region,
      messages: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    setSession(newSession)
    setMessages([])
    setSeverity(null)
    setSoapNote(null)
    setShowSetup(false)

    // Increment usage for guests
    if (!currentUser) {
      incrementGuestUsage()
    }

    // Save session
    if (currentUser) {
      // TODO: Save to Supabase
    } else {
      saveGuestSession(newSession)
    }
  }, [petName, region, currentUser])

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${session?.id}_${Date.now()}.${fileExt}`
      
      const { data, error } = await supabase.storage
        .from('triage-images')
        .upload(fileName, file)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('triage-images')
        .getPublicUrl(fileName)

      return publicUrl
    } catch (error) {
      console.error('Image upload error:', error)
      return null
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('Image must be smaller than 5MB')
        return
      }
      
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const sendMessage = async () => {
    if (!inputText.trim() && !imageFile) return
    if (!session) return

    setIsLoading(true)

    try {
      let imageUrl: string | null = null
      
      // Upload image if present
      if (imageFile) {
        imageUrl = await uploadImage(imageFile)
        setImageFile(null)
        setImagePreview(null)
      }

      // Create user message
      const userMessage: ChatMessageWithId = {
        id: `msg_${Date.now()}`,
        role: 'user',
        content: inputText.trim() || '[Image uploaded]',
        timestamp: new Date().toISOString(),
        image_url: imageUrl || undefined
      }

      const updatedMessages = [...messages, userMessage]
      setMessages(updatedMessages)
      setInputText('')

      // Get AI response
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          petName: session.pet_name,
          region: session.region,
          messages: updatedMessages.map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      })

      const { response: aiResponse } = await response.json()

      // Create AI message
      const aiMessage: ChatMessageWithId = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString()
      }

      const finalMessages = [...updatedMessages, aiMessage]
      setMessages(finalMessages)

      // Play AI response if speaker is enabled
      if (isSpeakerEnabled) {
        playMessage(aiResponse)
      }

      // Update severity after a few messages
      if (finalMessages.length >= 4) {
        updateSeverity(finalMessages)
      }

      // Generate SOAP note after sufficient conversation
      if (finalMessages.length >= 6) {
        generateSOAPNote(finalMessages)
      }

      // Update session
      const updatedSession = {
        ...session,
        messages: finalMessages,
        updated_at: new Date().toISOString()
      }
      setSession(updatedSession)

      // Save session
      if (currentUser) {
        // TODO: Save to Supabase
      } else {
        saveGuestSession(updatedSession)
      }

    } catch (error) {
      console.error('Send message error:', error)
      alert('Failed to send message. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const updateSeverity = async (messages: ChatMessageWithId[]) => {
    try {
      const response = await fetch('/api/severity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      })

      const { severity: newSeverity } = await response.json()
      setSeverity(newSeverity)
    } catch (error) {
      console.error('Severity assessment error:', error)
    }
  }

  const generateSOAPNote = async (messages: ChatMessageWithId[]) => {
    try {
      const response = await fetch('/api/soap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map(m => ({
            role: m.role,
            content: m.content
          })),
          petName: session?.pet_name
        })
      })

      const { soapNote: newSoapNote } = await response.json()
      setSoapNote(newSoapNote)
    } catch (error) {
      console.error('SOAP note generation error:', error)
    }
  }

  const playMessage = async (text: string) => {
    try {
      if (speechSynthesis.current?.isSupported()) {
        // Use browser speech synthesis as fallback
        await speechSynthesis.current.speak(text)
      } else {
        // Use ElevenLabs API
        const response = await fetch('/api/speech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        })

        if (response.ok) {
          const audioBuffer = await response.arrayBuffer()
          const audio = new Audio()
          const blob = new Blob([audioBuffer], { type: 'audio/mpeg' })
          audio.src = URL.createObjectURL(blob)
          audio.play()
        }
      }
    } catch (error) {
      console.error('Speech playback error:', error)
    }
  }

  const startListening = () => {
    if (!speechRecognition.current?.isSupported()) {
      alert('Speech recognition is not supported in your browser')
      return
    }

    speechRecognition.current.startListening(
      (result) => {
        setInputText(result.transcript)
        setIsListening(false)
      },
      (error) => {
        console.error('Speech recognition error:', error)
        setIsListening(false)
      },
      () => setIsListening(true),
      () => setIsListening(false)
    )
  }

  const stopListening = () => {
    speechRecognition.current?.stopListening()
    setIsListening(false)
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" />
      </div>
    )
  }

  if (showSetup) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Luni Triage AI
          </h1>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pet's Name
              </label>
              <input
                type="text"
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter your pet's name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Region
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value as 'NZ' | 'AU' | 'UK')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="NZ">New Zealand</option>
                <option value="AU">Australia</option>
                <option value="UK">United Kingdom</option>
              </select>
            </div>

            <button
              onClick={startNewSession}
              className="w-full bg-primary-600 text-white py-3 px-4 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors font-medium"
            >
              Start Triage
            </button>

            {!currentUser && (
              <p className="text-xs text-gray-500 text-center">
                Guest users get 1 free case per day. Additional cases available for purchase.
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {session?.session_name}
            </h1>
            <p className="text-sm text-gray-500">
              {session?.region} Guidelines
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            {severity && (
              <div className="group relative">
                <span className={`severity-badge severity-${severity}`}>
                  {severity.toUpperCase()}
                </span>
                <div className="absolute right-0 top-8 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  Severity assessment based on conversation
                </div>
              </div>
            )}
            
            <button
              onClick={() => setShowSetup(true)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`chat-message ${message.role}`}
          >
            {message.image_url && (
              <img 
                src={message.image_url} 
                alt="Uploaded" 
                className="max-w-xs rounded-lg mb-2"
              />
            )}
            <p>{message.content}</p>
            {message.role === 'assistant' && (
              <button
                onClick={() => playMessage(message.content)}
                className="mt-2 p-1 text-gray-500 hover:text-gray-700"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="chat-message assistant">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-600 border-t-transparent" />
              <span>Luni is thinking...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* SOAP Note */}
      {soapNote && (
        <div className="p-4">
          <SOAPNote 
            soapNote={soapNote} 
            petName={session?.pet_name || ''} 
            sessionName={session?.session_name || ''} 
          />
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4">
        {imagePreview && (
          <div className="mb-3 relative inline-block">
            <img 
              src={imagePreview} 
              alt="Preview" 
              className="max-w-xs rounded-lg"
            />
            <button
              onClick={() => {
                setImageFile(null)
                setImagePreview(null)
              }}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
            >
              ×
            </button>
          </div>
        )}
        
        <div className="flex items-end space-x-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleImageSelect}
            className="hidden"
          />
          
          <div className="flex-1 relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              placeholder="Describe your pet's symptoms..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
              rows={2}
            />
          </div>
          
          <button
            onClick={isListening ? stopListening : startListening}
            className={`p-2 rounded-md transition-colors ${
              isListening 
                ? 'bg-red-500 text-white' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          
          <button
            onClick={() => setIsSpeakerEnabled(!isSpeakerEnabled)}
            className={`p-2 transition-colors ${
              isSpeakerEnabled 
                ? 'text-primary-600' 
                : 'text-gray-400'
            }`}
          >
            {isSpeakerEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          
          <button
            onClick={sendMessage}
            disabled={isLoading || (!inputText.trim() && !imageFile)}
            className="bg-primary-600 text-white p-2 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        isGuest={!currentUser}
      />
    </div>
  )
}

export default function TriagePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <TriagePageContent />
    </Suspense>
  )
}