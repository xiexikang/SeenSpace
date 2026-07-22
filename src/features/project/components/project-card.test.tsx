import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProjectCard } from './project-card'

describe('ProjectCard', () => {
  afterEach(cleanup)

  it('exposes the favorite state and toggles it without opening the project', () => {
    const onToggleFavorite = vi.fn()

    render(
      <MemoryRouter>
        <ProjectCard
          id="project-1"
          title="收藏测试"
          summary="测试空间收藏按钮。"
          updatedAt="刚刚"
          nodes={2}
          isFavorite
          onToggleFavorite={onToggleFavorite}
        />
      </MemoryRouter>,
    )

    const button = screen.getByRole('button', { name: '取消收藏空间' })
    fireEvent.click(button)

    expect(onToggleFavorite).toHaveBeenCalledTimes(1)
    expect(window.location.pathname).not.toBe('/workspace/project-1')
  })

  it('keeps the favorites source when opening a card from favorites', () => {
    render(
      <MemoryRouter>
        <ProjectCard
          id="favorite-project"
          title="收藏空间"
          summary="从收藏列表打开。"
          updatedAt="刚刚"
          nodes={1}
          fromFavorites
        />
      </MemoryRouter>,
    )

    const link = screen.getByRole('link', { name: '打开空间：收藏空间' })
    expect(link.getAttribute('href')).toBe('/workspace/favorite-project?from=favorites')
  })
})
