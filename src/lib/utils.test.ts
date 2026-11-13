import { describe, expect, it } from 'vitest'

import { cn } from './utils'

describe('cn', () => {
  it('junta classes e ignora valores vazios', () => {
    expect(cn('a', false, undefined, 'b')).toBe('a b')
  })

  it('resolve conflitos do Tailwind mantendo a última classe', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })
})
