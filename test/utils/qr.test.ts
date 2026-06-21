import { describe, expect, it } from 'vitest'
import { compressExpenseRecord, decompressExpenseRecord } from '../../app/utils/qr'

describe('expense QR helpers', () => {
  it('round-trips the core fields and drops id + ticket', () => {
    const compressed = compressExpenseRecord({
      id: 'abc',
      description: 'Parking',
      amount: 4.5,
      timestamp: '2026-06-16T10:00:00.000Z',
      category: 'parking',
      location: {
        label: 'Main Street, Valencia',
        placeId: 'place-1',
        city: 'Valencia',
        province: 'Valencia',
        zone: 'Ciutat Vella',
        lat: 39.4699,
        lng: -0.3763
      },
      ticket: 'data:image/jpeg;base64,AAAA',
      ticketName: 'r.jpg',
      ticketType: 'image/jpeg'
    })

    // Minified payload should not carry id or ticket data.
    expect(JSON.stringify(compressed)).not.toContain('data:image')
    expect((compressed as Record<string, unknown>).id).toBeUndefined()

    const restored = decompressExpenseRecord(compressed)
    expect(restored).toMatchObject({
      description: 'Parking',
      amount: 4.5,
      timestamp: '2026-06-16T10:00:00.000Z',
      category: 'parking',
      location: {
        label: 'Main Street, Valencia',
        placeId: 'place-1',
        city: 'Valencia',
        province: 'Valencia',
        zone: 'Ciutat Vella',
        lat: 39.4699,
        lng: -0.3763
      }
    })
    expect(restored.ticket).toBeUndefined()
  })

  it('reads a legacy full payload', () => {
    const restored = decompressExpenseRecord({
      description: 'Lunch',
      amount: 12,
      timestamp: '2026-06-16T12:00:00.000Z',
      category: 'diet',
      location: { label: 'Lunch Bar', city: 'Valencia' }
    })
    expect(restored.description).toBe('Lunch')
    expect(restored.amount).toBe(12)
    expect(restored.category).toBe('diet')
    expect(restored.location).toEqual({ label: 'Lunch Bar', city: 'Valencia' })
  })
})
