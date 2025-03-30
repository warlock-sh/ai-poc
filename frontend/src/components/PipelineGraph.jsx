import React from 'react';
import { Box, Button } from '@chakra-ui/react';
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { nodeTypes } from './nodes/StateNodes';

/**
 * PipelineGraph - Displays the pipeline as a graph with states and transitions
 */
const PipelineGraph = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeDragStop,
  onAddStateOpen
}) => {
  return (
    <Box h="600px" border="1px" borderColor="gray.200" borderRadius="md">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background variant="dots" gap={12} size={1} />
        
        <Panel position="top-right">
          <Button 
            colorScheme="blue" 
            size="sm" 
            onClick={onAddStateOpen}
            mb={2}
          >
            Add State
          </Button>
        </Panel>
      </ReactFlow>
    </Box>
  );
};

export default PipelineGraph; 