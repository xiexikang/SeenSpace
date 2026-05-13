import type { WorkspaceNode, WorkspaceNodeType, WorkspaceSnapshot } from '../../../types/workspace'

const duplicateOffset = { x: 44, y: 44 }

const nodeTypeLabels: Record<WorkspaceNodeType, string> = {
  note: 'Note',
  image: 'Image',
  web: 'Web Clip',
  tag_meta: 'Tag / Meta',
}

export function getVisibleSelectedNodeIds(nodes: WorkspaceNode[], selectedNodeIds: string[]) {
  return nodes.filter((node) => !node.hidden && selectedNodeIds.includes(node.id)).map((node) => node.id)
}

export function duplicateSelectedNodes(nodes: WorkspaceNode[], selectedNodeIds: string[]) {
  const selectedSet = new Set(selectedNodeIds)
  const selectedNodes = nodes.filter((node) => selectedSet.has(node.id))

  if (selectedNodes.length === 0) {
    return { nodes, duplicatedIds: [] as string[], duplicatedVisibleIds: [] as string[] }
  }

  const groupIdMap = new Map<string, { id: string; label: string; leadSourceId?: string }>()
  const duplicateIdMap = new Map<string, string>()
  const duplicates = selectedNodes.map((node) => {
    let nextGroupId = node.data.groupId
    let nextGroupLabel = node.data.groupLabel

    if (node.data.groupId && node.data.groupLabel) {
      const existing = groupIdMap.get(node.data.groupId)
      if (existing) {
        nextGroupId = existing.id
        nextGroupLabel = existing.label
      } else {
        const created = {
          id: crypto.randomUUID(),
          label: `${node.data.groupLabel} Copy`,
          leadSourceId: node.data.groupLeadId,
        }
        groupIdMap.set(node.data.groupId, created)
        nextGroupId = created.id
        nextGroupLabel = created.label
      }
    }

    const duplicateId = crypto.randomUUID()
    duplicateIdMap.set(node.id, duplicateId)

    return {
      ...node,
      id: duplicateId,
      position: {
        x: node.position.x + duplicateOffset.x,
        y: node.position.y + duplicateOffset.y,
      },
      data: {
        ...node.data,
        title: node.data.title.endsWith(' Copy') ? node.data.title : `${node.data.title} Copy`,
        groupId: nextGroupId,
        groupLabel: nextGroupLabel,
        groupLeadId: node.data.groupLeadId,
        groupCollapsed: node.data.groupId ? false : node.data.groupCollapsed,
      },
      selected: false,
    }
  })

  const normalizedDuplicates = duplicates.map((node) => {
    if (!node.data.groupId || !node.data.groupLeadId) {
      return node
    }

    const duplicatedLeadId = duplicateIdMap.get(node.data.groupLeadId) ?? node.id
    return {
      ...node,
      data: {
        ...node.data,
        groupLeadId: duplicatedLeadId,
      },
    }
  })

  const duplicatedVisibleIds = normalizedDuplicates
    .filter((node) => !node.data.groupCollapsed || node.id === node.data.groupLeadId)
    .map((node) => node.id)

  return {
    nodes: [...nodes, ...normalizedDuplicates],
    duplicatedIds: normalizedDuplicates.map((node) => node.id),
    duplicatedVisibleIds,
  }
}

export function deleteNodesFromSnapshot(snapshot: WorkspaceSnapshot, nodeIds: string[]) {
  if (nodeIds.length === 0) return snapshot

  const idSet = new Set(nodeIds)
  return {
    ...snapshot,
    nodes: snapshot.nodes.filter((node) => !idSet.has(node.id)),
    edges: snapshot.edges.filter((edge) => !idSet.has(edge.source) && !idSet.has(edge.target)),
  }
}

export function ungroupSelectedNodes(snapshot: WorkspaceSnapshot, selectedNodeIds: string[]) {
  if (selectedNodeIds.length === 0) return snapshot

  const selectedGroups = new Set(
    snapshot.nodes
      .filter((node) => selectedNodeIds.includes(node.id))
      .map((node) => node.data.groupId)
      .filter((groupId): groupId is string => Boolean(groupId)),
  )

  if (selectedGroups.size === 0) return snapshot

  return {
    ...snapshot,
    nodes: snapshot.nodes.map((node) =>
      selectedGroups.has(node.data.groupId ?? '')
        ? {
            ...node,
            data: {
              ...node.data,
              groupId: undefined,
              groupLabel: undefined,
              groupLeadId: undefined,
              groupCollapsed: undefined,
            },
          }
        : node,
    ),
  }
}

export function toggleGroupCollapse(snapshot: WorkspaceSnapshot, groupId: string) {
  const memberIds = snapshot.nodes.filter((node) => node.data.groupId === groupId).map((node) => node.id)
  if (memberIds.length === 0) {
    return { snapshot, memberIds, collapsed: undefined as boolean | undefined }
  }

  const currentGroup = snapshot.nodes.find((node) => node.data.groupId === groupId)
  const collapsed = !currentGroup?.data.groupCollapsed
  const memberIdSet = new Set(memberIds)

  return {
    memberIds,
    collapsed,
    snapshot: {
      ...snapshot,
      nodes: snapshot.nodes.map((node) =>
        memberIdSet.has(node.id)
          ? {
              ...node,
              data: {
                ...node.data,
                groupCollapsed: collapsed,
              },
            }
          : node,
      ),
    },
  }
}

export function buildRenderableNodes(snapshotNodes: WorkspaceNode[], selectedNodeIds: string[]) {
  const groupStateById = new Map<
    string,
    {
      leadId: string
      collapsed: boolean
    }
  >()
  const groupSummaryById = new Map<
    string,
    {
      memberCount: number
      typeLabels: string[]
      typeCounts: Array<{ type: WorkspaceNodeType; count: number }>
      previewItems: Array<{
        id: string
        title: string
        typeLabel: string
        subtitle?: string
      }>
    }
  >()

  snapshotNodes.forEach((node) => {
    if (!node.data.groupId) return
    if (!groupStateById.has(node.data.groupId)) {
      groupStateById.set(node.data.groupId, {
        leadId: node.data.groupLeadId ?? node.id,
        collapsed: Boolean(node.data.groupCollapsed),
      })
    }
  })

  groupStateById.forEach((_state, groupId) => {
    const groupNodes = snapshotNodes.filter((node) => node.data.groupId === groupId)
    const typeCountMap = new Map<WorkspaceNodeType, number>()
    groupNodes.forEach((node) => {
      typeCountMap.set(node.type, (typeCountMap.get(node.type) ?? 0) + 1)
    })
    groupSummaryById.set(groupId, {
      memberCount: groupNodes.length,
      typeLabels: Array.from(new Set(groupNodes.map((node) => nodeTypeLabels[node.type]))),
      typeCounts: Array.from(typeCountMap.entries()).map(([type, count]) => ({ type, count })),
      previewItems: groupNodes
        .filter((node) => node.id !== (groupStateById.get(groupId)?.leadId ?? ''))
        .map((node) => ({
          id: node.id,
          title: node.data.title,
          typeLabel: nodeTypeLabels[node.type],
          subtitle:
            node.data.description ??
            ('body' in node.data
              ? node.data.body
              : 'domain' in node.data
                ? node.data.domain ?? node.data.url
                : 'category' in node.data
                  ? node.data.category
                  : undefined),
        }))
        .filter((item) => Boolean(item.title))
        .slice(0, 3),
    })
  })

  const hiddenNodeIds = new Set(
    snapshotNodes
      .filter(
        (node) =>
          node.data.groupId &&
          groupStateById.get(node.data.groupId)?.collapsed &&
          node.id !== groupStateById.get(node.data.groupId)?.leadId,
      )
      .map((node) => node.id),
  )

  return {
    nodes: snapshotNodes.map((node) => {
      const hidden = hiddenNodeIds.has(node.id)
      return {
        ...node,
        data: {
          ...node.data,
          collapsedGroupSummary:
            node.data.groupId &&
            groupStateById.get(node.data.groupId)?.collapsed &&
            node.id === groupStateById.get(node.data.groupId)?.leadId
              ? groupSummaryById.get(node.data.groupId)
              : undefined,
        },
        selected: !hidden && selectedNodeIds.includes(node.id),
        hidden,
      }
    }),
    hiddenNodeIds,
  }
}
