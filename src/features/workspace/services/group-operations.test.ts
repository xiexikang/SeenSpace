import { describe, expect, it } from 'vitest'
import type { WorkspaceNode } from '../../../types/workspace'
import {
  buildRenderableNodes,
  deleteNodesFromSnapshot,
  duplicateSelectedNodes,
  expandSelectedNodeIdsByGroup,
  getVisibleSelectedNodeIds,
  renameGroup,
  toggleGroupCollapse,
  ungroupSelectedNodes,
} from './group-operations'
import { createEdge, createNode, createSnapshot } from './workspace-test-utils'
import { getRedoHistoryState, getUndoHistoryState, pushHistoryEntry } from './workspace-history'

describe('group operations', () => {
  it('duplicates a collapsed group into an expanded visible copy', () => {
    const groupId = 'group-1'
    const leadId = 'lead-1'
    const memberId = 'member-1'
    const nodes: WorkspaceNode[] = [
      createNode({
        id: leadId,
        data: {
          title: 'Lead',
          groupId,
          groupLabel: 'Group 1',
          groupLeadId: leadId,
          groupCollapsed: true,
        },
      }),
      createNode({
        id: memberId,
        position: { x: 320, y: 0 },
        data: {
          title: 'Member',
          groupId,
          groupLabel: 'Group 1',
          groupLeadId: leadId,
          groupCollapsed: true,
        },
      }),
    ]

    const result = duplicateSelectedNodes(nodes, [leadId, memberId])
    const duplicatedNodes = result.nodes.slice(nodes.length)

    expect(duplicatedNodes).toHaveLength(2)
    expect(duplicatedNodes.every((node) => node.data.groupCollapsed === false)).toBe(true)
    expect(result.duplicatedVisibleIds).toHaveLength(2)
    expect(new Set(result.duplicatedVisibleIds)).toEqual(new Set(duplicatedNodes.map((node) => node.id)))
    expect(new Set(duplicatedNodes.map((node) => node.data.groupId))).toHaveProperty('size', 1)
    expect(new Set(duplicatedNodes.map((node) => node.data.groupLabel))).toEqual(new Set(['Group 1 Copy']))
  })

  it('keeps duplicates visible across repeated copy operations', () => {
    const nodes: WorkspaceNode[] = [
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
    ]

    const firstCopy = duplicateSelectedNodes(nodes, ['lead-1', 'member-1'])
    const secondCopy = duplicateSelectedNodes(firstCopy.nodes, firstCopy.duplicatedVisibleIds)

    const secondBatch = secondCopy.nodes.slice(firstCopy.nodes.length)
    expect(secondBatch).toHaveLength(2)
    expect(secondBatch.every((node) => node.data.groupCollapsed === false)).toBe(true)
    expect(secondCopy.duplicatedVisibleIds).toEqual(secondBatch.map((node) => node.id))
  })

  it('excludes hidden nodes from visible selection synchronization', () => {
    const groupId = 'group-1'
    const leadId = 'lead-1'
    const memberId = 'member-1'
    const renderState = buildRenderableNodes(
      [
        createNode({
          id: leadId,
          data: {
            title: 'Lead',
            groupId,
            groupLabel: 'Group 1',
            groupLeadId: leadId,
            groupCollapsed: true,
          },
        }),
        createNode({
          id: memberId,
          data: {
            title: 'Member',
            groupId,
            groupLabel: 'Group 1',
            groupLeadId: leadId,
            groupCollapsed: true,
          },
        }),
      ],
      [leadId, memberId],
    )

    const hiddenMember = renderState.nodes.find((node) => node.id === memberId)
    const leadNode = renderState.nodes.find((node) => node.id === leadId)

    expect(leadNode?.selected).toBe(true)
    expect(hiddenMember?.hidden).toBe(true)
    expect(hiddenMember?.selected).toBe(false)
    expect(getVisibleSelectedNodeIds(renderState.nodes, [leadId, memberId])).toEqual([leadId])
  })

  it('expands selection to the full group when any group member is selected', () => {
    const nodes: WorkspaceNode[] = [
      createNode({
        id: 'lead-1',
        data: {
          title: 'Lead',
          groupId: 'group-1',
          groupLabel: 'Group 1',
          groupLeadId: 'lead-1',
        },
      }),
      createNode({
        id: 'member-1',
        data: {
          title: 'Member',
          groupId: 'group-1',
          groupLabel: 'Group 1',
          groupLeadId: 'lead-1',
        },
      }),
      createNode({ id: 'solo-1', data: { title: 'Solo' } }),
    ]

    expect(expandSelectedNodeIdsByGroup(nodes, ['member-1'])).toEqual(['lead-1', 'member-1'])
    expect(expandSelectedNodeIdsByGroup(nodes, ['solo-1'])).toEqual(['solo-1'])
  })

  it('renames every member of a group', () => {
    const snapshot = createSnapshot([
      createNode({
        id: 'lead-1',
        data: {
          title: 'Lead',
          groupId: 'group-1',
          groupLabel: 'Group 1',
          groupLeadId: 'lead-1',
        },
      }),
      createNode({
        id: 'member-1',
        data: {
          title: 'Member',
          groupId: 'group-1',
          groupLabel: 'Group 1',
          groupLeadId: 'lead-1',
        },
      }),
    ])

    const nextSnapshot = renameGroup(snapshot, 'group-1', 'References')

    expect(new Set(nextSnapshot.nodes.map((node) => node.data.groupLabel))).toEqual(new Set(['References']))
  })

  it('removes nodes and connected edges together', () => {
    const snapshot = createSnapshot(
      [
        createNode({ id: 'a', data: { title: 'A' } }),
        createNode({ id: 'b', data: { title: 'B' } }),
        createNode({ id: 'c', data: { title: 'C' } }),
      ],
      [
        createEdge({ id: 'ab', source: 'a', target: 'b' }),
        createEdge({ id: 'bc', source: 'b', target: 'c' }),
      ],
    )

    const nextSnapshot = deleteNodesFromSnapshot(snapshot, ['b'])

    expect(nextSnapshot.nodes.map((node) => node.id)).toEqual(['a', 'c'])
    expect(nextSnapshot.edges).toHaveLength(0)
  })

  it('ungroups the whole selected group and clears collapsed state', () => {
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

    const nextSnapshot = ungroupSelectedNodes(snapshot, ['lead-1'])

    expect(nextSnapshot.nodes.every((node) => !node.data.groupId && !node.data.groupCollapsed)).toBe(true)
  })

  it('toggles collapse for every group member', () => {
    const snapshot = createSnapshot([
      createNode({
        id: 'lead-1',
        data: {
          title: 'Lead',
          groupId: 'group-1',
          groupLabel: 'Group 1',
          groupLeadId: 'lead-1',
          groupCollapsed: false,
        },
      }),
      createNode({
        id: 'member-1',
        data: {
          title: 'Member',
          groupId: 'group-1',
          groupLabel: 'Group 1',
          groupLeadId: 'lead-1',
          groupCollapsed: false,
        },
      }),
    ])

    const result = toggleGroupCollapse(snapshot, 'group-1')

    expect(result.memberIds).toEqual(['lead-1', 'member-1'])
    expect(result.collapsed).toBe(true)
    expect(result.snapshot.nodes.every((node) => node.data.groupCollapsed === true)).toBe(true)
  })
})

describe('workspace history', () => {
  it('adds new snapshots and supports undo and redo traversal', () => {
    const initial = createSnapshot([createNode({ id: 'a', data: { title: 'A' } })])
    const second = createSnapshot([createNode({ id: 'a', data: { title: 'A copy' } })])
    const third = createSnapshot([createNode({ id: 'a', data: { title: 'A final' } })])

    const firstPush = pushHistoryEntry([initial], 0, second, 80)
    const secondPush = pushHistoryEntry(firstPush.history, firstPush.historyIndex, third, 80)
    const undoState = getUndoHistoryState(secondPush.history, secondPush.historyIndex)
    const redoState = getRedoHistoryState(secondPush.history, undoState.historyIndex)

    expect(secondPush.history).toHaveLength(3)
    expect(undoState.snapshot).toEqual(second)
    expect(redoState.snapshot).toEqual(third)
  })

  it('does not duplicate equal snapshots in history', () => {
    const initial = createSnapshot([createNode({ id: 'a', data: { title: 'A' } })])
    const nextState = pushHistoryEntry([initial], 0, initial, 80)

    expect(nextState.history).toHaveLength(1)
    expect(nextState.historyIndex).toBe(0)
  })
})
