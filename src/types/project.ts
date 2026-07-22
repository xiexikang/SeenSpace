import type { WorkspaceSnapshot } from './workspace'

export type ProjectViewMode = 'grid' | 'list'

export type ProjectRecord = {
  id: string
  name: string
  summary: string
  coverImage: string | null
  updatedAt: string
  createdAt: string
  nodeCount: number
  initials: string
  thumbnailVariant: 'sand' | 'steel' | 'mist' | 'mint'
  isFavorite: boolean
  canvas: WorkspaceSnapshot
}
