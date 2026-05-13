type KeyboardShortcutAction =
  | { type: 'redo' }
  | { type: 'undo' }
  | { type: 'duplicate-selection' }
  | { type: 'ungroup-selection' }
  | { type: 'group-selection' }
  | { type: 'clear-selection' }
  | { type: 'delete-selected-nodes' }
  | { type: 'delete-selected-edges' }
  | { type: 'nudge-selected-nodes'; delta: { x: number; y: number } }

type KeyboardShortcutContext = {
  isTyping: boolean
  key: string
  metaKey: boolean
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
  selectedNodeCount: number
  selectedEdgeCount: number
  canUndo: boolean
  canRedo: boolean
  canUngroupSelection: boolean
}

export function resolveWorkspaceKeyboardAction(
  context: KeyboardShortcutContext,
): KeyboardShortcutAction | undefined {
  if (context.isTyping) return undefined

  const key = context.key.toLowerCase()

  if ((context.metaKey || context.ctrlKey) && !context.altKey) {
    if ((key === 'z' && context.shiftKey) || key === 'y') {
      return context.canRedo ? { type: 'redo' } : undefined
    }

    if (key === 'z') {
      return context.canUndo ? { type: 'undo' } : undefined
    }

    if (key === 'd' && context.selectedNodeCount > 0) {
      return { type: 'duplicate-selection' }
    }

    if (key === 'g' && context.shiftKey && context.canUngroupSelection) {
      return { type: 'ungroup-selection' }
    }

    if (key === 'g' && context.selectedNodeCount > 1) {
      return { type: 'group-selection' }
    }
  }

  if (context.key === 'Escape' && (context.selectedNodeCount > 0 || context.selectedEdgeCount > 0)) {
    return { type: 'clear-selection' }
  }

  if (context.key === 'Delete' || context.key === 'Backspace') {
    if (context.selectedNodeCount > 0) {
      return { type: 'delete-selected-nodes' }
    }
    if (context.selectedEdgeCount > 0) {
      return { type: 'delete-selected-edges' }
    }
  }

  if (context.selectedNodeCount > 0) {
    const step = context.shiftKey ? 24 : 8
    const movementByKey: Record<string, { x: number; y: number }> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    }
    const movement = movementByKey[context.key]
    if (movement) {
      return { type: 'nudge-selected-nodes', delta: movement }
    }
  }

  return undefined
}
