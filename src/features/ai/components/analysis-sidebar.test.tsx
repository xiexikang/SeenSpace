import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createNode, createSnapshot } from '../../workspace/services/workspace-test-utils'
import { AnalysisSidebar } from './analysis-sidebar'


const snapshot = createSnapshot([
  createNode({ id: 'node-1', data: { title: 'First node' } }),
  createNode({ id: 'node-2', data: { title: 'Second node' } }),
])

describe('AnalysisSidebar', () => {
  afterEach(() => {
    cleanup()
  })

  it('defaults to selected content when nodes are already selected', () => {
    render(
      <AnalysisSidebar
        snapshot={snapshot}
        selectedNodeIds={['node-1']}
        onInsertInsight={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: '选中内容' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('选中 1 个节点')).toBeTruthy()
  })

  it('switches between canvas and selection when selection availability changes', () => {
    const onInsertInsight = vi.fn()
    const { rerender } = render(
      <AnalysisSidebar
        snapshot={snapshot}
        selectedNodeIds={[]}
        onInsertInsight={onInsertInsight}
      />,
    )

    expect(screen.getByRole('button', { name: '整张画布' }).getAttribute('aria-pressed')).toBe('true')

    rerender(
      <AnalysisSidebar
        snapshot={snapshot}
        selectedNodeIds={['node-1']}
        onInsertInsight={onInsertInsight}
      />,
    )

    expect(screen.getByRole('button', { name: '选中内容' }).getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: '整张画布' }))
    rerender(
      <AnalysisSidebar
        snapshot={snapshot}
        selectedNodeIds={['node-1', 'node-2']}
        onInsertInsight={onInsertInsight}
      />,
    )

    expect(screen.getByRole('button', { name: '整张画布' }).getAttribute('aria-pressed')).toBe('true')

    rerender(
      <AnalysisSidebar
        snapshot={snapshot}
        selectedNodeIds={[]}
        onInsertInsight={onInsertInsight}
      />,
    )

    expect(screen.getByRole('button', { name: '整张画布' }).getAttribute('aria-pressed')).toBe('true')
  })
})
