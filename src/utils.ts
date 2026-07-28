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

export type MatterStatusKind
  = | 'Busy'
    | 'ConstraintError'
    | 'Failure'
    | 'InvalidAction'
    | 'InvalidInState'
    | 'NotFound'
    | 'PermissionDenied'
    | 'ResourceExhausted'
    | 'Timeout'

/**
 * Build a Matter protocol status error to throw from a cluster handler.
 *
 * The error classes come from `api.matter.status` (Homebridge 2.3.0 and
 * later). They must never be reached with `import { MatterStatus } from
 * 'homebridge'`: that is a value import, so Node resolves the `homebridge`
 * package the moment the file is loaded. On setups that keep Homebridge in a
 * different directory tree from the plugins (Jeedom and other custom installs)
 * the resolution fails, and because the platform imports every accessory file
 * at startup the whole plugin fails to load — not just the accessory that
 * needed it (#5). Reading them off the `api` object the plugin already holds
 * has no such problem.
 *
 * Accessories should prefer `this.statusError(...)` on `BaseMatterAccessory`.
 */
export function matterStatusError(matter: MatterAPI, kind: MatterStatusKind, message: string): Error {
  return new matter.status[kind](message)
}

export function parseError(error: unknown): string {
  if (error instanceof Error) {
    let result = error.message
    if (error.stack) {
      // The stack line already begins with "at", so only the separating space
      // is added here. Prefixing another "at" produced "message at at doThing
      // (...)" in the log, and made this the odd one out among the org's
      // plugins, which all render it as "message at doThing (...)".
      const stackLine = error.stack.split('\n')[1]?.trim()
      if (stackLine) {
        result += ` ${stackLine}`
      }
    }
    return result
  }
  return String(error)
}
