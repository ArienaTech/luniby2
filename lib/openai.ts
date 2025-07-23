import OpenAI from 'openai'

let openai: OpenAI | null = null

function getOpenAI() {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required')
    }
    openai = new OpenAI({
      apiKey,
    })
  }
  return openai
}

export interface VetTriageContext {
  petName: string
  region: 'NZ' | 'AU' | 'UK'
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
}

export async function generateTriageResponse(context: VetTriageContext): Promise<string> {
  const systemPrompt = `You are Luni, an AI veterinary triage assistant for ${context.region}. 

Key guidelines:
- Be empathetic, professional, and helpful
- Ask relevant follow-up questions to gather more information
- Provide preliminary assessments but always recommend consulting a veterinarian
- Consider regional veterinary guidelines for ${context.region}
- Focus on the pet named ${context.petName}
- Never provide definitive diagnoses or treatment recommendations
- If the situation seems urgent, clearly state this and recommend immediate veterinary care

Always maintain a caring, professional tone while being informative about potential concerns.`

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...context.messages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }))
  ]

  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4',
    messages,
    max_tokens: 500,
    temperature: 0.7,
  })

  return completion.choices[0]?.message?.content || 'I apologize, but I encountered an error. Please try again.'
}

export async function generateSOAPNote(messages: Array<{ role: 'user' | 'assistant'; content: string }>, petName: string): Promise<{
  subjective: string
  objective: string
  assessment: string
  plan: string
  severity: 'low' | 'medium' | 'high' | 'urgent'
}> {
  const soapPrompt = `Based on this veterinary triage conversation about ${petName}, generate a SOAP note:

Conversation:
${messages.map(m => `${m.role}: ${m.content}`).join('\n')}

Generate a professional SOAP note with:
- Subjective: Owner's description of the problem
- Objective: Observable facts and symptoms mentioned
- Assessment: Preliminary assessment of potential issues
- Plan: Recommended next steps
- Severity: low/medium/high/urgent

Return as JSON with keys: subjective, objective, assessment, plan, severity`

  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: soapPrompt }],
    max_tokens: 600,
    temperature: 0.3,
  })

  try {
    const response = completion.choices[0]?.message?.content || '{}'
    return JSON.parse(response)
  } catch {
    return {
      subjective: 'Unable to generate subjective assessment',
      objective: 'Unable to generate objective assessment', 
      assessment: 'Unable to generate assessment',
      plan: 'Recommend consulting with a veterinarian',
      severity: 'medium' as const
    }
  }
}

export async function assessSeverity(messages: Array<{ role: 'user' | 'assistant'; content: string }>): Promise<'low' | 'medium' | 'high' | 'urgent'> {
  const severityPrompt = `Based on this veterinary triage conversation, assess the severity level:

${messages.map(m => `${m.role}: ${m.content}`).join('\n')}

Respond with only one word: low, medium, high, or urgent

Criteria:
- low: Minor concerns, routine care
- medium: Concerning but not immediately dangerous
- high: Serious condition requiring prompt veterinary attention  
- urgent: Life-threatening, requires immediate emergency care`

  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: severityPrompt }],
    max_tokens: 10,
    temperature: 0.1,
  })

  const severity = completion.choices[0]?.message?.content?.trim().toLowerCase()
  
  if (['low', 'medium', 'high', 'urgent'].includes(severity || '')) {
    return severity as 'low' | 'medium' | 'high' | 'urgent'
  }
  
  return 'medium'
}