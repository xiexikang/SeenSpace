import Dexie, { type Table } from 'dexie'
import type { ProjectRecord } from '../types/project'

export class SeenSpaceDatabase extends Dexie {
  projects!: Table<ProjectRecord, string>

  constructor() {
    super('SeenSpaceDB')
    this.version(1).stores({
      projects: 'id, name, updatedAt, createdAt',
    })
  }
}

export const db = new SeenSpaceDatabase()
