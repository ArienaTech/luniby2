import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          Luni Triage AI
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          AI-powered veterinary triage assistant
        </p>
        <Link 
          href="/triage"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
        >
          Start Triage
        </Link>
      </div>
    </div>
  )
}