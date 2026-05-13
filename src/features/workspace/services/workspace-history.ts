import type { WorkspaceSnapshot } from '../../../types/workspace'

export function snapshotsEqual(left: WorkspaceSnapshot, right: WorkspaceSnapshot) {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function pushHistoryEntry(
  history: WorkspaceSnapshot[],
  historyIndex: number,
  nextSnapshot: WorkspaceSnapshot,
  limit: number,
) {
  const currentSnapshot = history[historyIndex]
  if (currentSnapshot && snapshotsEqual(currentSnapshot, nextSnapshot)) {
    return { history, historyIndex }
  }

  const nextHistory = [...history.slice(0, historyIndex + 1), nextSnapshot].slice(-limit)
  return {
    history: nextHistory,
    historyIndex: nextHistory.length - 1,
  }
}

export function getUndoHistoryState(history: WorkspaceSnapshot[], historyIndex: number) {
  const nextIndex = historyIndex - 1
  return {
    historyIndex: nextIndex,
    snapshot: history[nextIndex],
  }
}

export function getRedoHistoryState(history: WorkspaceSnapshot[], historyIndex: number) {
  const nextIndex = historyIndex + 1
  return {
    historyIndex: nextIndex,
    snapshot: history[nextIndex],
  }
}
