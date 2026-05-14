import { describe, expect, it } from 'vitest'
import type { WorkspaceSnapshot } from '../../../types/workspace'
import { emptySnapshot, sanitizeSnapshot } from './workspace-snapshot'

describe('workspace snapshot helpers', () => {
  it('provides an empty workspace snapshot shape', () => {
    expect(emptySnapshot).toEqual({
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    })
  })

  it('removes runtime selection and canvas-only node metadata', () => {
    const snapshot: WorkspaceSnapshot = {
      nodes: [
        {
          id: 'node-1',
          type: 'note',
          position: { x: 10, y: 20 },
          selected: true,
          hidden: true,
          data: {
            title: 'Draft',
            description: 'Temporary state',
            meta: 'Note',
            body: 'Body',
            edgeFocusRole: 'source',
            collapsedGroupSummary: {
              memberCount: 2,
              typeLabels: ['Note'],
              typeCounts: [{ type: 'note', count: 2 }],
              previewItems: [{ id: 'node-1', title: 'Draft', typeLabel: 'Note' }],
            },
          },
        },
      ],
      edges: [
        {
          id: 'edge-1',
          source: 'node-1',
          target: 'node-2',
          selected: true,
        },
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    }

    expect(sanitizeSnapshot(snapshot)).toEqual({
      nodes: [
        {
          id: 'node-1',
          type: 'note',
          position: { x: 10, y: 20 },
          selected: false,
          hidden: false,
          data: {
            title: 'Draft',
            description: 'Temporary state',
            meta: 'Note',
            body: 'Body',
            edgeFocusRole: undefined,
            collapsedGroupSummary: undefined,
          },
        },
      ],
      edges: [
        {
          id: 'edge-1',
          source: 'node-1',
          target: 'node-2',
          selected: false,
        },
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    })
  })
})
