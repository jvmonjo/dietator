import { describe, it, expect } from 'vitest'
import { parseReceiptText } from '~/utils/ocr'

describe('parseReceiptText', () => {
  it('extracts the total amount, date and merchant from a Spanish receipt', () => {
    const text = [
      'RESTAURANTE EL RINCON',
      'C/ Mayor 12, Madrid',
      'Fecha: 14/03/2026 21:35',
      'Menu del dia       12,50',
      'Cafe                1,20',
      'TOTAL A PAGAR      13,70'
    ].join('\n')

    const parsed = parseReceiptText(text)
    expect(parsed.amount).toBe(13.7)
    expect(parsed.dateTime).toBe('2026-03-14T21:35')
    expect(parsed.description).toBe('RESTAURANTE EL RINCON')
    expect(parsed.location).toBe('C/ Mayor 12, Madrid')
  })

  it('prefers a "total" line over larger non-total numbers', () => {
    const text = [
      'GASOLINERA',
      'Litros 45,00',
      'Precio/L 1,659',
      'TOTAL 74,66'
    ].join('\n')

    const parsed = parseReceiptText(text)
    expect(parsed.amount).toBe(74.66)
  })

  it('handles thousands separators and dot decimals', () => {
    const text = 'Importe total: 1.234,56'
    expect(parseReceiptText(text).amount).toBe(1234.56)

    const english = 'TOTAL 1,234.56'
    expect(parseReceiptText(english).amount).toBe(1234.56)
  })

  it('parses ISO and two-digit-year dates and defaults the time to midday', () => {
    expect(parseReceiptText('Date 2026-01-09').dateTime).toBe('2026-01-09T12:00')
    expect(parseReceiptText('05/02/26').dateTime).toBe('2026-02-05T12:00')
  })

  it('uses the time nearest to the receipt date instead of unrelated opening hours', () => {
    const text = [
      'HORARIO 08:00-23:00',
      'CAFETERIA',
      'Fecha: 07/04/2026',
      'Hora: 14:25',
      'TOTAL 9,50'
    ].join('\n')

    expect(parseReceiptText(text).dateTime).toBe('2026-04-07T14:25')
  })

  it('extracts a likely location from address-like receipt lines', () => {
    const text = [
      'PARKING CENTRO',
      'Avenida Diagonal 640',
      '08017 Barcelona',
      'TOTAL 4,80'
    ].join('\n')

    expect(parseReceiptText(text).location).toBe('Avenida Diagonal 640')
  })

  it('returns no fields when nothing is recognisable', () => {
    const parsed = parseReceiptText('!!!  ???  ---')
    expect(parsed.amount).toBeUndefined()
    expect(parsed.dateTime).toBeUndefined()
    expect(parsed.description).toBeUndefined()
  })

  it('falls back to the largest value when no total keyword is present', () => {
    const text = ['Producto A 3,00', 'Producto B 9,90', 'Producto C 1,10'].join('\n')
    expect(parseReceiptText(text).amount).toBe(9.9)
  })
})
