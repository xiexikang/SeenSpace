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
      title: '空白笔记',
      description: '一条值得留在画布旁的快速想法。',
      meta: '笔记',
      body: '在画布上记录一个想法、提示词或观察。',
    },
  }
}

function createWebNode(index: number): WebNode {
  return {
    id: id(),
    type: 'web',
    position: positionFor(index),
    data: {
      title: '架构参考',
      description: '收集关于布局克制、层级与留白的想法。',
      meta: '网页',
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
      title: '光影研究',
      description: '一个可用于上传图片和视觉标注的占位图片节点。',
      meta: '图片',
      imageUrl: '',
      palette: '雾色、石灰、银色',
    },
  }
}

function createTagMetaNode(index: number): TagMetaNode {
  return {
    id: id(),
    type: 'tag_meta',
    position: positionFor(index),
    data: {
      title: '方向标签',
      description: '用这个节点聚合信号，并保持词汇一致。',
      meta: '标签集',
      category: '视觉语言',
      tags: ['克制', '编辑感', '柔和对比'],
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
