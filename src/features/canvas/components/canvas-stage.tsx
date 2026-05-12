import '@xyflow/react/dist/style.css'

import { Background, BackgroundVariant, ReactFlow } from '@xyflow/react'
import type { Node } from '@xyflow/react'
import { CanvasEmptyState } from './canvas-empty-state'
import { ZoomControls } from './zoom-controls'

const initialNodes: Node[] = []

export function CanvasStage() {
  return (
    <div className="relative h-full min-h-[680px] overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--canvas)] shadow-[var(--shadow-sm)]">
      <ReactFlow
        fitView
        nodes={initialNodes}
        edges={[]}
        proOptions={{ hideAttribution: true }}
        minZoom={0.5}
        maxZoom={1.8}
        className="bg-transparent"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={18}
          size={1.25}
          color="var(--canvas-dot)"
        />
      </ReactFlow>
      <CanvasEmptyState />
      <ZoomControls />
    </div>
  )
}
