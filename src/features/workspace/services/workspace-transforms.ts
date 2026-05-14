import type { TagMetaNodeData, WorkspaceNode } from '../../../types/workspace'

const fallbackNodeSize = { width: 260, height: 180 }

export type LayoutActionId =
  | 'align-left'
  | 'align-center-x'
  | 'align-right'
  | 'align-top'
  | 'align-center-y'
  | 'align-bottom'
  | 'distribute-x'
  | 'distribute-y'

export function parseTags(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function updateSelectedNodesLayout(
  nodes: WorkspaceNode[],
  selectedNodeIds: string[],
  action: LayoutActionId,
) {
  const selectedSet = new Set(selectedNodeIds)
  const selectedNodes = nodes.filter((node) => selectedSet.has(node.id))

  if (selectedNodes.length < 2) {
    return nodes
  }

  const updates = new Map<string, WorkspaceNode['position']>()
  const bounds = selectedNodes.map((node) => {
    const width = node.measured?.width ?? node.width ?? fallbackNodeSize.width
    const height = node.measured?.height ?? node.height ?? fallbackNodeSize.height

    return {
      node,
      left: node.position.x,
      right: node.position.x + width,
      top: node.position.y,
      bottom: node.position.y + height,
      width,
      height,
    }
  })

  const left = Math.min(...bounds.map((bound) => bound.left))
  const right = Math.max(...bounds.map((bound) => bound.right))
  const centerX = (left + right) / 2
  const top = Math.min(...bounds.map((bound) => bound.top))
  const bottom = Math.max(...bounds.map((bound) => bound.bottom))
  const centerY = (top + bottom) / 2

  if (action === 'align-left') {
    selectedNodes.forEach((node) => updates.set(node.id, { ...node.position, x: left }))
  }

  if (action === 'align-center-x') {
    bounds.forEach((bound) =>
      updates.set(bound.node.id, { ...bound.node.position, x: centerX - bound.width / 2 }),
    )
  }

  if (action === 'align-right') {
    bounds.forEach((bound) =>
      updates.set(bound.node.id, { ...bound.node.position, x: right - bound.width }),
    )
  }

  if (action === 'align-top') {
    selectedNodes.forEach((node) => updates.set(node.id, { ...node.position, y: top }))
  }

  if (action === 'align-center-y') {
    bounds.forEach((bound) =>
      updates.set(bound.node.id, { ...bound.node.position, y: centerY - bound.height / 2 }),
    )
  }

  if (action === 'align-bottom') {
    bounds.forEach((bound) =>
      updates.set(bound.node.id, { ...bound.node.position, y: bottom - bound.height }),
    )
  }

  if (action === 'distribute-x') {
    const sorted = [...bounds].sort((a, b) => a.left - b.left)
    const totalWidth = sorted.reduce((sum, bound) => sum + bound.width, 0)
    const gap = sorted.length > 1 ? Math.max((right - left - totalWidth) / (sorted.length - 1), 0) : 0
    let cursor = left
    sorted.forEach((bound) => {
      updates.set(bound.node.id, { ...bound.node.position, x: cursor })
      cursor += bound.width + gap
    })
  }

  if (action === 'distribute-y') {
    const sorted = [...bounds].sort((a, b) => a.top - b.top)
    const totalHeight = sorted.reduce((sum, bound) => sum + bound.height, 0)
    const gap = sorted.length > 1 ? Math.max((bottom - top - totalHeight) / (sorted.length - 1), 0) : 0
    let cursor = top
    sorted.forEach((bound) => {
      updates.set(bound.node.id, { ...bound.node.position, y: cursor })
      cursor += bound.height + gap
    })
  }

  return nodes.map((node) => {
    const nextPosition = updates.get(node.id)
    return nextPosition ? { ...node, position: nextPosition } : node
  })
}

export function applyBatchCategory(
  nodes: WorkspaceNode[],
  selectedNodeIds: string[],
  batchCategory: string,
) {
  if (selectedNodeIds.length < 2) {
    return nodes
  }

  const idSet = new Set(selectedNodeIds)
  const normalizedCategory = batchCategory.trim()

  return nodes.map((node) => {
    if (!idSet.has(node.id)) return node

    return {
      ...node,
      data: {
        ...node.data,
        ...(normalizedCategory ? { meta: normalizedCategory } : {}),
        ...(('category' in node.data || node.type === 'tag_meta')
          ? ({
              category: normalizedCategory || (node.data as TagMetaNodeData).category,
            } as Partial<TagMetaNodeData>)
          : {}),
      },
    }
  })
}

export function applyBatchTags(
  nodes: WorkspaceNode[],
  selectedNodeIds: string[],
  batchTagsText: string,
) {
  if (selectedNodeIds.length < 2) {
    return nodes
  }

  const idSet = new Set(selectedNodeIds)
  const tags = parseTags(batchTagsText)
  if (tags.length === 0) {
    return nodes
  }

  return nodes.map((node) => {
    if (!idSet.has(node.id)) return node

    const currentTags = 'tags' in node.data ? node.data.tags ?? [] : []
    const mergedTags = Array.from(new Set([...currentTags, ...tags]))

    return {
      ...node,
      data: {
        ...node.data,
        ...(tags.length > 0 ? { tags: mergedTags } : {}),
      },
    }
  })
}

export function applyBatchMetadata(
  nodes: WorkspaceNode[],
  selectedNodeIds: string[],
  batchCategory: string,
  batchTagsText: string,
) {
  return applyBatchTags(applyBatchCategory(nodes, selectedNodeIds, batchCategory), selectedNodeIds, batchTagsText)
}

export function moveNodesByDelta(
  nodes: WorkspaceNode[],
  selectedNodeIds: string[],
  xDelta: number,
  yDelta: number,
) {
  if (selectedNodeIds.length === 0 || (xDelta === 0 && yDelta === 0)) {
    return nodes
  }

  const selectedSet = new Set(selectedNodeIds)
  return nodes.map((node) =>
    selectedSet.has(node.id)
      ? {
          ...node,
          position: {
            x: node.position.x + xDelta,
            y: node.position.y + yDelta,
          },
        }
      : node,
  )
}

export function clearBatchMetadata(
  nodes: WorkspaceNode[],
  selectedNodeIds: string[],
  fields: Array<'category' | 'tags'>,
) {
  if (selectedNodeIds.length === 0 || fields.length === 0) {
    return nodes
  }

  const selectedSet = new Set(selectedNodeIds)
  return nodes.map((node) => {
    if (!selectedSet.has(node.id)) return node

    const nextData: WorkspaceNode['data'] = {
      ...node.data,
      ...(fields.includes('category') ? { meta: undefined } : {}),
      ...(fields.includes('tags') && 'tags' in node.data ? { tags: undefined } : {}),
      ...(fields.includes('category') && ('category' in node.data || node.type === 'tag_meta')
        ? { category: undefined }
        : {}),
    }

    return {
      ...node,
      data: nextData,
    }
  })
}
