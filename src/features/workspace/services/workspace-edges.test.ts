import { describe, expect, it } from 'vitest'
import { createConnectionEdge, suggestEdgeLabel } from './workspace-edges'
import { createNode } from './workspace-test-utils'

describe('workspace edges', () => {
  it('suggests references when linking into tag meta nodes', () => {
    const sourceNode = createNode({ id: 'note-1', type: 'note' })
    const targetNode = createNode({ id: 'meta-1', type: 'tag_meta' })

    expect(suggestEdgeLabel(sourceNode, targetNode)).toBe('引用')
  })

  it('suggests supports when tag meta nodes point outward', () => {
    const sourceNode = createNode({ id: 'meta-1', type: 'tag_meta' })
    const targetNode = createNode({ id: 'note-1', type: 'note' })

    expect(suggestEdgeLabel(sourceNode, targetNode)).toBe('支持')
  })

  it('suggests clusters with for same-type links', () => {
    const sourceNode = createNode({ id: 'note-1', type: 'note' })
    const targetNode = createNode({ id: 'note-2', type: 'note' })

    expect(suggestEdgeLabel(sourceNode, targetNode)).toBe('同组')
  })

  it('creates a new edge with a generated id and suggested label', () => {
    const nodes = [
      createNode({ id: 'web-1', type: 'web' }),
      createNode({ id: 'note-1', type: 'note' }),
    ]

    const edge = createConnectionEdge(
      {
        source: 'web-1',
        target: 'note-1',
        sourceHandle: null,
        targetHandle: null,
      },
      nodes,
    )

    expect(edge.id).toBeTruthy()
    expect(edge.source).toBe('web-1')
    expect(edge.target).toBe('note-1')
    expect(edge.label).toBe('引用')
    expect(edge.animated).toBe(false)
  })
})
