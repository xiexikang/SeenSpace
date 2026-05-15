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
    name: '品牌识别探索',
    summary: '桌面应用的情绪板与字体参考。',
    updatedAt: new Date('2026-05-12T14:20:00').toISOString(),
    createdAt: new Date('2026-05-10T10:00:00').toISOString(),
    nodeCount: 24,
    initials: 'UI SM',
    thumbnailVariant: 'sand',
    canvas: createEmptyCanvas(),
  },
  {
    id: 'app-ui-components',
    name: '应用 UI 组件',
    summary: '用于工作区体验的共享组件库。',
    updatedAt: new Date('2026-05-11T16:00:00').toISOString(),
    createdAt: new Date('2026-05-09T09:30:00').toISOString(),
    nodeCount: 12,
    initials: 'UI',
    thumbnailVariant: 'steel',
    canvas: createEmptyCanvas(),
  },
  {
    id: 'personal-knowledge',
    name: '个人知识笔记',
    summary: '值得稍后回看的文章、参考资料和零散想法。',
    updatedAt: new Date('2026-05-09T13:00:00').toISOString(),
    createdAt: new Date('2026-05-05T08:20:00').toISOString(),
    nodeCount: 3,
    initials: 'ME',
    thumbnailVariant: 'mist',
    canvas: createEmptyCanvas(),
  },
  {
    id: 'product-architecture',
    name: '产品架构',
    summary: '梳理系统、模块想法与交互行为。',
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
    name: '未命名项目',
    summary: '用于链接、图片、笔记和 AI 洞察的新画布。',
    updatedAt: timestamp,
    createdAt: timestamp,
    nodeCount: 0,
    initials: '新',
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
