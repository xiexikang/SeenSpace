import { describe, expect, it } from 'vitest'
import { resolveWorkspaceKeyboardAction } from './workspace-keyboard'

const baseContext = {
  isTyping: false,
  key: '',
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  selectedNodeCount: 0,
  selectedEdgeCount: 0,
  canUndo: false,
  canRedo: false,
  canUngroupSelection: false,
}

describe('workspace keyboard shortcuts', () => {
  it('ignores shortcuts while typing', () => {
    const action = resolveWorkspaceKeyboardAction({
      ...baseContext,
      isTyping: true,
      key: 'd',
      ctrlKey: true,
      selectedNodeCount: 1,
    })

    expect(action).toBeUndefined()
  })

  it('maps history shortcuts to undo and redo', () => {
    expect(
      resolveWorkspaceKeyboardAction({
        ...baseContext,
        key: 'z',
        ctrlKey: true,
        canUndo: true,
      }),
    ).toEqual({ type: 'undo' })

    expect(
      resolveWorkspaceKeyboardAction({
        ...baseContext,
        key: 'z',
        ctrlKey: true,
        shiftKey: true,
        canRedo: true,
      }),
    ).toEqual({ type: 'redo' })
  })

  it('maps grouping shortcuts from selection state', () => {
    expect(
      resolveWorkspaceKeyboardAction({
        ...baseContext,
        key: 'g',
        metaKey: true,
        selectedNodeCount: 2,
      }),
    ).toEqual({ type: 'group-selection' })

    expect(
      resolveWorkspaceKeyboardAction({
        ...baseContext,
        key: 'g',
        metaKey: true,
        shiftKey: true,
        canUngroupSelection: true,
      }),
    ).toEqual({ type: 'ungroup-selection' })
  })

  it('maps deletion and clear shortcuts to current selection kind', () => {
    expect(
      resolveWorkspaceKeyboardAction({
        ...baseContext,
        key: 'Delete',
        selectedNodeCount: 1,
      }),
    ).toEqual({ type: 'delete-selected-nodes' })

    expect(
      resolveWorkspaceKeyboardAction({
        ...baseContext,
        key: 'Backspace',
        selectedEdgeCount: 2,
      }),
    ).toEqual({ type: 'delete-selected-edges' })

    expect(
      resolveWorkspaceKeyboardAction({
        ...baseContext,
        key: 'Escape',
        selectedNodeCount: 1,
      }),
    ).toEqual({ type: 'clear-selection' })
  })

  it('maps arrow keys to nudge distances', () => {
    expect(
      resolveWorkspaceKeyboardAction({
        ...baseContext,
        key: 'ArrowRight',
        selectedNodeCount: 1,
      }),
    ).toEqual({ type: 'nudge-selected-nodes', delta: { x: 8, y: 0 } })

    expect(
      resolveWorkspaceKeyboardAction({
        ...baseContext,
        key: 'ArrowDown',
        selectedNodeCount: 1,
        shiftKey: true,
      }),
    ).toEqual({ type: 'nudge-selected-nodes', delta: { x: 0, y: 24 } })
  })

  it('maps number keys to edge relationship presets for edge-only selection', () => {
    expect(
      resolveWorkspaceKeyboardAction({
        ...baseContext,
        key: '1',
        selectedEdgeCount: 1,
      }),
    ).toEqual({ type: 'apply-edge-preset', index: 0 })

    expect(
      resolveWorkspaceKeyboardAction({
        ...baseContext,
        key: '6',
        selectedEdgeCount: 1,
      }),
    ).toEqual({ type: 'apply-edge-preset', index: 5 })

    expect(
      resolveWorkspaceKeyboardAction({
        ...baseContext,
        key: '3',
        selectedEdgeCount: 2,
      }),
    ).toEqual({ type: 'apply-edge-preset', index: 2 })

    expect(
      resolveWorkspaceKeyboardAction({
        ...baseContext,
        key: '2',
        selectedNodeCount: 1,
        selectedEdgeCount: 1,
      }),
    ).toBeUndefined()

    expect(
      resolveWorkspaceKeyboardAction({
        ...baseContext,
        key: '7',
        selectedEdgeCount: 1,
      }),
    ).toBeUndefined()
  })
})
