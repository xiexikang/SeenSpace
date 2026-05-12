import { Navigate, Route, Routes } from 'react-router-dom'
import { ProjectListPage } from '../../pages/projects/project-list-page'
import { WorkspacePage } from '../../pages/workspace/workspace-page'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<ProjectListPage />} />
      <Route path="/workspace/:projectId" element={<WorkspacePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
