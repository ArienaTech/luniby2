import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export { stripePromise }

export interface PaymentOption {
  id: string
  name: string
  description: string
  price: string
  priceId: string // Stripe Price ID
}

export const paymentOptions: PaymentOption[] = [
  {
    id: 'single-case',
    name: '+1 Triage Case',
    description: 'Get one additional case for today.',
    price: '$1.99',
    priceId: 'price_single_case' // Replace with actual Stripe Price ID
  },
  {
    id: 'unlimited',
    name: 'Unlimited Access',
    description: 'Unlimited triage cases every day.',
    price: '$4.99/month',
    priceId: 'price_unlimited_monthly' // Replace with actual Stripe Price ID
  },
  {
    id: 'nurse-review',
    name: 'Vet Nurse Review',
    description: 'Get this summary verified by a licensed vet nurse.',
    price: '$4.99',
    priceId: 'price_nurse_review' // Replace with actual Stripe Price ID
  },
  {
    id: 'video-consultation',
    name: 'Video Consultation',
    description: 'Talk to a vet nurse in a 15-minute video call.',
    price: '$14.99',
    priceId: 'price_video_consultation' // Replace with actual Stripe Price ID
  }
]

export async function createCheckoutSession(
  priceId: string,
  successUrl: string,
  cancelUrl: string,
  isGuest: boolean = false
) {
  const response = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      priceId,
      successUrl,
      cancelUrl,
      isGuest
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to create checkout session')
  }

  const { sessionId } = await response.json()
  
  const stripe = await stripePromise
  if (!stripe) {
    throw new Error('Stripe not loaded')
  }

  const result = await stripe.redirectToCheckout({
    sessionId,
  })

  if (result.error) {
    throw new Error(result.error.message)
  }
}