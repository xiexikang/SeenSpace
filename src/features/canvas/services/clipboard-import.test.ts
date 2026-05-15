import { describe, expect, it, vi } from 'vitest'
import { createNode } from '../../workspace/services/workspace-test-utils'
import {
  applyClipboardPayloadToNode,
  createNodeFromClipboardPayload,
  getPasteConflictTarget,
  parseClipboardImport,
} from './clipboard-import'

function createClipboardData({
  text = '',
  files = [],
}: {
  text?: string
  files?: File[]
}) {
  return {
    files,
    items: files.map((file) => ({
      kind: 'file',
      type: file.type,
      getAsFile: () => file,
    })),
    getData: vi.fn((type: string) => (type === 'text/plain' ? text : '')),
  } as unknown as DataTransfer
}

describe('clipboard-import', () => {
  it('treats image files as the highest-priority clipboard payload', async () => {
    const file = new File(['image-bytes'], 'paste.png', { type: 'image/png' })

    const payload = await parseClipboardImport(
      createClipboardData({
        text: 'https://example.com',
        files: [file],
      }),
    )

    expect(payload).toMatchObject({
      kind: 'image',
      fileName: 'paste.png',
      mimeType: 'image/png',
    })
    expect(payload?.kind === 'image' ? payload.dataUrl : '').toMatch(/^data:image\/png;base64,/)
  })

  it('recognizes pasted URLs as link payloads', async () => {
    const payload = await parseClipboardImport(
      createClipboardData({ text: '  https://www.example.com/path  ' }),
    )

    expect(payload).toEqual({
      kind: 'link',
      url: 'https://www.example.com/path',
      domain: 'example.com',
    })
  })

  it('recognizes non-URL text as text payloads', async () => {
    const payload = await parseClipboardImport(
      createClipboardData({ text: 'A pasted thought\nwith spacing.' }),
    )

    expect(payload).toEqual({
      kind: 'text',
      text: 'A pasted thought with spacing.',
    })
  })

  it('returns null when the clipboard has no supported content', async () => {
    await expect(parseClipboardImport(createClipboardData({ text: '   ' }))).resolves.toBeNull()
  })

  it('only returns a paste conflict target for a single selected node of the matching type', () => {
    const webNode = createNode({ id: 'web-1', type: 'web' })
    const imageNode = createNode({ id: 'image-1', type: 'image' })
    const noteNode = createNode({ id: 'note-1', type: 'note' })

    expect(
      getPasteConflictTarget({
        selectedNodeIds: ['web-1'],
        nodes: [webNode, imageNode, noteNode],
        payload: { kind: 'link', url: 'https://example.com', domain: 'example.com' },
      })?.id,
    ).toBe('web-1')

    expect(
      getPasteConflictTarget({
        selectedNodeIds: ['note-1'],
        nodes: [webNode, imageNode, noteNode],
        payload: { kind: 'link', url: 'https://example.com', domain: 'example.com' },
      }),
    ).toBeNull()

    expect(
      getPasteConflictTarget({
        selectedNodeIds: ['web-1', 'note-1'],
        nodes: [webNode, imageNode, noteNode],
        payload: { kind: 'link', url: 'https://example.com', domain: 'example.com' },
      }),
    ).toBeNull()
  })

  it('creates and updates nodes from clipboard payloads', () => {
    const linkNode = createNodeFromClipboardPayload(
      { kind: 'link', url: 'https://example.com', domain: 'example.com' },
      { x: 10, y: 20 },
    )
    expect(linkNode).toMatchObject({
      type: 'web',
      position: { x: 10, y: 20 },
      data: { url: 'https://example.com', domain: 'example.com' },
    })

    const noteNode = createNode({ id: 'note-1', type: 'note', data: { title: 'Keep title', body: 'Old' } })
    expect(
      applyClipboardPayloadToNode(noteNode, {
        kind: 'text',
        text: 'Replacement body',
      }),
    ).toMatchObject({
      id: 'note-1',
      type: 'note',
      data: {
        title: 'Keep title',
        body: 'Replacement body',
      },
    })
  })
})
