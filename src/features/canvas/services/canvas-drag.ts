import { getBoundsFromRects, getNodeRect } from './canvas-group-overlays'
import { moveNodesByDelta } from '../../workspace/services/workspace-transforms'
import type { WorkspaceNode } from '../../../types/workspace'

const snapThreshold = 10
const gridSize = 18

export type GuideLine =
  | { kind: 'alignment-vertical'; x: number; y: number; length: number }
  | { kind: 'alignment-horizontal'; y: number; x: number; length: number }
  | {
      kind: 'spacing-horizontal'
      y: number
      segments: Array<{ x: number; length: number }>
    }
  | {
      kind: 'spacing-vertical'
      x: number
      segments: Array<{ y: number; length: number }>
    }

export function getViewportDragDelta(movementX: number, movementY: number, zoom: number) {
  const safeZoom = zoom || 1
  return {
    x: movementX / safeZoom,
    y: movementY / safeZoom,
  }
}

export function getDragGuides(
  currentNodes: WorkspaceNode[],
  draggedNodeIds: Set<string>,
  isGridSnapEnabled: boolean,
) {
  const draggedGroupNodes = currentNodes.filter((node) => draggedNodeIds.has(node.id))
  if (draggedGroupNodes.length === 0) {
    return { delta: { x: 0, y: 0 }, guides: [] as GuideLine[] }
  }

  const draggedGroupRects = draggedGroupNodes.map((node) => getNodeRect(node))
  const draggedRect = getBoundsFromRects(draggedGroupRects)
  const otherNodes = currentNodes.filter((node) => !draggedNodeIds.has(node.id) && !node.hidden)
  let bestX:
    | {
        delta: number
        guide: GuideLine
      }
    | undefined
  let bestY:
    | {
        delta: number
        guide: GuideLine
      }
    | undefined
  let spacingX:
    | {
        delta: number
        guide: GuideLine
      }
    | undefined
  let spacingY:
    | {
        delta: number
        guide: GuideLine
      }
    | undefined

  otherNodes.forEach((node) => {
    const otherRect = getNodeRect(node)
    const xPairs = [
      { source: draggedRect.left, target: otherRect.left },
      { source: draggedRect.centerX, target: otherRect.centerX },
      { source: draggedRect.right, target: otherRect.right },
    ]
    const yPairs = [
      { source: draggedRect.top, target: otherRect.top },
      { source: draggedRect.centerY, target: otherRect.centerY },
      { source: draggedRect.bottom, target: otherRect.bottom },
    ]

    xPairs.forEach(({ source, target }) => {
      const delta = target - source
      if (Math.abs(delta) > snapThreshold) return
      if (!bestX || Math.abs(delta) < Math.abs(bestX.delta)) {
        bestX = {
          delta,
          guide: {
            kind: 'alignment-vertical',
            x: target,
            y: Math.min(draggedRect.top, otherRect.top),
            length: Math.max(draggedRect.bottom, otherRect.bottom) - Math.min(draggedRect.top, otherRect.top),
          },
        }
      }
    })

    yPairs.forEach(({ source, target }) => {
      const delta = target - source
      if (Math.abs(delta) > snapThreshold) return
      if (!bestY || Math.abs(delta) < Math.abs(bestY.delta)) {
        bestY = {
          delta,
          guide: {
            kind: 'alignment-horizontal',
            y: target,
            x: Math.min(draggedRect.left, otherRect.left),
            length: Math.max(draggedRect.right, otherRect.right) - Math.min(draggedRect.left, otherRect.left),
          },
        }
      }
    })
  })

  otherNodes.forEach((leftNode) => {
    const leftRect = getNodeRect(leftNode)
    if (leftRect.right > draggedRect.left) return
    const sharedY = Math.max(leftRect.top, draggedRect.top) <= Math.min(leftRect.bottom, draggedRect.bottom)

    otherNodes.forEach((rightNode) => {
      if (rightNode.id === leftNode.id) return
      const rightRect = getNodeRect(rightNode)
      if (rightRect.left < draggedRect.right) return
      const overlapsDragged = Math.max(rightRect.top, draggedRect.top) <= Math.min(rightRect.bottom, draggedRect.bottom)
      const overlapsPair = Math.max(leftRect.top, rightRect.top) <= Math.min(leftRect.bottom, rightRect.bottom)
      if (!sharedY || !overlapsDragged || !overlapsPair) return

      const targetLeft = (leftRect.right + rightRect.left - draggedRect.width) / 2
      const delta = targetLeft - draggedRect.left
      if (Math.abs(delta) > snapThreshold) return

      if (!spacingX || Math.abs(delta) < Math.abs(spacingX.delta)) {
        const guideY =
          (Math.max(leftRect.top, draggedRect.top, rightRect.top) +
            Math.min(leftRect.bottom, draggedRect.bottom, rightRect.bottom)) /
          2
        spacingX = {
          delta,
          guide: {
            kind: 'spacing-horizontal',
            y: guideY,
            segments: [
              { x: leftRect.right, length: Math.max(targetLeft - leftRect.right, 0) },
              {
                x: targetLeft + draggedRect.width,
                length: Math.max(rightRect.left - (targetLeft + draggedRect.width), 0),
              },
            ],
          },
        }
      }
    })
  })

  otherNodes.forEach((topNode) => {
    const topRect = getNodeRect(topNode)
    if (topRect.bottom > draggedRect.top) return
    const sharedX = Math.max(topRect.left, draggedRect.left) <= Math.min(topRect.right, draggedRect.right)

    otherNodes.forEach((bottomNode) => {
      if (bottomNode.id === topNode.id) return
      const bottomRect = getNodeRect(bottomNode)
      if (bottomRect.top < draggedRect.bottom) return
      const overlapsDragged =
        Math.max(bottomRect.left, draggedRect.left) <= Math.min(bottomRect.right, draggedRect.right)
      const overlapsPair = Math.max(topRect.left, bottomRect.left) <= Math.min(topRect.right, bottomRect.right)
      if (!sharedX || !overlapsDragged || !overlapsPair) return

      const targetTop = (topRect.bottom + bottomRect.top - draggedRect.height) / 2
      const delta = targetTop - draggedRect.top
      if (Math.abs(delta) > snapThreshold) return

      if (!spacingY || Math.abs(delta) < Math.abs(spacingY.delta)) {
        const guideX =
          (Math.max(topRect.left, draggedRect.left, bottomRect.left) +
            Math.min(topRect.right, draggedRect.right, bottomRect.right)) /
          2
        spacingY = {
          delta,
          guide: {
            kind: 'spacing-vertical',
            x: guideX,
            segments: [
              { y: topRect.bottom, length: Math.max(targetTop - topRect.bottom, 0) },
              {
                y: targetTop + draggedRect.height,
                length: Math.max(bottomRect.top - (targetTop + draggedRect.height), 0),
              },
            ],
          },
        }
      }
    })
  })

  if (!bestX && !bestY && !isGridSnapEnabled && !spacingX && !spacingY) {
    return { delta: { x: 0, y: 0 }, guides: [] as GuideLine[] }
  }

  const xDelta = bestX?.delta ?? spacingX?.delta ?? 0
  const yDelta = bestY?.delta ?? spacingY?.delta ?? 0
  const nextPosition = {
    x:
      bestX || spacingX || !isGridSnapEnabled
        ? draggedRect.left + xDelta
        : Math.round((draggedRect.left + xDelta) / gridSize) * gridSize,
    y:
      bestY || spacingY || !isGridSnapEnabled
        ? draggedRect.top + yDelta
        : Math.round((draggedRect.top + yDelta) / gridSize) * gridSize,
  }

  return {
    delta: {
      x: nextPosition.x - draggedRect.left,
      y: nextPosition.y - draggedRect.top,
    },
    guides: [bestX?.guide, bestY?.guide, spacingX?.guide, spacingY?.guide].filter(Boolean) as GuideLine[],
  }
}

export function applyGroupDragMove(
  currentNodes: WorkspaceNode[],
  draggedNodeIds: string[],
  movementX: number,
  movementY: number,
  zoom: number,
  isGridSnapEnabled: boolean,
) {
  const delta = getViewportDragDelta(movementX, movementY, zoom)
  if (delta.x === 0 && delta.y === 0) {
    return { nodes: currentNodes, guides: [] as GuideLine[] }
  }

  const tentativeNodes = moveNodesByDelta(currentNodes, draggedNodeIds, delta.x, delta.y)
  const dragGuides = getDragGuides(tentativeNodes, new Set(draggedNodeIds), isGridSnapEnabled)

  return {
    nodes: moveNodesByDelta(tentativeNodes, draggedNodeIds, dragGuides.delta.x, dragGuides.delta.y),
    guides: dragGuides.guides,
  }
}
