import { describe, expect, it } from 'vitest'
import { createEdge, createNode, createSnapshot } from '../../workspace/services/workspace-test-utils'
import { buildAnalysisRequestPayload } from './analysis-payload'

describe('buildAnalysisRequestPayload', () => {
  it('keeps only selected visible nodes and internal edges for selection analysis', () => {
    const snapshot = createSnapshot(
      [
        createNode({ id: 'note-1', data: { title: '品牌笔记', body: '需要更清爽的视觉方向。' } }),
        createNode({ id: 'web-1', type: 'web', data: { title: '参考网页', url: 'https://example.com' } }),
        createNode({ id: 'hidden-1', hidden: true, data: { title: '隐藏节点' } }),
        createNode({ id: 'outside-1', data: { title: '范围外节点' } }),
      ],
      [
        createEdge({ id: 'edge-1', source: 'note-1', target: 'web-1', label: '参考' }),
        createEdge({ id: 'edge-2', source: 'note-1', target: 'outside-1', label: '忽略' }),
      ],
    )

    const payload = buildAnalysisRequestPayload({
      snapshot,
      selectedNodeIds: ['note-1', 'web-1', 'hidden-1'],
      scope: 'selection',
      question: '  适合什么方向？  ',
    })

    expect(payload.sourceNodeIds).toEqual(['note-1', 'web-1'])
    expect(payload.nodes.map((node) => node.id)).toEqual(['note-1', 'web-1'])
    expect(payload.edges).toEqual([{ source: 'note-1', target: 'web-1', label: '参考' }])
    expect(payload.question).toBe('适合什么方向？')
  })
})
