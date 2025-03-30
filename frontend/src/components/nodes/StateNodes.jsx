import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

/**
 * StartNode - The beginning node of a pipeline
 */
export const StartNode = memo(({ data }) => {
  return (
    <div style={{ 
      background: '#9FE2BF', 
      color: 'black',
      border: '1px solid #9FE2BF',
      borderRadius: '3px',
      padding: '10px',
      width: '150px',
      textAlign: 'center'
    }}>
      <Handle type="source" position={Position.Bottom} />
      <div>{data.label}</div>
    </div>
  );
});

/**
 * LLMNode - Node for LLM processing
 */
export const LLMNode = memo(({ data }) => {
  return (
    <div style={{ 
      background: '#6495ED', 
      color: 'white',
      border: '1px solid #6495ED',
      borderRadius: '3px',
      padding: '10px',
      width: '150px',
      textAlign: 'center'
    }}>
      <Handle type="target" position={Position.Top} />
      <div>{data.label}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});

/**
 * EndNode - The termination node of a pipeline
 */
export const EndNode = memo(({ data }) => {
  return (
    <div style={{ 
      background: '#FA8072', 
      color: 'white',
      border: '1px solid #FA8072',
      borderRadius: '3px',
      padding: '10px',
      width: '150px',
      textAlign: 'center'
    }}>
      <Handle type="target" position={Position.Top} />
      <div>{data.label}</div>
    </div>
  );
});

// Map of node types to components for ReactFlow
export const nodeTypes = {
  start: StartNode,
  llm: LLMNode,
  end: EndNode
}; 