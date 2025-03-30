import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Heading, 
  Text, 
  SimpleGrid, 
  Card, 
  CardBody, 
  Stack,
  Button,
  Spinner,
  Center
} from '@chakra-ui/react';
import { Link } from 'react-router-dom';

const PipelineList = () => {
  const [pipelines, setPipelines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPipelines = async () => {
      try {
        const response = await fetch('/api/pipelines');
        const data = await response.json();
        setPipelines(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching pipelines:', error);
        setLoading(false);
      }
    };

    fetchPipelines();
  }, []);

  if (loading) {
    return (
      <Center h="300px">
        <Spinner size="xl" />
      </Center>
    );
  }

  return (
    <Box maxW="1200px" mx="auto" p={5}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={6}>
        <Heading>Pipelines</Heading>
        <Link to="/executions">
          <Button colorScheme="blue" variant="outline">
            Active Executions
          </Button>
        </Link>
      </Box>
      
      {pipelines.length === 0 ? (
        <Box textAlign="center" py={10}>
          <Text fontSize="xl" mb={5}>No pipelines found</Text>
          <Text mb={8}>Create your first pipeline to start building agentic workflows</Text>
          <Link to="/create">
            <Button colorScheme="blue">Create Your First Pipeline</Button>
          </Link>
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={10}>
          {pipelines.map((pipeline) => (
            <Link to={`/pipelines/${pipeline.id}`} key={pipeline.id}>
              <Card h="100%" _hover={{ transform: 'translateY(-5px)', shadow: 'lg' }} transition="all 0.2s">
                <CardBody>
                  <Stack>
                    <Heading size="md">{pipeline.name}</Heading>
                    <Text>{pipeline.description}</Text>
                    <Text color="gray.500">Nodes: {pipeline.nodes.length}</Text>
                  </Stack>
                </CardBody>
              </Card>
            </Link>
          ))}
        </SimpleGrid>
      )}
    </Box>
  );
};

export default PipelineList; 