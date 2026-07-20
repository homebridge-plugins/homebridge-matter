import type { API, MatterAPI } from 'homebridge'

/**
 * Resolve the Matter API. `api.matter` is typed as `MatterAPI | undefined`
 * because Homebridge only loads it on Matter-enabled bridges; in this plugin
 * we only ever construct devices after `isMatterEnabled()` returns true, so
 * we throw here if it's missing — that path indicates a Homebridge bug.
 */
export function getMatter(api: API): MatterAPI {
  if (!api.matter) {
    throw new Error('Matter API is not available — this plugin requires a Matter-enabled Homebridge bridge.')
  }
  return api.matter
}

type MatterStatusKind
  = | 'Busy'
    | 'ConstraintError'
    | 'Failure'
    | 'InvalidAction'
    | 'InvalidInState'
    | 'NotFound'
    | 'PermissionDenied'
    | 'ResourceExhausted'
    | 'Timeout'

let matterStatus: Record<string, new (message: string) => Error> | undefined

/**
 * Build a Matter protocol status error.
 *
 * `MatterStatus` is a runtime value rather than a type, so importing it at the
 * top of a module makes Node resolve the `homebridge` package the moment the
 * file is loaded. On setups that keep Homebridge in a different directory tree
 * from the plugins (Jeedom and other custom installs) that resolution fails,
 * and because the platform imports every accessory file the whole plugin then
 * fails to load — not just the accessory that needed it (#5).
 *
 * Resolving it on demand keeps the plugin loading everywhere, and falls back to
 * a plain `Error` so a command still reports a failure if `homebridge` really
 * cannot be reached. Always use this helper instead of importing `MatterStatus`.
 */
export async function matterStatusError(kind: MatterStatusKind, message: string): Promise<Error> {
  try {
    matterStatus ??= (await import('homebridge')).MatterStatus as unknown as Record<string, new (message: string) => Error>
    return new matterStatus[kind](message)
  } catch {
    return new Error(message)
  }
}

export function parseError(error: unknown): string {
  if (error instanceof Error) {
    let result = error.message
    if (error.stack) {
      const stackLine = error.stack.split('\n')[1]?.trim()
      if (stackLine) {
        result += ` at ${stackLine}`
      }
    }
    return result
  }
  return String(error)
}
