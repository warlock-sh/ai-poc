import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Button,
  HStack,
  useToast,
  Spinner,
  Text,
  Flex,
  Spacer,
  Link as ChakraLink,
  Card,
  CardBody,
  Stack,
  StackDivider,
  IconButton,
  Tooltip
} from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import { RepeatIcon, ExternalLinkIcon, InfoIcon } from '@chakra-ui/icons';

const ExecutionDashboard = () => {
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const toast = useToast();

  // Fetch executions
  const fetchExecutions = useCallback(async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/executions');
      
      if (!response.ok) {
        throw new Error('Failed to fetch executions');
      }
      
      const data = await response.json();
      setExecutions(data);
    } catch (error) {
      console.error('Error fetching executions:', error);
      toast({
        title: 'Error fetching executions',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);
  
  // Pause execution
  const handlePauseExecution = async (executionId) => {
    try {
      const response = await fetch(`/api/executions/${executionId}/pause`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to pause execution');
      }
      
      toast({
        title: 'Execution paused',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
      
      // Refresh the list
      fetchExecutions();
    } catch (error) {
      console.error('Error pausing execution:', error);
      toast({
        title: 'Error pausing execution',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  // Resume execution
  const handleResumeExecution = async (executionId) => {
    try {
      const response = await fetch(`/api/executions/${executionId}/resume`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to resume execution');
      }
      
      toast({
        title: 'Execution resumed',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
      
      // Refresh the list
      fetchExecutions();
    } catch (error) {
      console.error('Error resuming execution:', error);
      toast({
        title: 'Error resuming execution',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  // Terminate execution
  const handleTerminateExecution = async (executionId) => {
    try {
      const response = await fetch(`/api/executions/${executionId}/terminate`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to terminate execution');
      }
      
      toast({
        title: 'Execution terminated',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      
      // Refresh the list
      fetchExecutions();
    } catch (error) {
      console.error('Error terminating execution:', error);
      toast({
        title: 'Error terminating execution',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  // Status badge color mapping
  const getStatusColor = (status) => {
    switch (status) {
      case 'running':
        return 'blue';
      case 'completed':
        return 'green';
      case 'error':
        return 'red';
      case 'paused':
        return 'yellow';
      case 'terminated':
        return 'orange';
      case 'initialized':
        return 'purple';
      default:
        return 'gray';
    }
  };
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Load executions on component mount
  useEffect(() => {
    fetchExecutions();
    
    // Poll for updates every 5 seconds
    const interval = setInterval(() => {
      fetchExecutions();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [fetchExecutions]);

  return (
    <Box maxW="1200px" mx="auto" p={5}>
      <Flex mb={6} alignItems="center">
        <Heading>AGENTIC Execution Dashboard</Heading>
        <Spacer />
        <Tooltip label="Refresh executions">
          <IconButton 
            icon={<RepeatIcon />} 
            colorScheme="blue" 
            onClick={fetchExecutions}
            isLoading={refreshing}
            aria-label="Refresh"
            mr={2}
          />
        </Tooltip>
        <Link to="/">
          <Button variant="outline">Back to Pipelines</Button>
        </Link>
      </Flex>
      
      <Card mb={6}>
        <CardBody>
          <Stack divider={<StackDivider />}>
            <Box>
              <Heading size="xs" textTransform="uppercase" mb={2}>
                Active Executions
              </Heading>
              <Text pt="2" fontSize="sm">
                This dashboard shows the status of all AGENTIC executions. Running executions can be paused or terminated.
              </Text>
            </Box>
            <Box>
              <Heading size="xs" textTransform="uppercase" mb={2}>
                Status Legend
              </Heading>
              <HStack pt="2" spacing={4}>
                <Badge colorScheme="blue">Running</Badge>
                <Badge colorScheme="green">Completed</Badge>
                <Badge colorScheme="red">Error</Badge>
                <Badge colorScheme="yellow">Paused</Badge>
                <Badge colorScheme="orange">Terminated</Badge>
                <Badge colorScheme="purple">Initialized</Badge>
              </HStack>
            </Box>
          </Stack>
        </CardBody>
      </Card>
      
      {loading ? (
        <Box textAlign="center" my={10}>
          <Spinner size="xl" />
          <Text mt={4}>Loading executions...</Text>
        </Box>
      ) : executions.length === 0 ? (
        <Box textAlign="center" p={5} borderWidth="1px" borderRadius="lg">
          <Text>No executions found.</Text>
        </Box>
      ) : (
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>ID</Th>
              <Th>Pipeline</Th>
              <Th>Status</Th>
              <Th>Started</Th>
              <Th>Completed</Th>
              <Th>Current State</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {executions.map((execution) => (
              <Tr key={execution.execution_id}>
                <Td>
                  <Tooltip label={execution.execution_id}>
                    <Text>{execution.execution_id.slice(0, 8)}...</Text>
                  </Tooltip>
                </Td>
                <Td>
                  <HStack>
                    <Text>{execution.pipeline_name || 'Unknown'}</Text>
                    <Tooltip label="View Pipeline">
                      <ChakraLink as={Link} to={`/pipelines/${execution.pipeline_id}`}>
                        <ExternalLinkIcon boxSize={3} />
                      </ChakraLink>
                    </Tooltip>
                  </HStack>
                </Td>
                <Td>
                  <Badge colorScheme={getStatusColor(execution.status)}>
                    {execution.status}
                  </Badge>
                </Td>
                <Td>{formatDate(execution.started_at)}</Td>
                <Td>{formatDate(execution.completed_at)}</Td>
                <Td>
                  <Tooltip label={execution.current_state_id || 'N/A'}>
                    <Text>{execution.current_state_name || 'N/A'}</Text>
                  </Tooltip>
                </Td>
                <Td>
                  <HStack spacing={2}>
                    {execution.status === 'running' && (
                      <>
                        <Button 
                          size="sm" 
                          colorScheme="yellow" 
                          onClick={() => handlePauseExecution(execution.execution_id)}
                        >
                          Pause
                        </Button>
                        <Button 
                          size="sm" 
                          colorScheme="red" 
                          onClick={() => handleTerminateExecution(execution.execution_id)}
                        >
                          Terminate
                        </Button>
                      </>
                    )}
                    {execution.status === 'paused' && (
                      <Button 
                        size="sm" 
                        colorScheme="blue"
                        onClick={() => handleResumeExecution(execution.execution_id)}
                      >
                        Resume
                      </Button>
                    )}
                    <Tooltip label="View Execution Details">
                      <IconButton 
                        icon={<InfoIcon />} 
                        size="sm" 
                        as={Link}
                        to={`/pipelines/${execution.pipeline_id}?execution=${execution.execution_id}`}
                        aria-label="Details"
                      />
                    </Tooltip>
                  </HStack>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </Box>
  );
};

export default ExecutionDashboard; 