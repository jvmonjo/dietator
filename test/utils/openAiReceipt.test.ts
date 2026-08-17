import { afterEach, describe, expect, it, vi } from 'vitest'
import { analyzeReceiptWithOpenAi } from '~/utils/openAiReceipt'

describe('analyzeReceiptWithOpenAi', () => {
  afterEach(() => vi.restoreAllMocks())

  it('returns normalized receipt fields from a raw Responses API response', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      output: [{
        type: 'message',
        content: [{
          type: 'output_text',
          text: '{"amount":12.5,"date":"2026-08-13","time":"14:30","description":"Cafeteria","location":null,"category":"diet"}'
        }]
      }]
    }), { status: 200 }))

    await expect(analyzeReceiptWithOpenAi(['data:image/jpeg;base64,abc'], 'sk-test')).resolves.toEqual({
      amount: 12.5,
      date: '2026-08-13',
      dateTime: '2026-08-13T14:30',
      description: 'Cafeteria',
      location: undefined,
      category: 'diet'
    })
    expect(fetchMock).toHaveBeenCalledWith('https://api.openai.com/v1/responses', expect.objectContaining({ method: 'POST' }))
    const request = fetchMock.mock.calls[0]?.[1]
    expect(JSON.parse(String(request?.body)).input[0].content[0].text).toContain('Category must be one of')
    expect(JSON.parse(String(request?.body)).input[0].content[0].text).toContain('never invent 00:00')
  })

  it('returns the receipt date without inventing a missing time', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      output_text: '{"amount":47.58,"date":"2026-08-17","time":null,"description":"Efitec95Nex","location":"Alboraya","category":"gas"}'
    }), { status: 200 }))

    await expect(analyzeReceiptWithOpenAi(['image'], 'sk-test')).resolves.toMatchObject({
      amount: 47.58,
      date: '2026-08-17',
      dateTime: undefined,
      category: 'gas'
    })
  })

  it('supports the SDK-style output_text convenience field', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      output_text: '{"amount":8,"dateTime":null,"description":"Bakery","location":"Palma"}'
    }), { status: 200 }))

    await expect(analyzeReceiptWithOpenAi(['image'], 'sk-test')).resolves.toEqual({
      amount: 8,
      dateTime: undefined,
      description: 'Bakery',
      location: 'Palma',
      category: undefined
    })
  })

  it('ignores categories outside the supported values', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      output_text: '{"amount":20,"category":"restaurant"}'
    }), { status: 200 }))

    await expect(analyzeReceiptWithOpenAi(['image'], 'sk-test')).resolves.toMatchObject({
      amount: 20,
      category: undefined
    })
  })

  it('rejects API responses without text output', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      output: [{ type: 'message', content: [] }]
    }), { status: 200 }))

    await expect(analyzeReceiptWithOpenAi(['image'], 'sk-test')).rejects.toThrow('empty_openai_response')
  })

  it('rejects requests without an API key', async () => {
    await expect(analyzeReceiptWithOpenAi(['image'], '')).rejects.toThrow('missing_api_key')
  })
})
