export type ProjectViewMode = 'grid' | 'list'

export type ProjectRecord = {
  id: string
  name: string
  summary: string
  updatedAt: string
  createdAt: string
  nodeCount: number
  initials: string
  thumbnailVariant: 'sand' | 'steel' | 'mist' | 'mint'
}
