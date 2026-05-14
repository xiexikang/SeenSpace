import type {
  ImageNode,
  TagMetaNode,
  WebNode,
  NoteNode,
  WorkspaceNode,
  WorkspaceNodeType,
} from '../../../types/workspace'
import { randomId } from '../../../shared/utils/random-id'

function id() {
  return randomId()
}

function positionFor(index: number) {
  return {
    x: 120 + (index % 3) * 280,
    y: 140 + Math.floor(index / 3) * 220,
  }
}

function createNoteNode(index: number): NoteNode {
  return {
    id: id(),
    type: 'note',
    position: positionFor(index),
    data: {
      title: 'Blank Note',
      description: 'A quick thought worth keeping close to the canvas.',
      meta: 'Note',
      body: 'Capture a thought, prompt, or observation directly on the canvas.',
    },
  }
}

function createWebNode(index: number): WebNode {
  return {
    id: id(),
    type: 'web',
    position: positionFor(index),
    data: {
      title: 'Architecture Reference',
      description: 'Collecting ideas on layout restraint, hierarchy, and negative space.',
      meta: 'Web Clip',
      url: 'https://example.com/reference',
      domain: 'example.com',
    },
  }
}

function createImageNode(index: number): ImageNode {
  return {
    id: id(),
    type: 'image',
    position: positionFor(index),
    data: {
      title: 'Lighting Study',
      description: 'A placeholder image node ready for upload and visual tagging.',
      meta: 'Image',
      imageUrl: '',
      palette: 'fog, stone, silver',
    },
  }
}

function createTagMetaNode(index: number): TagMetaNode {
  return {
    id: id(),
    type: 'tag_meta',
    position: positionFor(index),
    data: {
      title: 'Direction Tags',
      description: 'Use this node to cluster signals and keep vocabulary consistent.',
      meta: 'Tag Set',
      category: 'Visual Language',
      tags: ['restraint', 'editorial', 'soft contrast'],
    },
  }
}

export function createWorkspaceNode(type: WorkspaceNodeType, index: number): WorkspaceNode {
  switch (type) {
    case 'web':
      return createWebNode(index)
    case 'image':
      return createImageNode(index)
    case 'tag_meta':
      return createTagMetaNode(index)
    case 'note':
    default:
      return createNoteNode(index)
  }
}
