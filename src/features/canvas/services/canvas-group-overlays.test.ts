import { describe, expect, it } from 'vitest'
import { createNode } from '../../workspace/services/workspace-test-utils'
import {
  buildCanvasGroupOverlays,
  getCanvasGroupOverlayStyle,
  getNodeRect,
} from './canvas-group-overlays'

describe('canvas group overlays', () => {
  it('uses fallback node size when measurements are missing', () => {
    const rect = getNodeRect(
      createNode({
        id: 'node-1',
        position: { x: 20, y: 30 },
      }),
    )

    expect(rect).toMatchObject({
      left: 20,
      top: 30,
      width: 260,
      height: 180,
      right: 280,
      bottom: 210,
    })
  })

  it('builds overlays from grouped nodes and marks selected groups', () => {
    const overlays = buildCanvasGroupOverlays(
      [
        createNode({
          id: 'lead-1',
          position: { x: 0, y: 0 },
          width: 100,
          height: 80,
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
          position: { x: 120, y: 40 },
          width: 120,
          height: 90,
          data: {
            title: 'Member',
            groupId: 'group-1',
            groupLabel: 'Group 1',
            groupLeadId: 'lead-1',
            groupCollapsed: false,
          },
        }),
      ],
      ['member-1'],
    )

    expect(overlays).toHaveLength(1)
    expect(overlays[0]).toMatchObject({
      groupId: 'group-1',
      label: 'Group 1',
      collapsed: false,
      selected: true,
      memberCount: 2,
      bounds: {
        left: 0,
        top: 0,
        right: 240,
        bottom: 130,
        width: 240,
        height: 130,
      },
    })
  })

  it('uses only the lead node bounds when the group is collapsed', () => {
    const overlays = buildCanvasGroupOverlays(
      [
        createNode({
          id: 'lead-1',
          position: { x: 40, y: 60 },
          width: 90,
          height: 70,
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
          position: { x: 300, y: 240 },
          width: 120,
          height: 110,
          data: {
            title: 'Member',
            groupId: 'group-1',
            groupLabel: 'Group 1',
            groupLeadId: 'lead-1',
            groupCollapsed: true,
          },
        }),
      ],
      [],
    )

    expect(overlays[0]?.bounds).toMatchObject({
      left: 40,
      top: 60,
      right: 130,
      bottom: 130,
      width: 90,
      height: 70,
    })
  })

  it('converts overlay bounds into viewport-aware screen positioning', () => {
    expect(
      getCanvasGroupOverlayStyle(
        {
          left: 100,
          right: 300,
          top: 200,
          bottom: 320,
          centerX: 200,
          centerY: 260,
          width: 200,
          height: 120,
        },
        { x: 10, y: -20, zoom: 1.5 },
      ),
    ).toEqual({
      left: 148,
      top: 248,
      width: 324,
      height: 224,
    })
  })
})
