import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Box, 
  Heading, 
  Spinner, 
  Center, 
  Text, 
  Button, 
  HStack, 
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { applyEdgeChanges, applyNodeChanges } from 'reactflow';
import { Link } from 'react-router-dom';

// Import Components
import PipelineGraph from '../components/PipelineGraph';
import ExecutionResults from '../components/execution/ExecutionResults';
import AddStateModal from '../components/modals/AddStateModal';
import AddTransitionModal from '../components/modals/AddTransitionModal';
import ExecutePipelineModal from '../components/modals/ExecutePipelineModal';

// Import Custom Hook
import useWebSocket from '../hooks/useWebSocket';

const PipelineDetail = () => {
  const { id } = useParams();
  const [pipeline, setPipeline] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [activeStateId, setActiveStateId] = useState(null);
  const [executionContext, setExecutionContext] = useState(null);
  
  // State for new state/transition forms
  const [newState, setNewState] = useState({
    name: '',
    type: 'llm',
    description: '',
    position: { x: 100, y: 100 }
  });
  
  const [newTransition, setNewTransition] = useState({
    sourceId: '',
    targetId: '',
    outputId: '',
    inputId: ''
  });
  
  // Chat/execution state
  const [initialPrompt, setInitialPrompt] = useState('');
  
  // Modal controls
  const { 
    isOpen: isAddStateOpen, 
    onOpen: onAddStateOpen, 
    onClose: onAddStateClose 
  } = useDisclosure();
  
  const { 
    isOpen: isAddTransitionOpen, 
    onOpen: onAddTransitionOpen, 
    onClose: onAddTransitionClose 
  } = useDisclosure();
  
  const { 
    isOpen: isExecuteOpen, 
    onOpen: onExecuteOpen, 
    onClose: onExecuteClose 
  } = useDisclosure();
  
  const toast = useToast();

  // WebSocket connection handling
  const handleWebSocketMessage = useCallback((data) => {
    // Handle different types of updates
    switch (data.type) {
      case 'state_started':
        // Update highlighted node
        setActiveStateId(data.state_id);
        
        // Update execution context
        setExecutionContext(prev => ({
          ...prev,
          currentStateId: data.state_id,
          status: data.status
        }));
        break;
        
      case 'state_completed':
        // Update execution context history
        setExecutionContext(prev => {
          // Get the updated execution data from server
          fetch(`/api/executions/${data.execution_id}`)
            .then(response => response.json())
            .then(executionData => {
              setExecutionContext(executionData);
            })
            .catch(error => console.error("Failed to fetch updated execution data:", error));
          
          // Return the existing state for now
          return prev;
        });
        break;
        
      case 'transition_executed':
        // Could animate the edge if we wanted to
        break;
        
      case 'execution_completed':
        // Final update with complete results
        setExecutionContext({
          execution_id: data.execution_id,
          status: data.status,
          history: data.history,
          variables: data.variables,
          final_result: data.final_result
        });
        
        setExecuting(false);
        onExecuteClose(); // Close the execution modal
        
        toast({
          title: 'Execution complete',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        break;
        
      case 'execution_error':
        setExecutionContext(prev => ({
          ...prev,
          status: 'error',
          error: data.error
        }));
        
        setExecuting(false);
        
        toast({
          title: 'Execution error',
          description: data.error,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        break;
    }
  }, [onExecuteClose, toast]);

  const handleWebSocketOpen = useCallback(() => {
    toast({
      title: 'Execution started',
      description: 'Connected to real-time updates',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  }, [toast]);

  const handleWebSocketError = useCallback((error) => {
    toast({
      title: 'WebSocket error',
      description: 'Connection to real-time updates failed',
      status: 'error',
      duration: 5000,
      isClosable: true,
    });
  }, [toast]);

  const { connect, disconnect } = useWebSocket({
    onMessage: handleWebSocketMessage,
    onOpen: handleWebSocketOpen,
    onError: handleWebSocketError
  });

  // Transform pipeline states to ReactFlow nodes
  const mapStatesToNodes = useCallback((states) => {
    return (states || []).map(state => ({
      id: state.id,
      position: state.position || { x: 100, y: 100 },
      data: { 
        label: state.name,
        type: state.type,
        inputs: state.inputs || [],
        outputs: state.outputs || [],
        config: state.config || {}
      },
      type: state.type, // Use state type as node type
      style: activeStateId === state.id ? { 
        boxShadow: '0 0 10px 3px rgba(255, 215, 0, 0.7)', 
        zIndex: 1000,
        border: '2px solid gold'
      } : {}
    }));
  }, [activeStateId]);

  // Update nodes when the pipeline or active state changes
  useEffect(() => {
    if (pipeline && pipeline.states) {
      setNodes(mapStatesToNodes(pipeline.states));
    }
  }, [pipeline, mapStatesToNodes]);

  // Fetch pipeline data
  useEffect(() => {
    const fetchPipeline = async () => {
      try {
        const response = await fetch(`/api/pipelines/${id}`);
        
        if (!response.ok) {
          throw new Error('Pipeline not found');
        }
        
        const data = await response.json();
        setPipeline(data);
        
        // Transform pipeline transitions to ReactFlow edges
        const flowEdges = (data.transitions || []).map(transition => ({
          id: transition.id,
          source: transition.source_id,
          target: transition.target_id,
          label: transition.label,
          animated: true,
          data: {
            sourceOutputId: transition.source_output_id,
            targetInputId: transition.target_input_id
          }
        }));
        
        setEdges(flowEdges);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching pipeline:', error);
        setLoading(false);
      }
    };

    fetchPipeline();
  }, [id]);

  // Handle node changes
  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  // Save node positions after drag ends
  const onNodeDragStop = useCallback(
    async (event, node) => {
      // Update node locally
      setNodes((nds) =>
        nds.map((n) => (n.id === node.id ? { ...n, position: node.position } : n))
      );

      try {
        // Find the corresponding state
        const state = pipeline.states.find((s) => s.id === node.id);
        
        if (state) {
          // Update state with new position
          const updatedState = {
            ...state,
            position: node.position
          };
          
          // Send update to backend
          const response = await fetch(`/api/pipelines/${id}/states/${node.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedState),
          });
          
          if (!response.ok) {
            throw new Error('Failed to update state position');
          }
          
          // Update local pipeline data
          setPipeline({
            ...pipeline,
            states: pipeline.states.map((s) => 
              s.id === node.id ? updatedState : s
            )
          });
          
          console.log(`Saved position for state ${node.id}:`, node.position);
        }
      } catch (error) {
        console.error('Error saving state position:', error);
        toast({
          title: 'Error saving position',
          description: error.message,
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    },
    [id, pipeline, toast]
  );

  // Handle edge changes
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  
  // Handle connecting nodes
  const onConnect = useCallback(
    (params) => {
      // Open add transition form when nodes are connected
      setNewTransition({
        sourceId: params.source,
        targetId: params.target,
        outputId: '',
        inputId: ''
      });
      onAddTransitionOpen();
    },
    [onAddTransitionOpen]
  );

  // Submit new state
  const handleAddState = async () => {
    try {
      const stateId = Math.random().toString(36).substring(7);
      
      // Create default inputs/outputs based on state type
      let inputs = [];
      let outputs = [];
      
      if (newState.type === 'start') {
        // Start states have no inputs and one output for the prompt
        outputs = [{
          id: `${stateId}-out-0`,
          name: 'initial_prompt',
          data_type: 'string'
        }];
      } else if (newState.type === 'llm') {
        // LLM states have a prompt input and a response output
        inputs = [{
          id: `${stateId}-in-0`,
          name: 'prompt',
          data_type: 'string'
        }];
        outputs = [{
          id: `${stateId}-out-0`,
          name: 'response',
          data_type: 'string'
        }];
      } else if (newState.type === 'end') {
        // End states have only inputs
        inputs = [{
          id: `${stateId}-in-0`,
          name: 'final_output',
          data_type: 'string'
        }];
      }
      
      // Default config for LLM states
      let config = null;
      if (newState.type === 'llm') {
        config = {
          model: "claude-3-7-sonnet-20250219",
          temperature: 0.7,
          max_tokens: 1000,
          prompt_prefix: "",
          prompt_suffix: ""
        };
      }
      
      // Create state payload
      const statePayload = {
        id: stateId,
        type: newState.type,
        name: newState.name,
        description: newState.description,
        position: newState.position,
        inputs,
        outputs,
        config
      };
      
      // Send to server
      const response = await fetch(`/api/pipelines/${id}/states`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(statePayload),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add state');
      }
      
      // Add node to graph
      const newNode = {
        id: stateId,
        position: newState.position,
        data: { 
          label: newState.name,
          type: newState.type,
          inputs,
          outputs,
          config
        },
        type: newState.type
      };
      
      setNodes(nodes => [...nodes, newNode]);
      
      // Reset form
      setNewState({
        name: '',
        type: 'llm',
        description: '',
        position: { 
          x: newState.position.x + 100, 
          y: newState.position.y + 50 
        }
      });
      
      onAddStateClose();
      
      toast({
        title: 'State added',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error adding state:', error);
      toast({
        title: 'Error adding state',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  // Submit new transition
  const handleAddTransition = async () => {
    try {
      const transitionId = Math.random().toString(36).substring(7);
      
      // Get the names of the selected output and input
      const sourceOutputs = getSourceOutputs();
      const targetInputs = getTargetInputs();
      
      const sourceOutput = sourceOutputs.find(output => output.id === newTransition.outputId);
      const targetInput = targetInputs.find(input => input.id === newTransition.inputId);
      
      const sourceOutputName = sourceOutput ? sourceOutput.name : newTransition.outputId;
      const targetInputName = targetInput ? targetInput.name : newTransition.inputId;
      
      // Create transition payload with readable names in the label
      const transitionPayload = {
        id: transitionId,
        source_id: newTransition.sourceId,
        target_id: newTransition.targetId,
        source_output_id: newTransition.outputId,
        target_input_id: newTransition.inputId,
        label: `${sourceOutputName} → ${targetInputName}`
      };
      
      // Send to server
      const response = await fetch(`/api/pipelines/${id}/transitions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transitionPayload),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add transition');
      }
      
      // Add edge to graph
      const newEdge = {
        id: transitionId,
        source: newTransition.sourceId,
        target: newTransition.targetId,
        label: transitionPayload.label,
        animated: true,
        data: {
          sourceOutputId: newTransition.outputId,
          targetInputId: newTransition.inputId
        }
      };
      
      setEdges(edges => [...edges, newEdge]);
      
      // Reset form
      setNewTransition({
        sourceId: '',
        targetId: '',
        outputId: '',
        inputId: ''
      });
      
      onAddTransitionClose();
      
      toast({
        title: 'Transition added',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error adding transition:', error);
      toast({
        title: 'Error adding transition',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  // Execute pipeline
  const handleExecutePipeline = async () => {
    try {
      setExecuting(true);
      
      // Close the modal immediately
      onExecuteClose();
      
      // Send request to execute pipeline
      const response = await fetch(`/api/pipelines/${id}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          initial_prompt: initialPrompt
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to execute pipeline');
      }
      
      const result = await response.json();
      const executionId = result.execution_id;
      
      // Set up WebSocket connection for real-time updates
      connect(executionId);
      
      // Initialize execution context
      setExecutionContext({
        execution_id: executionId,
        status: "running",
        history: [],
        variables: {},
        currentStateId: null
      });
      
      toast({
        title: 'Pipeline execution started',
        description: `Execution ID: ${executionId.substring(0, 8)}... - Connect to the WebSocket for real-time updates`,
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
      
    } catch (error) {
      console.error('Error executing pipeline:', error);
      setExecuting(false);
      toast({
        title: 'Error executing pipeline',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  // Clean up WebSocket on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Get a specific source node's outputs
  const getSourceOutputs = () => {
    const sourceNode = nodes.find(node => node.id === newTransition.sourceId);
    return sourceNode ? sourceNode.data.outputs : [];
  };
  
  // Get a specific target node's inputs
  const getTargetInputs = () => {
    const targetNode = nodes.find(node => node.id === newTransition.targetId);
    return targetNode ? targetNode.data.inputs : [];
  };

  // Loading state
  if (loading) {
    return (
      <Center h="300px">
        <Spinner size="xl" />
      </Center>
    );
  }

  // Not found state
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
        <HStack>
          <Button colorScheme="green" onClick={onExecuteOpen}>
            Execute
          </Button>
          <Link to="/executions">
            <Button colorScheme="blue" variant="outline">
              View Executions
            </Button>
          </Link>
          <Link to="/">
            <Button variant="outline">Back to Pipelines</Button>
          </Link>
        </HStack>
      </HStack>
      <Text mb={8}>{pipeline.description}</Text>
      
      {/* Pipeline Graph Component */}
      <PipelineGraph
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onAddStateOpen={onAddStateOpen}
      />
      
      {/* Execution Results Component */}
      <ExecutionResults
        executionContext={executionContext}
        activeStateId={activeStateId}
      />
      
      {/* Add State Modal Component */}
      <AddStateModal
        isOpen={isAddStateOpen}
        onClose={onAddStateClose}
        newState={newState}
        setNewState={setNewState}
        onAddState={handleAddState}
      />
      
      {/* Add Transition Modal Component */}
      <AddTransitionModal
        isOpen={isAddTransitionOpen}
        onClose={onAddTransitionClose}
        newTransition={newTransition}
        setNewTransition={setNewTransition}
        sourceOutputs={getSourceOutputs()}
        targetInputs={getTargetInputs()}
        onAddTransition={handleAddTransition}
      />
      
      {/* Execute Pipeline Modal Component */}
      <ExecutePipelineModal
        isOpen={isExecuteOpen}
        onClose={onExecuteClose}
        initialPrompt={initialPrompt}
        setInitialPrompt={setInitialPrompt}
        onExecute={handleExecutePipeline}
        isExecuting={executing}
      />
    </Box>
  );
};

export default PipelineDetail; 