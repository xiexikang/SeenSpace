import type { WorkspaceNode, WorkspaceNodeType } from '../../../types/workspace'

function id() {
  return crypto.randomUUID()
}

export function createWorkspaceNode(type: WorkspaceNodeType, index: number): WorkspaceNode {
  const position = {
    x: 120 + (index % 3) * 280,
    y: 140 + Math.floor(index / 3) * 220,
  }

  if (type === 'web') {
    return {
      id: id(),
      type,
      position,
      data: {
        title: 'Architecture Reference',
        description: 'Collecting ideas on layout restraint, hierarchy, and negative space.',
        meta: 'Web Clip',
      },
    }
  }

  if (type === 'image') {
    return {
      id: id(),
      type,
      position,
      data: {
        title: 'Lighting Study',
        description: 'A placeholder image node ready for upload and visual tagging.',
        meta: 'Image',
      },
    }
  }

  return {
    id: id(),
    type,
    position,
    data: {
      title: 'Blank Note',
      description: 'Capture a thought, prompt, or observation directly on the canvas.',
      meta: 'Note',
    },
  }
}
