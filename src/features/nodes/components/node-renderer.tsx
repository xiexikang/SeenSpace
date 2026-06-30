import type { NodeTypes } from '@xyflow/react'
import { ImageNodeCard } from './image-node-card'
import { NoteNodeCard } from './note-node-card'
import { TagMetaNodeCard } from './tag-meta-node-card'
import { WebClipNodeCard } from './web-clip-node-card'
import { AiInsightNodeCard } from './ai-insight-node-card'

export const nodeTypes: NodeTypes = {
  note: NoteNodeCard,
  web: WebClipNodeCard,
  image: ImageNodeCard,
  tag_meta: TagMetaNodeCard,
  ai_insight: AiInsightNodeCard,
}
