import { describe, expect, it } from 'vitest'
import { applyBatchMetadata, parseTags, updateSelectedNodesLayout } from './workspace-transforms'
import { createNode } from './workspace-test-utils'

describe('workspace transforms', () => {
  it('parses comma-separated tags and trims blanks', () => {
    expect(parseTags('alpha, beta , , gamma')).toEqual(['alpha', 'beta', 'gamma'])
  })

  it('aligns selected nodes on the same left edge', () => {
    const nodes = [
      createNode({ id: 'a', position: { x: 100, y: 0 } }),
      createNode({ id: 'b', position: { x: 240, y: 60 } }),
      createNode({ id: 'c', position: { x: 400, y: 20 } }),
    ]

    const nextNodes = updateSelectedNodesLayout(nodes, ['a', 'c'], 'align-left')

    expect(nextNodes.find((node) => node.id === 'a')?.position.x).toBe(100)
    expect(nextNodes.find((node) => node.id === 'c')?.position.x).toBe(100)
    expect(nextNodes.find((node) => node.id === 'b')?.position.x).toBe(240)
  })

  it('distributes selected nodes horizontally', () => {
    const nodes = [
      createNode({ id: 'a', position: { x: 0, y: 0 }, width: 100 }),
      createNode({ id: 'b', position: { x: 220, y: 0 }, width: 100 }),
      createNode({ id: 'c', position: { x: 500, y: 0 }, width: 100 }),
    ]

    const nextNodes = updateSelectedNodesLayout(nodes, ['a', 'b', 'c'], 'distribute-x')

    expect(nextNodes.map((node) => node.position.x)).toEqual([0, 250, 500])
  })

  it('applies batch metadata to selected nodes and preserves unique tags', () => {
    const nodes = [
      createNode({
        id: 'note-1',
        type: 'note',
        data: { title: 'Note 1' },
      }),
      createNode({
        id: 'tag-1',
        type: 'tag_meta',
        data: { title: 'Tag 1', category: 'old', tags: ['alpha'] },
      }),
      createNode({
        id: 'note-2',
        type: 'note',
        data: { title: 'Note 2', tags: ['beta'] } as never,
      }),
    ]

    const nextNodes = applyBatchMetadata(nodes, ['tag-1', 'note-2'], 'research', 'beta, gamma')

    expect(nextNodes.find((node) => node.id === 'note-1')?.data.meta).toBeUndefined()
    expect(nextNodes.find((node) => node.id === 'tag-1')?.data.meta).toBe('research')
    expect((nextNodes.find((node) => node.id === 'tag-1')?.data as { category?: string }).category).toBe(
      'research',
    )
    expect((nextNodes.find((node) => node.id === 'tag-1')?.data as { tags?: string[] }).tags).toEqual([
      'alpha',
      'beta',
      'gamma',
    ])
    expect((nextNodes.find((node) => node.id === 'note-2')?.data as { tags?: string[] }).tags).toEqual([
      'beta',
      'gamma',
    ])
  })
})
