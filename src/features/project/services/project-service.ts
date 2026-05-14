import { db } from '../../../db/client'
import { randomId } from '../../../shared/utils/random-id'
import type { ProjectRecord } from '../../../types/project'
import type { WorkspaceSnapshot } from '../../../types/workspace'

function createEmptyCanvas(): WorkspaceSnapshot {
  return {
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  }
}

const seededProjects: ProjectRecord[] = [
  {
    id: 'brand-identity',
    name: 'Brand Identity Exploration',
    summary: 'Moodboards and typographic references for the desktop application.',
    updatedAt: new Date('2026-05-12T14:20:00').toISOString(),
    createdAt: new Date('2026-05-10T10:00:00').toISOString(),
    nodeCount: 24,
    initials: 'UI SM',
    thumbnailVariant: 'sand',
    canvas: createEmptyCanvas(),
  },
  {
    id: 'app-ui-components',
    name: 'App UI Components',
    summary: 'Shared library of components for the workspace experience.',
    updatedAt: new Date('2026-05-11T16:00:00').toISOString(),
    createdAt: new Date('2026-05-09T09:30:00').toISOString(),
    nodeCount: 12,
    initials: 'UI',
    thumbnailVariant: 'steel',
    canvas: createEmptyCanvas(),
  },
  {
    id: 'personal-knowledge',
    name: 'Personal Knowledge Notes',
    summary: 'Articles, references, and random thoughts worth revisiting later.',
    updatedAt: new Date('2026-05-09T13:00:00').toISOString(),
    createdAt: new Date('2026-05-05T08:20:00').toISOString(),
    nodeCount: 3,
    initials: 'ME',
    thumbnailVariant: 'mist',
    canvas: createEmptyCanvas(),
  },
  {
    id: 'product-architecture',
    name: 'Product Architecture',
    summary: 'Mapping systems, module ideas, and interaction behaviors.',
    updatedAt: new Date('2026-05-04T11:00:00').toISOString(),
    createdAt: new Date('2026-04-28T15:45:00').toISOString(),
    nodeCount: 89,
    initials: 'UX AI',
    thumbnailVariant: 'mint',
    canvas: createEmptyCanvas(),
  },
]

function nowIso() {
  return new Date().toISOString()
}

function normalizeProject(project: ProjectRecord): ProjectRecord {
  return {
    ...project,
    canvas: project.canvas ?? createEmptyCanvas(),
  }
}

export async function ensureProjectSeed() {
  const count = await db.projects.count()
  if (count === 0) {
    await db.projects.bulkPut(seededProjects)
    return
  }

  const projects = await db.projects.toArray()
  await Promise.all(
    projects.map(async (project) => {
      if (!project.canvas) {
        await db.projects.update(project.id, { canvas: createEmptyCanvas() })
      }
    }),
  )
}

export async function listProjects() {
  const projects = await db.projects.orderBy('updatedAt').reverse().toArray()
  return projects.map(normalizeProject)
}

export async function getProjectById(id: string) {
  const project = await db.projects.get(id)
  return project ? normalizeProject(project) : undefined
}

export async function createProject() {
  const id = randomId()
  const timestamp = nowIso()
  const project: ProjectRecord = {
    id,
    name: 'Untitled Project',
    summary: 'A fresh canvas for links, images, notes, and AI insight.',
    updatedAt: timestamp,
    createdAt: timestamp,
    nodeCount: 0,
    initials: 'NEW',
    thumbnailVariant: 'mist',
    canvas: createEmptyCanvas(),
  }

  await db.projects.add(project)
  return project
}

export async function updateProjectCanvas(id: string, canvas: WorkspaceSnapshot) {
  await db.projects.update(id, {
    canvas,
    updatedAt: nowIso(),
    nodeCount: canvas.nodes.length,
  })
}
