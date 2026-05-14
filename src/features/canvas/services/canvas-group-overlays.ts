import type { Node, Viewport } from '@xyflow/react'
import type { WorkspaceNode } from '../../../types/workspace'

const fallbackNodeSize = { width: 260, height: 180 }

export type CanvasGroupOverlay = {
  groupId: string
  label: string
  collapsed: boolean
  selected: boolean
  memberCount: number
  bounds: {
    left: number
    right: number
    top: number
    bottom: number
    centerX: number
    centerY: number
    width: number
    height: number
  }
}

export function getNodeRect(node: WorkspaceNode | Node) {
  const width = node.measured?.width ?? node.width ?? fallbackNodeSize.width
  const height = node.measured?.height ?? node.height ?? fallbackNodeSize.height

  return {
    left: node.position.x,
    right: node.position.x + width,
    top: node.position.y,
    bottom: node.position.y + height,
    centerX: node.position.x + width / 2,
    centerY: node.position.y + height / 2,
    width,
    height,
  }
}

export function getBoundsFromRects(rects: Array<ReturnType<typeof getNodeRect>>) {
  const left = Math.min(...rects.map((rect) => rect.left))
  const right = Math.max(...rects.map((rect) => rect.right))
  const top = Math.min(...rects.map((rect) => rect.top))
  const bottom = Math.max(...rects.map((rect) => rect.bottom))

  return {
    left,
    right,
    top,
    bottom,
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2,
    width: right - left,
    height: bottom - top,
  }
}

export function buildCanvasGroupOverlays(nodes: WorkspaceNode[], selectedNodeIds: string[]): CanvasGroupOverlay[] {
  const groups = new Map<
    string,
    {
      label: string
      collapsed: boolean
      leadId: string
      nodes: WorkspaceNode[]
    }
  >()

  nodes.forEach((node) => {
    if (!node.data.groupId || !node.data.groupLabel) return
    const existing = groups.get(node.data.groupId)
    if (existing) {
      existing.nodes.push(node)
      return
    }
    groups.set(node.data.groupId, {
      label: node.data.groupLabel,
      collapsed: Boolean(node.data.groupCollapsed),
      leadId: node.data.groupLeadId ?? node.id,
      nodes: [node],
    })
  })

  return Array.from(groups.entries()).map(([groupId, group]) => {
    const leadNode = group.nodes.find((node) => node.id === group.leadId) ?? group.nodes[0]
    const rects = (group.collapsed ? [leadNode] : group.nodes).map((node) => getNodeRect(node))

    return {
      groupId,
      label: group.label,
      collapsed: group.collapsed,
      selected: group.nodes.some((node) => selectedNodeIds.includes(node.id)),
      memberCount: group.nodes.length,
      bounds: getBoundsFromRects(rects),
    }
  })
}

export function getCanvasGroupOverlayStyle(
  bounds: CanvasGroupOverlay['bounds'],
  viewport: Viewport,
) {
  return {
    left: bounds.left * viewport.zoom + viewport.x - 12,
    top: bounds.top * viewport.zoom + viewport.y - 32,
    width: bounds.width * viewport.zoom + 24,
    height: bounds.height * viewport.zoom + 44,
  }
}
