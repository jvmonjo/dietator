import type { ParsedReceipt } from '~/utils/ocr'

interface OpenAiResponse {
  output_text?: string
  output?: Array<{
    content?: Array<{
      type?: string
      text?: string
    }>
  }>
}

const getOutputText = (response: OpenAiResponse): string | undefined => {
  if (response.output_text?.trim()) return response.output_text

  const text = response.output
    ?.flatMap(item => item.content ?? [])
    .filter(content => content.type === 'output_text')
    .map(content => content.text ?? '')
    .join('')
    .trim()

  return text || undefined
}

const parseResponse = (value: string): ParsedReceipt => {
  const json = value.replace(/^```json\s*|\s*```$/g, '').trim()
  const data = JSON.parse(json) as Record<string, unknown>

  return {
    amount: typeof data.amount === 'number' && Number.isFinite(data.amount) ? data.amount : undefined,
    dateTime: typeof data.dateTime === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(data.dateTime)
      ? data.dateTime
      : undefined,
    description: typeof data.description === 'string' ? data.description.trim() || undefined : undefined,
    location: typeof data.location === 'string' ? data.location.trim() || undefined : undefined
  }
}

/** Sends receipt images to OpenAI for structured field extraction. */
export async function analyzeReceiptWithOpenAi(images: string[], apiKey: string): Promise<ParsedReceipt> {
  if (!apiKey.trim()) throw new Error('missing_api_key')
  if (images.length === 0) throw new Error('no_images')

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      input: [{
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: 'Extract this receipt as JSON only with keys amount (number or null), dateTime (local YYYY-MM-DDTHH:mm or null), description (short merchant or expense concept), and location (address or place, or null). Do not guess unreadable values.'
          },
          ...images.map(imageUrl => ({ type: 'input_image', image_url: imageUrl }))
        ]
      }]
    })
  })

  if (!response.ok) throw new Error(`openai_${response.status}`)
  const result = await response.json() as OpenAiResponse
  const outputText = getOutputText(result)
  if (!outputText) throw new Error('empty_openai_response')
  return parseResponse(outputText)
}
