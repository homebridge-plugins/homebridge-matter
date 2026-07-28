import type { API, MatterAPI } from 'homebridge'

import { describe, expect, it } from 'vitest'

import { getMatter, matterStatusError, parseError } from './utils.js'

describe('getMatter', () => {
  it('returns the matter api when homebridge provides one', () => {
    const matter = { status: {} } as unknown as MatterAPI
    expect(getMatter({ matter } as API)).toBe(matter)
  })

  it('throws a message that says what is wrong when it is missing', () => {
    // This path means Homebridge handed us a bridge without Matter after
    // isMatterEnabled() said otherwise, so the message needs to point at the
    // bridge rather than leave someone hunting through their config.
    expect(() => getMatter({} as API)).toThrow(/Matter-enabled Homebridge bridge/)
  })
})

describe('matterStatusError', () => {
  it('builds the error class the matter api exposes, not a plain Error', () => {
    // ⚠️ These classes must come off the api object at runtime. Importing them
    // from 'homebridge' is a value import, which fails to resolve on installs
    // that keep Homebridge in a separate directory tree and takes the whole
    // plugin down at load time, not just one accessory (#5).
    class NotFound extends Error {}
    const matter = { status: { NotFound } } as unknown as MatterAPI

    const error = matterStatusError(matter, 'NotFound', 'no such thing')

    expect(error).toBeInstanceOf(NotFound)
    expect(error.message).toBe('no such thing')
  })
})

describe('parseError', () => {
  it('includes the first stack frame so a log line says where it came from', () => {
    const error = new Error('something broke')
    error.stack = 'Error: something broke\n    at doThing (/plugin/src/thing.ts:12:5)\n    at next (/x.ts:1:1)'

    expect(parseError(error)).toBe('something broke at doThing (/plugin/src/thing.ts:12:5)')
  })

  it('does not repeat the word "at"', () => {
    // The stack line already starts with "at". Adding another one produced
    // "something broke at at doThing (...)" in the log, which is also how the
    // other org plugins do NOT render it.
    const error = new Error('something broke')
    error.stack = 'Error: something broke\n    at doThing (/plugin/src/thing.ts:12:5)'

    expect(parseError(error)).not.toContain('at at')
  })

  it('returns just the message when there is no stack', () => {
    const error = new Error('bare')
    error.stack = undefined
    expect(parseError(error)).toBe('bare')
  })

  it('survives a stack with only one line', () => {
    const error = new Error('single')
    error.stack = 'Error: single'
    expect(parseError(error)).toBe('single')
  })

  it('handles things thrown that are not Errors at all', () => {
    // Plenty of libraries reject with a string or an object, and this is used
    // in catch blocks, so it must never throw while reporting a throw.
    expect(parseError('just a string')).toBe('just a string')
    expect(parseError(undefined)).toBe('undefined')
    expect(parseError(null)).toBe('null')
    expect(parseError(404)).toBe('404')
  })
})
