import { afterEach, describe, expect, it, vi } from 'vitest'
import { createNode } from '../../workspace/services/workspace-test-utils'
import {
  applyClipboardPayloadToNode,
  createNodeFromClipboardPayload,
  getPasteConflictTarget,
  parseClipboardImport,
  resolveClipboardLinkMetadata,
} from './clipboard-import'

function createClipboardData({
  text = '',
  html = '',
  uriList = '',
  files = [],
}: {
  text?: string
  html?: string
  uriList?: string
  files?: File[]
}) {
  return {
    files,
    items: files.map((file) => ({
      kind: 'file',
      type: file.type,
      getAsFile: () => file,
    })),
    getData: vi.fn((type: string) => {
      if (type === 'text/plain') return text
      if (type === 'text/html') return html
      if (type === 'text/uri-list') return uriList
      return ''
    }),
  } as unknown as DataTransfer
}

describe('clipboard-import', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

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

  it('uses a copied link title when the clipboard provides one', async () => {
    const payload = await parseClipboardImport(
      createClipboardData({
        text: 'Project Atlas',
        uriList: 'https://example.com/atlas',
        html: `
          <meta property="og:description" content="A shared workspace for the Atlas project.">
          <a href="https://example.com/atlas">Project Atlas</a>
        `,
      }),
    )

    expect(payload).toEqual({
      kind: 'link',
      url: 'https://example.com/atlas',
      domain: 'example.com',
      title: 'Project Atlas',
      description: 'A shared workspace for the Atlas project.',
    })
  })

  it('resolves title and description through the metadata API when the clipboard has none', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        title: 'Project Atlas',
        description: 'A workspace for research and planning.',
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const payload = await resolveClipboardLinkMetadata({
      kind: 'link',
      url: 'https://example.com/atlas',
      domain: 'example.com',
    })

    expect(payload).toEqual({
      kind: 'link',
      url: 'https://example.com/atlas',
      domain: 'example.com',
      title: 'Project Atlas',
      description: 'A workspace for research and planning.',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/web/metadata',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com/atlas' }),
      }),
    )
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
      data: { title: 'example.com', url: 'https://example.com', domain: 'example.com' },
    })

    const titledLinkNode = createNodeFromClipboardPayload(
      {
        kind: 'link',
        url: 'https://example.com/atlas',
        domain: 'example.com',
        title: 'Project Atlas',
        description: 'A workspace for research and planning.',
      },
      { x: 10, y: 20 },
    )
    expect(titledLinkNode.data).toMatchObject({
      title: 'Project Atlas',
      description: 'A workspace for research and planning.',
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

    const webNode = createNode({
      id: 'web-1',
      type: 'web',
      data: { title: 'Old title', url: 'https://old.example' },
    })
    expect(
      applyClipboardPayloadToNode(webNode, {
        kind: 'link',
        url: 'https://example.com/atlas',
        domain: 'example.com',
        title: 'Project Atlas',
        description: 'A workspace for research and planning.',
      }).data.title,
    ).toBe('Project Atlas')
    expect(
      applyClipboardPayloadToNode(webNode, {
        kind: 'link',
        url: 'https://example.com/atlas',
        domain: 'example.com',
        title: 'Project Atlas',
        description: 'A workspace for research and planning.',
      }).data.description,
    ).toBe('A workspace for research and planning.')
  })
})
