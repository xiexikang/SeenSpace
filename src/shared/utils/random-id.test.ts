import { afterEach, describe, expect, it, vi } from 'vitest'
import { randomId } from './random-id'

describe('randomId', () => {
  const originalCrypto = globalThis.crypto

  afterEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(globalThis, 'crypto', {
      value: originalCrypto,
      configurable: true,
    })
  })

  it('uses crypto.randomUUID when available', () => {
    const randomUUID = vi.fn(() => 'uuid-123')
    Object.defineProperty(globalThis, 'crypto', {
      value: { randomUUID },
      configurable: true,
    })

    expect(randomId()).toBe('uuid-123')
    expect(randomUUID).toHaveBeenCalledOnce()
  })

  it('falls back to a timestamp and random suffix when randomUUID is unavailable', () => {
    Object.defineProperty(globalThis, 'crypto', {
      value: undefined,
      configurable: true,
    })
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000)
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789)

    expect(randomId()).toBe('id-loyw3v28-4fzzzxjy')
  })
})
