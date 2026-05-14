import { describe, expect, it } from 'vitest'
import { createNode } from '../../workspace/services/workspace-test-utils'
import { applyGroupDragMove, getDragGuides, getViewportDragDelta } from './canvas-drag'

describe('canvas drag helpers', () => {
  it('converts pointer movement into canvas delta using zoom', () => {
    expect(getViewportDragDelta(24, -12, 2)).toEqual({ x: 12, y: -6 })
    expect(getViewportDragDelta(24, -12, 0)).toEqual({ x: 24, y: -12 })
  })

  it('returns no guides when no dragged nodes are present', () => {
    const result = getDragGuides([createNode({ id: 'a' })], new Set(['missing']), false)
    expect(result).toEqual({ delta: { x: 0, y: 0 }, guides: [] })
  })

  it('snaps dragged nodes into alignment with nearby nodes', () => {
    const result = getDragGuides(
      [
        createNode({ id: 'drag-1', position: { x: 95, y: 0 }, width: 100, height: 80 }),
        createNode({ id: 'other-1', position: { x: 100, y: 120 }, width: 100, height: 80 }),
      ],
      new Set(['drag-1']),
      false,
    )

    expect(result.delta).toEqual({ x: 5, y: 0 })
    expect(result.guides.some((guide) => guide.kind === 'alignment-vertical')).toBe(true)
  })

  it('applies drag movement and follow-up snap adjustment to selected nodes', () => {
    const currentNodes = [
      createNode({ id: 'drag-1', position: { x: 10, y: 0 }, width: 100, height: 80 }),
      createNode({ id: 'other-1', position: { x: 100, y: 120 }, width: 100, height: 80 }),
    ]

    const result = applyGroupDragMove(currentNodes, ['drag-1'], 90, 0, 1, false)

    expect(result.nodes.find((node) => node.id === 'drag-1')?.position).toEqual({ x: 100, y: 0 })
    expect(result.guides.some((guide) => guide.kind === 'alignment-vertical')).toBe(true)
  })

  it('snaps to the grid when no nearby guides exist and grid snapping is enabled', () => {
    const currentNodes = [createNode({ id: 'drag-1', position: { x: 5, y: 7 }, width: 100, height: 80 })]

    const result = applyGroupDragMove(currentNodes, ['drag-1'], 0, 0, 1, true)

    expect(result).toEqual({ nodes: currentNodes, guides: [] })

    const moved = applyGroupDragMove(currentNodes, ['drag-1'], 10, 10, 1, true)
    expect(moved.nodes.find((node) => node.id === 'drag-1')?.position).toEqual({ x: 18, y: 18 })
  })
})
