import type { ServiceRecord } from '~/stores/services'

interface SettingsSnapshot {
  halfDietPrice: number
  fullDietPrice: number
}

export interface BackupPayload {
  services: ServiceRecord[]
  settings: SettingsSnapshot
}

export interface EncryptedBackup {
  version: number
  salt: string
  iv: string
  ciphertext: string
}

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

const bufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

const base64ToBuffer = (base64: string) => {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

const getCrypto = () => {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    throw new Error('Crypto API not available')
  }
  return window.crypto
}

const deriveKey = async (password: string, salt: ArrayBuffer) => {
  const crypto = getCrypto()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 150000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export const encryptBackup = async (password: string, payload: BackupPayload): Promise<EncryptedBackup> => {
  if (!password) {
    throw new Error('Password required')
  }
  const crypto = getCrypto()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt.buffer)
  const data = textEncoder.encode(JSON.stringify(payload))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)

  return {
    version: 1,
    salt: bufferToBase64(salt.buffer),
    iv: bufferToBase64(iv.buffer),
    ciphertext: bufferToBase64(encrypted)
  }
}

export const decryptBackup = async (password: string, backup: EncryptedBackup): Promise<BackupPayload> => {
  if (!password) {
    throw new Error('Password required')
  }
  if (backup.version !== 1) {
    throw new Error('Unsupported backup version')
  }

  const saltBuffer = base64ToBuffer(backup.salt)
  const iv = new Uint8Array(base64ToBuffer(backup.iv))
  const key = await deriveKey(password, saltBuffer)
  const decrypted = await getCrypto().subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    base64ToBuffer(backup.ciphertext)
  )

  return JSON.parse(textDecoder.decode(decrypted))
}
