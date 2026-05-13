import type { NodeTypes } from '@xyflow/react'
import { ImageNodeCard } from './image-node-card'
import { NoteNodeCard } from './note-node-card'
import { TagMetaNodeCard } from './tag-meta-node-card'
import { WebClipNodeCard } from './web-clip-node-card'

export const nodeTypes: NodeTypes = {
  note: NoteNodeCard,
  web: WebClipNodeCard,
  image: ImageNodeCard,
  tag_meta: TagMetaNodeCard,
}
