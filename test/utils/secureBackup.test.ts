import { webcrypto } from 'node:crypto'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  decryptBackup,
  encryptBackup,
  isEncryptedBackup,
  type BackupPayload,
  type EncryptedBackup
} from '../../app/utils/secureBackup'

// secureBackup intentionally guards on `window.crypto.subtle`. Provide a
// browser-like global backed by Node's WebCrypto so the AES-GCM round trip
// runs deterministically in the `node` test environment.
beforeAll(() => {
  if (!('window' in globalThis) || !(globalThis as { window?: unknown }).window) {
    ;(globalThis as { window?: unknown }).window = { crypto: webcrypto }
  }
})

const samplePayload: BackupPayload = {
  services: [
    {
      id: 'svc-1',
      startTime: '2026-01-10T08:00:00.000Z',
      endTime: '2026-01-10T16:00:00.000Z',
      displacements: [
        { id: 'd-1', province: 'Barcelona', municipality: 'Manresa', hasLunch: true, hasDinner: false }
      ],
      kilometers: 42.5
    }
  ],
  settings: {
    halfDietPrice: 12,
    fullDietPrice: 24,
    monthlyTemplate: null,
    serviceTemplate: null,
    exportTemplates: false,
    googleMapsApiKey: '',
    firstName: 'Anna'
  },
  meta: { month: '2026-01', year: 2026, type: 'full' }
}

describe('secureBackup', () => {
  it('encrypts a payload into a versioned, base64 envelope', async () => {
    const encrypted = await encryptBackup('s3cret-pass', samplePayload)

    expect(encrypted.version).toBe(1)
    expect(typeof encrypted.salt).toBe('string')
    expect(typeof encrypted.iv).toBe('string')
    expect(typeof encrypted.ciphertext).toBe('string')
    // Ciphertext must not leak plaintext field values.
    expect(encrypted.ciphertext).not.toContain('Anna')
  })

  it('round-trips encrypt -> decrypt with the correct password', async () => {
    const encrypted = await encryptBackup('correct horse', samplePayload)
    const decrypted = await decryptBackup('correct horse', encrypted)

    expect(decrypted).toEqual(samplePayload)
  })

  it('produces a different salt/iv/ciphertext on every encryption', async () => {
    const a = await encryptBackup('pw', samplePayload)
    const b = await encryptBackup('pw', samplePayload)

    expect(a.salt).not.toBe(b.salt)
    expect(a.iv).not.toBe(b.iv)
    expect(a.ciphertext).not.toBe(b.ciphertext)
  })

  it('fails to decrypt with the wrong password', async () => {
    const encrypted = await encryptBackup('right-password', samplePayload)
    await expect(decryptBackup('wrong-password', encrypted)).rejects.toBeTruthy()
  })

  it('rejects an unsupported backup version', async () => {
    const encrypted = await encryptBackup('pw', samplePayload)
    const tampered: EncryptedBackup = { ...encrypted, version: 99 }
    await expect(decryptBackup('pw', tampered)).rejects.toThrow('Unsupported backup version')
  })

  it('requires a password for both encryption and decryption', async () => {
    await expect(encryptBackup('', samplePayload)).rejects.toThrow('Password required')
    const encrypted = await encryptBackup('pw', samplePayload)
    await expect(decryptBackup('', encrypted)).rejects.toThrow('Password required')
  })

  describe('isEncryptedBackup', () => {
    it('recognises a valid encrypted envelope', async () => {
      const encrypted = await encryptBackup('pw', samplePayload)
      expect(isEncryptedBackup(encrypted)).toBe(true)
    })

    it('rejects plain payloads and non-objects', () => {
      expect(isEncryptedBackup(samplePayload)).toBe(false)
      expect(isEncryptedBackup(null)).toBe(false)
      expect(isEncryptedBackup('string')).toBe(false)
      expect(isEncryptedBackup({ ciphertext: 'x', iv: 'y', salt: 'z' })).toBe(false)
    })
  })
})
