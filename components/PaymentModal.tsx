'use client'

import { useState } from 'react'
import { X, CreditCard } from 'lucide-react'
import { paymentOptions, createCheckoutSession } from '@/lib/stripe'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  isGuest: boolean
}

export default function PaymentModal({ isOpen, onClose, isGuest }: PaymentModalProps) {
  const [loading, setLoading] = useState<string | null>(null)

  if (!isOpen) return null

  const handlePayment = async (priceId: string, optionId: string) => {
    try {
      setLoading(optionId)
      
      const successUrl = `${window.location.origin}/triage?payment=success&option=${optionId}`
      const cancelUrl = `${window.location.origin}/triage?payment=cancelled`
      
      await createCheckoutSession(priceId, successUrl, cancelUrl, isGuest)
    } catch (error) {
      console.error('Payment error:', error)
      alert('Failed to start payment process. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Continue Your Triage
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {isGuest && (
          <div className="p-4 bg-blue-50 border-b">
            <p className="text-sm text-blue-800 font-medium text-center">
              🎉 Guest users: You can purchase additional cases without signing up!
            </p>
          </div>
        )}

        <div className="p-6">
          <p className="text-gray-600 mb-6">
            You've reached your daily limit. Choose an option to continue:
          </p>

          <div className="space-y-4">
            {paymentOptions.map((option) => (
              <div
                key={option.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {option.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      {option.description}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-lg font-bold text-primary-600">
                      {option.price}
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => handlePayment(option.priceId, option.id)}
                  disabled={loading === option.id}
                  className="w-full mt-3 bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {loading === option.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Purchase
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t text-center">
            <p className="text-xs text-gray-500">
              Secure payment processing by Stripe
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}