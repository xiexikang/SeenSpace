import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { NodeProps } from '@xyflow/react'
import type { NoteNode } from '../../../types/workspace'
import { NoteNodeCard } from './note-node-card'

vi.mock('@xyflow/react', () => ({
  Handle: () => <div data-testid="connection-handle" />,
  NodeResizer: ({ isVisible, lineClassName }: { isVisible?: boolean; lineClassName?: string }) => (
    <div
      data-testid="node-resizer"
      data-visible={String(Boolean(isVisible))}
      data-line-class={lineClassName}
    />
  ),
  Position: { Left: 'left', Right: 'right' },
}))

function renderNote(overrides: Partial<NodeProps<NoteNode>> = {}) {
  const props = {
    id: 'note-1',
    type: 'note',
    data: { title: 'Resizable note' },
    selected: false,
    width: 280,
    height: 180,
    ...overrides,
  } as NodeProps<NoteNode>

  return render(<NoteNodeCard {...props} />)
}

describe('NodeFrame resize controls', () => {
  it('shows resize controls for the single externally selected node', () => {
    renderNote({
      data: { title: 'Resizable note', externallyResizable: true },
    })

    expect(screen.getByTestId('node-resizer').getAttribute('data-visible')).toBe('true')
    expect(screen.getByTestId('node-resizer').getAttribute('data-line-class')).toBe('workspace-node-resize-line')
  })

  it('uses the current React Flow dimensions for the node frame', () => {
    const { container } = renderNote({ width: 360, height: 240 })
    const frame = container.querySelector('.group\\/node') as HTMLElement | null

    expect(frame?.style.width).toBe('360px')
    expect(frame?.style.height).toBe('240px')
  })
})
