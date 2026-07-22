import { apiDelete, apiGet, apiPatch, apiPost } from '../../../lib/api-client'
import type { ProjectRecord } from '../../../types/project'
import type { WorkspaceSnapshot } from '../../../types/workspace'

let healthRequest: Promise<unknown> | undefined
let projectsRequest: Promise<ProjectRecord[]> | undefined
let favoriteProjectsRequest: Promise<ProjectRecord[]> | undefined
const projectByIdRequests = new Map<string, Promise<ProjectRecord | undefined>>()

export type ProjectMetadataInput = {
  name: string
  summary: string
  coverImage: string | null
}

function dedupeRequest<T>(
  getCurrent: () => Promise<T> | undefined,
  setCurrent: (request: Promise<T> | undefined) => void,
  factory: () => Promise<T>,
) {
  const current = getCurrent()
  if (current) return current

  const request = factory().finally(() => setCurrent(undefined))
  setCurrent(request)
  return request
}

export async function ensureProjectSeed() {
  await dedupeRequest(
    () => healthRequest,
    (request) => {
      healthRequest = request
    },
    () => apiGet('/api/health'),
  )
}

export async function listProjects() {
  return dedupeRequest(
    () => projectsRequest,
    (request) => {
      projectsRequest = request
    },
    () => apiGet<ProjectRecord[]>('/api/projects'),
  )
}

export async function listFavoriteProjects() {
  return dedupeRequest(
    () => favoriteProjectsRequest,
    (request) => {
      favoriteProjectsRequest = request
    },
    () => apiGet<ProjectRecord[]>('/api/projects/favorites'),
  )
}

export async function getProjectById(id: string) {
  const current = projectByIdRequests.get(id)
  if (current) return current

  const request = apiGet<ProjectRecord>(`/api/projects/${id}`)
    .catch(() => undefined)
    .finally(() => {
      projectByIdRequests.delete(id)
    })

  projectByIdRequests.set(id, request)
  return request
}

function invalidateProjectRequests(id?: string) {
  projectsRequest = undefined
  favoriteProjectsRequest = undefined
  if (id) {
    projectByIdRequests.delete(id)
    return
  }
  projectByIdRequests.clear()
}

export async function createProject(input: ProjectMetadataInput) {
  const project = await apiPost<ProjectRecord>('/api/projects', input)
  invalidateProjectRequests()
  return project
}

export async function updateProjectMetadata(id: string, input: ProjectMetadataInput) {
  const project = await apiPatch<ProjectRecord>(`/api/projects/${id}`, input)
  invalidateProjectRequests(id)
  return project
}

export async function toggleProjectFavorite(id: string, isFavorite: boolean) {
  const project = await apiPatch<ProjectRecord>(`/api/projects/${id}/favorite`, { isFavorite })
  invalidateProjectRequests(id)
  return project
}

export async function updateProjectCanvas(id: string, canvas: WorkspaceSnapshot) {
  await apiPatch<ProjectRecord>(`/api/projects/${id}/canvas`, { canvas })
  invalidateProjectRequests(id)
}

export async function deleteProject(id: string) {
  await apiDelete(`/api/projects/${id}`)
  invalidateProjectRequests(id)
}
