import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ProjectListPage } from '../../pages/projects/project-list-page'

const WorkspacePage = lazy(async () => {
  const module = await import('../../pages/workspace/workspace-page')
  return { default: module.WorkspacePage }
})

export function AppRouter() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--background)] text-sm text-[var(--text-secondary)]">
          Loading workspace...
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<ProjectListPage />} />
        <Route path="/workspace/:projectId" element={<WorkspacePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
