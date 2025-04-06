import React from 'react';
import {
  Box,
  Heading,
  Text,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Badge,
  HStack,
  VStack,
  Code,
  Divider,
  Card,
  CardHeader,
  CardBody,
  SimpleGrid,
  Alert,
  AlertIcon,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useColorModeValue
} from '@chakra-ui/react';

/**
 * ExecutionResults - Displays the results and history of a pipeline execution
 */
const ExecutionResults = ({ executionContext, activeStateId }) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  if (!executionContext) {
    return null;
  }

  // Format JSON data for display
  const formatJsonValue = (value) => {
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'blue';
      case 'completed': return 'green';
      case 'error': return 'red';
      case 'paused': return 'yellow';
      case 'terminated': return 'orange';
      default: return 'gray';
    }
  };

  // Group history entries by state
  const stateHistory = {};
  if (executionContext.history) {
    executionContext.history.forEach(entry => {
      // Skip transition entries
      if (entry.state_id.includes('->')) return;
      
      if (!stateHistory[entry.state_id]) {
        stateHistory[entry.state_id] = [];
      }
      stateHistory[entry.state_id].push(entry);
    });
  }

  return (
    <Box mt={8} borderWidth="1px" borderRadius="lg" p={4} bg={bgColor} borderColor={borderColor}>
      <HStack mb={4} justifyContent="space-between">
        <Heading size="md">Execution Results</Heading>
        <Badge colorScheme={getStatusColor(executionContext.status)} fontSize="md" px={2} py={1}>
          {executionContext.status}
        </Badge>
      </HStack>

      {executionContext.error && (
        <Alert status="error" mb={4}>
          <AlertIcon />
          {executionContext.error}
        </Alert>
      )}

      <Tabs variant="enclosed" colorScheme="blue">
        <TabList>
          <Tab>Timeline</Tab>
          <Tab>Node Details</Tab>
          <Tab>Final Result</Tab>
          <Tab>Variables</Tab>
        </TabList>

        <TabPanels>
          {/* Timeline View */}
          <TabPanel>
            <Accordion allowMultiple defaultIndex={[0]}>
              {executionContext.history && executionContext.history.map((entry, index) => (
                <AccordionItem 
                  key={index}
                  borderColor={borderColor}
                  bg={entry.state_id === activeStateId ? 'yellow.50' : 'transparent'}
                >
                  <h2>
                    <AccordionButton>
                      <Box flex="1" textAlign="left">
                        <HStack>
                          <Text fontWeight="bold">{entry.state_id.includes('->') ? 'Transition' : 'State'}</Text>
                          <Text>{entry.state_id}</Text>
                          <Badge colorScheme="purple">{entry.action}</Badge>
                        </HStack>
                      </Box>
                      <AccordionIcon />
                    </AccordionButton>
                  </h2>
                  <AccordionPanel pb={4}>
                    <SimpleGrid columns={2} spacing={4}>
                      <Box>
                        <Heading size="xs" mb={2}>Inputs</Heading>
                        {entry.inputs && Object.entries(entry.inputs).length > 0 ? (
                          Object.entries(entry.inputs).map(([key, value]) => (
                            <Box key={key} mb={2}>
                              <Text fontWeight="bold">{key}:</Text>
                              <Code p={2} borderRadius="md" fontSize="sm" whiteSpace="pre-wrap" overflowX="auto" display="block">
                                {formatJsonValue(value)}
                              </Code>
                            </Box>
                          ))
                        ) : (
                          <Text fontSize="sm" color="gray.500">No inputs</Text>
                        )}
                      </Box>
                      <Box>
                        <Heading size="xs" mb={2}>Outputs</Heading>
                        {entry.outputs && Object.entries(entry.outputs).length > 0 ? (
                          Object.entries(entry.outputs).map(([key, value]) => (
                            <Box key={key} mb={2}>
                              <Text fontWeight="bold">{key}:</Text>
                              <Code p={2} borderRadius="md" fontSize="sm" whiteSpace="pre-wrap" overflowX="auto" display="block">
                                {formatJsonValue(value)}
                              </Code>
                            </Box>
                          ))
                        ) : (
                          <Text fontSize="sm" color="gray.500">No outputs</Text>
                        )}
                      </Box>
                    </SimpleGrid>
                  </AccordionPanel>
                </AccordionItem>
              ))}
            </Accordion>
          </TabPanel>

          {/* Node Details View */}
          <TabPanel>
            <Accordion allowMultiple>
              {Object.entries(stateHistory).map(([stateId, entries]) => (
                <AccordionItem 
                  key={stateId}
                  borderColor={borderColor}
                  bg={stateId === activeStateId ? 'yellow.50' : 'transparent'}
                >
                  <h2>
                    <AccordionButton>
                      <Box flex="1" textAlign="left">
                        <HStack>
                          <Text fontWeight="bold">Node: {stateId}</Text>
                          <Badge colorScheme={stateId === activeStateId ? 'yellow' : 'blue'}>
                            {stateId === activeStateId ? 'Active' : entries.length > 0 ? 'Completed' : 'Pending'}
                          </Badge>
                        </HStack>
                      </Box>
                      <AccordionIcon />
                    </AccordionButton>
                  </h2>
                  <AccordionPanel pb={4}>
                    {entries.length > 0 ? (
                      entries.map((entry, idx) => (
                        <Card key={idx} mb={3} variant="outline" size="sm">
                          <CardHeader pb={1}>
                            <HStack>
                              <Heading size="xs">Execution #{idx + 1}</Heading>
                              <Badge colorScheme="purple">{entry.action}</Badge>
                            </HStack>
                          </CardHeader>
                          <CardBody pt={1}>
                            <SimpleGrid columns={2} spacing={4}>
                              <Box>
                                <Heading size="xs" mb={2}>Inputs</Heading>
                                {entry.inputs && Object.entries(entry.inputs).length > 0 ? (
                                  Object.entries(entry.inputs).map(([key, value]) => (
                                    <Box key={key} mb={2}>
                                      <Text fontWeight="bold">{key}:</Text>
                                      <Code p={2} borderRadius="md" fontSize="sm" whiteSpace="pre-wrap" overflowX="auto" display="block">
                                        {formatJsonValue(value)}
                                      </Code>
                                    </Box>
                                  ))
                                ) : (
                                  <Text fontSize="sm" color="gray.500">No inputs</Text>
                                )}
                              </Box>
                              <Box>
                                <Heading size="xs" mb={2}>Outputs</Heading>
                                {entry.outputs && Object.entries(entry.outputs).length > 0 ? (
                                  Object.entries(entry.outputs).map(([key, value]) => (
                                    <Box key={key} mb={2}>
                                      <Text fontWeight="bold">{key}:</Text>
                                      <Code p={2} borderRadius="md" fontSize="sm" whiteSpace="pre-wrap" overflowX="auto" display="block">
                                        {formatJsonValue(value)}
                                      </Code>
                                    </Box>
                                  ))
                                ) : (
                                  <Text fontSize="sm" color="gray.500">No outputs</Text>
                                )}
                              </Box>
                            </SimpleGrid>
                          </CardBody>
                        </Card>
                      ))
                    ) : (
                      <Text fontSize="sm" color="gray.500">No execution history for this node</Text>
                    )}
                  </AccordionPanel>
                </AccordionItem>
              ))}
            </Accordion>
          </TabPanel>

          {/* Final Result View */}
          <TabPanel>
            <Card variant="outline">
              <CardHeader>
                <Heading size="sm">Final Output</Heading>
              </CardHeader>
              <CardBody>
                {executionContext.final_result ? (
                  <Code p={4} borderRadius="md" fontSize="sm" whiteSpace="pre-wrap" overflowX="auto" display="block">
                    {typeof executionContext.final_result === 'string' 
                      ? executionContext.final_result 
                      : JSON.stringify(executionContext.final_result, null, 2)}
                  </Code>
                ) : (
                  <Text fontSize="sm" color="gray.500">No final result available yet</Text>
                )}
              </CardBody>
            </Card>
          </TabPanel>

          {/* Variables View */}
          <TabPanel>
            <Card variant="outline">
              <CardHeader>
                <Heading size="sm">Execution Variables</Heading>
              </CardHeader>
              <CardBody>
                {executionContext.variables && Object.keys(executionContext.variables).length > 0 ? (
                  <Accordion allowMultiple>
                    {Object.entries(executionContext.variables).map(([key, value], index) => (
                      <AccordionItem key={index} borderColor={borderColor}>
                        <h2>
                          <AccordionButton>
                            <Box flex="1" textAlign="left" fontWeight="bold">
                              {key}
                            </Box>
                            <AccordionIcon />
                          </AccordionButton>
                        </h2>
                        <AccordionPanel pb={4}>
                          <Code p={2} borderRadius="md" fontSize="sm" whiteSpace="pre-wrap" overflowX="auto" display="block">
                            {formatJsonValue(value)}
                          </Code>
                        </AccordionPanel>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <Text fontSize="sm" color="gray.500">No variables available</Text>
                )}
              </CardBody>
            </Card>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default ExecutionResults; 