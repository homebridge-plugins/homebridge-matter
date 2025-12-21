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
