import { describe, expect, it } from 'vitest'
import type { EdgeChange, NodeChange } from '@xyflow/react'
import type { WorkspaceEdge, WorkspaceNode } from '../../../types/workspace'
import { createEdge, createNode, createSnapshot } from '../../workspace/services/workspace-test-utils'
import {
  buildCanvasStageState,
  getEdgeFocusRole,
  shouldPersistEdgeChanges,
  shouldPersistNodeChanges,
} from './canvas-stage-state'

describe('canvas stage state', () => {
  it('persists only structural node changes', () => {
    const selectChange: NodeChange<WorkspaceNode> = { id: 'n1', type: 'select', selected: true }
    const positionChange: NodeChange<WorkspaceNode> = {
      id: 'n1',
      type: 'position',
      position: { x: 10, y: 20 },
      dragging: false,
    }
    const addChange: NodeChange<WorkspaceNode> = {
      item: createNode({ id: 'n2' }),
      type: 'add',
      index: 0,
    }

    expect(shouldPersistNodeChanges([selectChange, positionChange])).toBe(false)
    expect(shouldPersistNodeChanges([positionChange, addChange])).toBe(true)
  })

  it('persists only structural edge changes', () => {
    const selectChange: EdgeChange<WorkspaceEdge> = { id: 'e1', type: 'select', selected: true }
    const replaceChange: EdgeChange<WorkspaceEdge> = {
      id: 'e1',
      type: 'replace',
      item: createEdge({ id: 'e1', source: 'a', target: 'b' }),
    }

    expect(shouldPersistEdgeChanges([selectChange])).toBe(false)
    expect(shouldPersistEdgeChanges([selectChange, replaceChange])).toBe(true)
  })

  it('derives edge focus roles for source and target nodes', () => {
    const edge = createEdge({ id: 'e1', source: 'source-node', target: 'target-node' })

    expect(getEdgeFocusRole('source-node', edge)).toBe('source')
    expect(getEdgeFocusRole('target-node', edge)).toBe('target')
    expect(getEdgeFocusRole('other-node', edge)).toBeUndefined()
  })

  it('hides edges connected to hidden collapsed-group members', () => {
    const snapshot = createSnapshot(
      [
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
          position: { x: 320, y: 0 },
          data: {
            title: 'Member',
            groupId: 'group-1',
            groupLabel: 'Group 1',
            groupLeadId: 'lead-1',
            groupCollapsed: true,
          },
        }),
        createNode({ id: 'outside-1', data: { title: 'Outside' } }),
      ],
      [createEdge({ id: 'edge-1', source: 'member-1', target: 'outside-1' })],
    )

    const result = buildCanvasStageState(snapshot)
    const hiddenMember = result.nodes.find((node) => node.id === 'member-1')
    const edge = result.edges.find((item) => item.id === 'edge-1')

    expect(hiddenMember?.hidden).toBe(true)
    expect(edge?.hidden).toBe(true)
  })

  it('applies focus metadata to rendered nodes', () => {
    const snapshot = createSnapshot([
      createNode({ id: 'source-1', data: { title: 'Source' } }),
      createNode({ id: 'target-1', data: { title: 'Target' } }),
    ])
    const focusedEdge = createEdge({ id: 'edge-1', source: 'source-1', target: 'target-1' })

    const result = buildCanvasStageState(snapshot, focusedEdge)

    expect(result.nodes.find((node) => node.id === 'source-1')?.data.edgeFocusRole).toBe('source')
    expect(result.nodes.find((node) => node.id === 'target-1')?.data.edgeFocusRole).toBe('target')
  })
})
