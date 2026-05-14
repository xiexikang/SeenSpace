import { describe, expect, it } from 'vitest'
import { deriveWorkspaceBatchMetadataState, deriveWorkspaceSelectionState } from './workspace-selection'
import { createEdge, createNode, createSnapshot } from './workspace-test-utils'

describe('workspace selection', () => {
  it('derives group-aware selection state for grouped nodes', () => {
    const snapshot = createSnapshot([
      createNode({
        id: 'lead-1',
        data: {
          title: 'Lead',
          groupId: 'group-1',
          groupLabel: 'Group 1',
          groupLeadId: 'lead-1',
          groupCollapsed: true,
        },
      }),
      createNode({
        id: 'member-1',
        data: {
          title: 'Member',
          groupId: 'group-1',
          groupLabel: 'Group 1',
          groupLeadId: 'lead-1',
          groupCollapsed: true,
        },
      }),
    ])

    const state = deriveWorkspaceSelectionState(snapshot, ['lead-1', 'member-1'], [])

    expect(state.activeGroupId).toBe('group-1')
    expect(state.activeGroupLabel).toBe('Group 1')
    expect(state.activeGroupCollapsed).toBe(true)
    expect(state.canUngroupSelection).toBe(true)
    expect(state.totalSelectionCount).toBe(2)
    expect(state.selectionSummary).toBe('Group 1 selected')
  })

  it('derives edge selection labels and linked nodes', () => {
    const snapshot = createSnapshot(
      [
        createNode({ id: 'a', data: { title: 'Source' } }),
        createNode({ id: 'b', data: { title: 'Target' } }),
      ],
      [createEdge({ id: 'edge-1', source: 'a', target: 'b', label: 'relates to' })],
    )

    const state = deriveWorkspaceSelectionState(snapshot, [], ['edge-1'])

    expect(state.selectedEdge?.id).toBe('edge-1')
    expect(state.sourceNode?.data.title).toBe('Source')
    expect(state.targetNode?.data.title).toBe('Target')
    expect(state.selectionSummary).toBe('relates to selected')
  })

  it('falls back to empty-state summary when nothing is selected', () => {
    const snapshot = createSnapshot([createNode({ id: 'a', data: { title: 'A' } })])

    const state = deriveWorkspaceSelectionState(snapshot, [], [])

    expect(state.selectedNodes).toHaveLength(0)
    expect(state.selectedEdges).toHaveLength(0)
    expect(state.totalSelectionCount).toBe(0)
    expect(state.selectionSummary).toBe('Local-first canvas workspace')
  })

  it('derives shared category and unique tags for batch metadata', () => {
    const selectedNodes = [
      createNode({
        id: 'a',
        data: { title: 'A', meta: 'Research', tags: ['alpha'] } as never,
      }),
      createNode({
        id: 'b',
        type: 'tag_meta',
        data: { title: 'B', meta: 'Research', category: 'Research', tags: ['alpha', 'beta'] },
      }),
    ]

    const state = deriveWorkspaceBatchMetadataState(selectedNodes)

    expect(state.sharedCategory).toBe('Research')
    expect(state.hasMixedCategories).toBe(false)
    expect(state.uniqueTags).toEqual(['alpha', 'beta'])
    expect(state.typeCounts).toEqual([
      { type: 'note', count: 1 },
      { type: 'tag_meta', count: 1 },
    ])
  })

  it('detects mixed categories in batch metadata', () => {
    const selectedNodes = [
      createNode({ id: 'a', data: { title: 'A', meta: 'Research' } }),
      createNode({ id: 'b', data: { title: 'B', meta: 'Launch' } }),
    ]

    const state = deriveWorkspaceBatchMetadataState(selectedNodes)

    expect(state.sharedCategory).toBeUndefined()
    expect(state.hasMixedCategories).toBe(true)
  })
})
