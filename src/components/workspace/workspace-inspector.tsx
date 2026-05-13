import { Info, Trash2 } from 'lucide-react'
import type { WorkspaceNode } from '../../types/workspace'

type WorkspaceInspectorProps = {
  node?: WorkspaceNode
  onChange: (
    updates: Partial<WorkspaceNode['data']>,
  ) => void
  onDelete: () => void
}

function renderTypeFields(
  node: WorkspaceNode,
  onChange: (updates: Partial<WorkspaceNode['data']>) => void,
) {
  if (node.type === 'note') {
    return (
      <label className="mb-4 block">
        <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">Body</div>
        <textarea
          value={node.data.body ?? ''}
          onChange={(event) => onChange({ body: event.target.value })}
          rows={5}
          className="w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm leading-6 text-[var(--text-primary)] outline-none"
        />
      </label>
    )
  }

  if (node.type === 'web') {
    return (
      <>
        <label className="mb-4 block">
          <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">URL</div>
          <input
            value={node.data.url ?? ''}
            onChange={(event) => onChange({ url: event.target.value })}
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none"
          />
        </label>
        <label className="mb-4 block">
          <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">Domain</div>
          <input
            value={node.data.domain ?? ''}
            onChange={(event) => onChange({ domain: event.target.value })}
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none"
          />
        </label>
      </>
    )
  }

  if (node.type === 'image') {
    return (
      <>
        <label className="mb-4 block">
          <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">Image URL</div>
          <input
            value={node.data.imageUrl ?? ''}
            onChange={(event) => onChange({ imageUrl: event.target.value })}
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none"
          />
        </label>
        <label className="mb-4 block">
          <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">Palette</div>
          <input
            value={node.data.palette ?? ''}
            onChange={(event) => onChange({ palette: event.target.value })}
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none"
          />
        </label>
      </>
    )
  }

  return (
    <>
      <label className="mb-4 block">
        <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">Category</div>
        <input
          value={node.data.category ?? ''}
          onChange={(event) => onChange({ category: event.target.value })}
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none"
        />
      </label>
      <label className="mb-6 block">
        <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">Tags</div>
        <textarea
          value={(node.data.tags ?? []).join(', ')}
          onChange={(event) =>
            onChange({
              tags: event.target.value
                .split(',')
                .map((value) => value.trim())
                .filter(Boolean),
            })
          }
          rows={4}
          className="w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm leading-6 text-[var(--text-primary)] outline-none"
        />
      </label>
    </>
  )
}

export function WorkspaceInspector({ node, onChange, onDelete }: WorkspaceInspectorProps) {
  return (
    <aside className="flex w-[320px] shrink-0 flex-col rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-4 shadow-[var(--shadow-sm)]">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--panel-elevated)] text-[var(--text-secondary)]">
          <Info className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold text-[var(--text-primary)]">Inspector</div>
          <div className="text-xs text-[var(--text-secondary)]">Edit the selected canvas item</div>
        </div>
      </div>

      {node ? (
        <div className="flex flex-1 flex-col">
          <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--panel-elevated)] px-3 py-2 text-xs font-medium uppercase tracking-[0.08em] text-[var(--text-secondary)]">
            {node.type}
          </div>

          <label className="mb-4 block">
            <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">Title</div>
            <input
              value={node.data.title}
              onChange={(event) => onChange({ title: event.target.value })}
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none"
            />
          </label>

          <label className="mb-4 block">
            <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">Description</div>
            <textarea
              value={node.data.description ?? ''}
              onChange={(event) => onChange({ description: event.target.value })}
              rows={4}
              className="w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm leading-6 text-[var(--text-primary)] outline-none"
            />
          </label>

          <label className="mb-4 block">
            <div className="mb-2 text-xs font-medium text-[var(--text-secondary)]">Meta Label</div>
            <input
              value={node.data.meta ?? ''}
              onChange={(event) => onChange({ meta: event.target.value })}
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none"
            />
          </label>

          {renderTypeFields(node, onChange)}

          <button
            type="button"
            onClick={onDelete}
            className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--panel-elevated)]"
          >
            <Trash2 className="h-4 w-4" />
            Delete Node
          </button>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--background)] p-6 text-center">
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            Select a node on the canvas to edit its title, notes, and metadata.
          </p>
        </div>
      )}
    </aside>
  )
}
