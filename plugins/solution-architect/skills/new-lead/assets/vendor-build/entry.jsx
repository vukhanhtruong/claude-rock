import React from 'react';
import { createRoot } from 'react-dom/client';
import ReactFlow, { MiniMap, Controls, Background } from 'reactflow';
// Imported as text, not as a CSS entry point: a `css` loader makes esbuild emit
// a second output file, which would need its own version stamp kept in lockstep
// with this bundle and its own entry in init-root's ASSET_FILES. One shipped
// file cannot fall out of step with itself.
import css from 'reactflow/dist/style.css';

let styled = false;
function injectStyles() {
  if (styled) return;
  styled = true;
  const tag = document.createElement('style');
  tag.dataset.leadflow = 'reactflow';
  tag.textContent = css;
  document.head.appendChild(tag);
}

function Canvas({ map, onNodeClick }) {
  return (
    <ReactFlow nodes={map.nodes} edges={map.edges} fitView
      nodesDraggable={false} nodesConnectable={false}
      onNodeClick={(_, node) => onNodeClick?.(node)}>
      <MiniMap /> <Controls showInteractive={false} /> <Background />
    </ReactFlow>
  );
}

export function render(container, map, handlers = {}) {
  injectStyles();
  createRoot(container).render(<Canvas map={map} onNodeClick={handlers.onNodeClick} />);
}
