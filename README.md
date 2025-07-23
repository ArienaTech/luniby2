# Luni Triage AI

AI-powered veterinary triage assistant with voice and text chat capabilities.

## Features

- **ChatGPT-style interface** with mobile-first design
- **Voice input/output** using Web Speech API and ElevenLabs
- **Image upload** for visual symptoms
- **SOAP note generation** automatically created from conversations
- **Severity assessment** with color-coded badges
- **Guest mode** with localStorage sessions (24-hour expiry)
- **Payment integration** via Stripe for additional cases
- **Regional guidelines** for NZ, AU, and UK

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables in `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   OPENAI_API_KEY=your_openai_api_key
   ELEVENLABS_API_KEY=your_elevenlabs_api_key
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   STRIPE_SECRET_KEY=your_stripe_secret_key
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) to view the application.

## Usage

1. Navigate to `/triage` to start a new triage session
2. Enter your pet's name and select your region
3. Chat with Luni using text or voice input
4. Upload images if needed
5. View auto-generated SOAP notes and severity assessments
6. For guests: 1 free case per day, purchase additional cases as needed

## Payment Options

- **+1 Triage Case** - $1.99 (one additional case for today)
- **Unlimited Access** - $4.99/month (unlimited cases daily)
- **Vet Nurse Review** - $4.99 (professional verification)  
- **Video Consultation** - $14.99 (15-minute vet nurse call)

## Tech Stack

- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- Supabase (database & storage)
- OpenAI GPT-4
- ElevenLabs (text-to-speech)
- Stripe (payments)
- Web Speech API (speech recognition)