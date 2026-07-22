import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProjectRecord } from '../../types/project'
import { ProjectListPage } from './project-list-page'

const ensureProjectSeedMock = vi.fn()
const listProjectsMock = vi.fn()
const listFavoriteProjectsMock = vi.fn()
const toggleProjectFavoriteMock = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('../../components/shared/library-sidebar', () => ({
  LibrarySidebar: () => <aside data-testid="library-sidebar" />,
}))

vi.mock('../../components/shared/top-toolbar', () => ({
  TopToolbar: () => <header data-testid="top-toolbar" />,
}))

vi.mock('../../components/shared/light-toast', () => ({
  LightToast: () => null,
}))

vi.mock('../../features/project/components/project-card', () => ({
  ProjectCard: ({
    title,
    isFavorite,
    onToggleFavorite,
  }: {
    title: string
    isFavorite: boolean
    onToggleFavorite: () => void
  }) => (
    <article>
      <span>{title}</span>
      <button type="button" aria-label={isFavorite ? '取消收藏空间' : '收藏空间'} onClick={onToggleFavorite} />
    </article>
  ),
}))

vi.mock('../../features/project/services/project-service', () => ({
  ensureProjectSeed: (...args: unknown[]) => ensureProjectSeedMock(...args),
  listProjects: (...args: unknown[]) => listProjectsMock(...args),
  listFavoriteProjects: (...args: unknown[]) => listFavoriteProjectsMock(...args),
  toggleProjectFavorite: (...args: unknown[]) => toggleProjectFavoriteMock(...args),
  createProject: vi.fn(),
  deleteProject: vi.fn(),
  updateProjectMetadata: vi.fn(),
}))

describe('ProjectListPage', () => {
  beforeEach(() => {
    ensureProjectSeedMock.mockResolvedValue(undefined)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('shows the space-list skeleton until projects finish loading', async () => {
    let resolveProjects!: (projects: ProjectRecord[]) => void
    listProjectsMock.mockReturnValue(
      new Promise<ProjectRecord[]>((resolve) => {
        resolveProjects = resolve
      }),
    )

    render(<ProjectListPage />)

    expect(screen.getByRole('status', { name: '正在加载空间列表' }).getAttribute('aria-busy')).toBe('true')
    expect(screen.queryByText('还没有空间')).toBeNull()

    resolveProjects([])

    await waitFor(() => expect(screen.queryByRole('status')).toBeNull())
    expect(screen.getByText('还没有空间')).toBeTruthy()
  })

  it('optimistically toggles and persists a project favorite', async () => {
    const project: ProjectRecord = {
      id: 'project-1',
      name: '收藏测试空间',
      summary: '测试收藏状态。',
      coverImage: 'data:image/png;base64,Y292ZXI=',
      updatedAt: '2026-07-20T00:00:00Z',
      createdAt: '2026-07-20T00:00:00Z',
      nodeCount: 2,
      initials: '收藏',
      thumbnailVariant: 'mist',
      isFavorite: false,
      canvas: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
    }
    listProjectsMock.mockResolvedValue([project])
    toggleProjectFavoriteMock.mockResolvedValue({ ...project, isFavorite: true })

    render(<ProjectListPage />)

    const favoriteButton = await screen.findByRole('button', { name: '收藏空间' })
    fireEvent.click(favoriteButton)

    expect(screen.getByRole('button', { name: '取消收藏空间' })).toBeTruthy()
    await waitFor(() => expect(toggleProjectFavoriteMock).toHaveBeenCalledWith('project-1', true))
  })

  it('loads only favorites and removes a card after unfavoriting it', async () => {
    const project: ProjectRecord = {
      id: 'favorite-1',
      name: '常用灵感库',
      summary: '收藏空间。',
      coverImage: null,
      updatedAt: '2026-07-20T00:00:00Z',
      createdAt: '2026-07-20T00:00:00Z',
      nodeCount: 1,
      initials: '常用',
      thumbnailVariant: 'mint',
      isFavorite: true,
      canvas: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
    }
    listFavoriteProjectsMock.mockResolvedValue([project])
    toggleProjectFavoriteMock.mockResolvedValue({ ...project, isFavorite: false })

    render(<ProjectListPage favoriteOnly />)

    fireEvent.click(await screen.findByRole('button', { name: '取消收藏空间' }))

    await waitFor(() => expect(screen.queryByText('常用灵感库')).toBeNull())
    expect(screen.getByText('还没有收藏')).toBeTruthy()
    expect(listFavoriteProjectsMock).toHaveBeenCalledTimes(1)
  })
})
