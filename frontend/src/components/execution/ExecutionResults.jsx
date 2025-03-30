import React from 'react';
import {
  Box,
  Heading,
  Text,
  Badge,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  HStack
} from '@chakra-ui/react';

/**
 * ExecutionResults - Displays the results and history of a pipeline execution
 */
const ExecutionResults = ({ executionContext, activeStateId }) => {
  if (!executionContext) return null;

  return (
    <Box mt={4} p={4} borderWidth="1px" borderRadius="lg">
      <Heading size="md" mb={2}>Execution Results</Heading>
      <Text fontWeight="bold">
        Status: 
        <Badge 
          ml={2}
          colorScheme={
            executionContext.status === 'completed' ? 'green' : 
            executionContext.status === 'error' ? 'red' : 'blue'
          }
        >
          {executionContext.status}
        </Badge>
      </Text>
      
      {executionContext.final_result && (
        <Box mt={4} p={3} bg="blue.50" borderRadius="md">
          <Heading size="sm" mb={2}>Final Result</Heading>
          <Box 
            maxH="300px" 
            overflowY="auto" 
            whiteSpace="pre-wrap" 
            fontFamily="mono" 
            fontSize="sm" 
            p={2} 
            bg="white" 
            borderRadius="md"
          >
            {executionContext.final_result}
          </Box>
        </Box>
      )}
      
      <Box mt={4}>
        <Heading size="sm" mb={2}>Execution History</Heading>
        <Accordion allowMultiple>
          {executionContext.history && executionContext.history.map((entry, idx) => (
            <AccordionItem key={idx}>
              <h2>
                <AccordionButton bg={activeStateId === entry.state_id ? "yellow.100" : "gray.100"}>
                  <Box flex="1" textAlign="left">
                    <HStack>
                      <Text fontWeight="bold">{entry.state_id}</Text>
                      <Badge>{entry.action}</Badge>
                    </HStack>
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
              </h2>
              <AccordionPanel pb={4}>
                {entry.inputs && Object.keys(entry.inputs).length > 0 && (
                  <Box mb={3}>
                    <Text fontWeight="bold">Inputs:</Text>
                    {Object.entries(entry.inputs).map(([key, value]) => (
                      <Box key={key} mt={1}>
                        <Text fontSize="sm" fontWeight="medium">{key}:</Text>
                        <Box 
                          maxH="150px" 
                          overflowY="auto" 
                          whiteSpace="pre-wrap" 
                          fontFamily="mono" 
                          fontSize="xs" 
                          p={2} 
                          bg="gray.50" 
                          borderRadius="md"
                        >
                          {value}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
                
                {entry.outputs && Object.keys(entry.outputs).length > 0 && (
                  <Box>
                    <Text fontWeight="bold">Outputs:</Text>
                    {Object.entries(entry.outputs).map(([key, value]) => (
                      <Box key={key} mt={1}>
                        <Text fontSize="sm" fontWeight="medium">{key}:</Text>
                        <Box 
                          maxH="300px" 
                          overflowY="auto" 
                          whiteSpace="pre-wrap" 
                          fontFamily="mono" 
                          fontSize="xs" 
                          p={2} 
                          bg="gray.50" 
                          borderRadius="md"
                        >
                          {value}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
              </AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
      </Box>
    </Box>
  );
};

export default ExecutionResults; 