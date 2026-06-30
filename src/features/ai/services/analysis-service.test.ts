import { afterEach, describe, expect, it, vi } from 'vitest'
import { createNode, createSnapshot } from '../../workspace/services/workspace-test-utils'
import { analyzeWorkspaceSnapshot } from './analysis-service'

describe('analyzeWorkspaceSnapshot', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns remote AI analysis when the proxy responds with a valid result', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        title: '远程洞察',
        summary: '模型生成的分析内容。',
        keywords: ['模型', '洞察'],
        scope: 'canvas',
        sourceNodeIds: ['node-1'],
      }),
    } as Response)

    const result = await analyzeWorkspaceSnapshot({
      snapshot: createSnapshot([createNode({ id: 'node-1', data: { title: 'Node 1' } })]),
      selectedNodeIds: [],
      scope: 'canvas',
      question: '',
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/ai/analyze', expect.any(Object))
    expect(result.title).toBe('远程洞察')
  })

  it('falls back to local heuristic analysis when the proxy fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))

    const result = await analyzeWorkspaceSnapshot({
      snapshot: createSnapshot([createNode({ id: 'node-1', data: { title: 'Node 1', body: '灵感 素材' } })]),
      selectedNodeIds: [],
      scope: 'canvas',
      question: '怎么整理？',
    })

    expect(result.title).toBe('画布整体洞察')
    expect(result.sourceNodeIds).toEqual(['node-1'])
    expect(result.question).toBe('怎么整理？')
  })
})
