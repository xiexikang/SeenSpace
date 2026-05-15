import type {
  ImageNode,
  NoteNode,
  WebNode,
  WorkspaceNode,
  WorkspaceNodeType,
} from '../../../types/workspace'
import { randomId } from '../../../shared/utils/random-id'

export type ClipboardImportPayload =
  | {
      kind: 'image'
      dataUrl: string
      fileName?: string
      mimeType?: string
    }
  | {
      kind: 'link'
      url: string
      domain: string
    }
  | {
      kind: 'text'
      text: string
    }

const urlPattern = /^https?:\/\/[^\s]+$/i

function trimText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function getDomain(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./i, '')
  } catch {
    return 'website'
  }
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function getClipboardImageFile(clipboardData: DataTransfer) {
  const items = Array.from(clipboardData.items ?? [])
  const imageItem = items.find((item) => item.kind === 'file' && item.type.startsWith('image/'))
  const itemFile = imageItem?.getAsFile()
  if (itemFile) return itemFile

  return Array.from(clipboardData.files ?? []).find((file) => file.type.startsWith('image/')) ?? null
}

export async function parseClipboardImport(clipboardData: DataTransfer): Promise<ClipboardImportPayload | null> {
  const imageFile = getClipboardImageFile(clipboardData)
  if (imageFile) {
    return {
      kind: 'image',
      dataUrl: await readFileAsDataUrl(imageFile),
      fileName: imageFile.name || undefined,
      mimeType: imageFile.type || undefined,
    }
  }

  const text = trimText(clipboardData.getData('text/plain') ?? '')
  if (!text) return null

  if (urlPattern.test(text)) {
    return {
      kind: 'link',
      url: text,
      domain: getDomain(text),
    }
  }

  return {
    kind: 'text',
    text,
  }
}

export function getNodeTypeForClipboardPayload(payload: ClipboardImportPayload): WorkspaceNodeType {
  if (payload.kind === 'link') return 'web'
  if (payload.kind === 'image') return 'image'
  return 'note'
}

export function getPasteConflictTarget({
  selectedNodeIds,
  nodes,
  payload,
}: {
  selectedNodeIds: string[]
  nodes: WorkspaceNode[]
  payload: ClipboardImportPayload
}) {
  if (selectedNodeIds.length !== 1) return null

  const selectedNode = nodes.find((node) => node.id === selectedNodeIds[0])
  if (!selectedNode) return null

  return selectedNode.type === getNodeTypeForClipboardPayload(payload) ? selectedNode : null
}

function describeText(text: string) {
  const trimmed = text.trim()
  if (trimmed.length <= 72) return trimmed
  return `${trimmed.slice(0, 69).trim()}...`
}

export function createNodeFromClipboardPayload(
  payload: ClipboardImportPayload,
  position: { x: number; y: number },
): WorkspaceNode {
  if (payload.kind === 'link') {
    return {
      id: randomId(),
      type: 'web',
      position,
      data: {
        title: payload.domain,
        description: '从剪贴板粘贴。',
        meta: '网页',
        url: payload.url,
        domain: payload.domain,
      },
    } satisfies WebNode
  }

  if (payload.kind === 'image') {
    return {
      id: randomId(),
      type: 'image',
      position,
      data: {
        title: payload.fileName || '粘贴的图片',
        description: '从剪贴板粘贴。',
        meta: '图片',
        imageUrl: payload.dataUrl,
        palette: payload.mimeType,
      },
    } satisfies ImageNode
  }

  return {
    id: randomId(),
    type: 'note',
    position,
    data: {
      title: '粘贴的文本',
      description: describeText(payload.text),
      meta: '笔记',
      body: payload.text,
    },
  } satisfies NoteNode
}

export function applyClipboardPayloadToNode(
  node: WorkspaceNode,
  payload: ClipboardImportPayload,
): WorkspaceNode {
  if (node.type === 'web' && payload.kind === 'link') {
    return {
      ...node,
      data: {
        ...node.data,
        meta: '网页',
        url: payload.url,
        domain: payload.domain,
      },
    }
  }

  if (node.type === 'image' && payload.kind === 'image') {
    return {
      ...node,
      data: {
        ...node.data,
        meta: '图片',
        imageUrl: payload.dataUrl,
        palette: payload.mimeType ?? node.data.palette,
      },
    }
  }

  if (node.type === 'note' && payload.kind === 'text') {
    return {
      ...node,
      data: {
        ...node.data,
        description: describeText(payload.text),
        body: payload.text,
      },
    }
  }

  return node
}
