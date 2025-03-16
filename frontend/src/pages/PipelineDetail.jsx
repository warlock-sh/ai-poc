import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Heading, Spinner, Center, Text, Button, HStack } from '@chakra-ui/react';
import ReactFlow, { 
  Controls, 
  Background, 
  MiniMap,
  applyEdgeChanges,
  applyNodeChanges
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Link } from 'react-router-dom';

const PipelineDetail = () => {
  const { id } = useParams();
  const [pipeline, setPipeline] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPipeline = async () => {
      try {
        const response = await fetch(`/api/pipelines/${id}`);
        
        if (!response.ok) {
          throw new Error('Pipeline not found');
        }
        
        const data = await response.json();
        setPipeline(data);
        
        // Transform pipeline nodes and edges for ReactFlow
        const flowNodes = data.nodes.map(node => ({
          id: node.id,
          position: node.position || { x: 100, y: 100 },
          data: { label: node.label || node.name },
          type: 'default'
        }));
        
        const flowEdges = data.edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          animated: true
        }));
        
        setNodes(flowNodes);
        setEdges(flowEdges);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching pipeline:', error);
        setLoading(false);
      }
    };

    fetchPipeline();
  }, [id]);

  const onNodesChange = (changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  };

  const onEdgesChange = (changes) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  };

  if (loading) {
    return (
      <Center h="300px">
        <Spinner size="xl" />
      </Center>
    );
  }

  if (!pipeline) {
    return (
      <Box maxW="1200px" mx="auto" p={5} textAlign="center">
        <Text fontSize="xl" mb={5}>Pipeline not found</Text>
        <Link to="/">
          <Button colorScheme="blue">Back to Pipelines</Button>
        </Link>
      </Box>
    );
  }

  return (
    <Box maxW="1200px" mx="auto" p={5}>
      <HStack justify="space-between" mb={4}>
        <Heading>{pipeline.name}</Heading>
        <Link to="/">
          <Button variant="outline">Back to Pipelines</Button>
        </Link>
      </HStack>
      <Text mb={8}>{pipeline.description}</Text>
      
      <Box h="600px" border="1px" borderColor="gray.200" borderRadius="md">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
        >
          <Controls />
          <MiniMap />
          <Background variant="dots" gap={12} size={1} />
        </ReactFlow>
      </Box>
    </Box>
  );
};

export default PipelineDetail; 