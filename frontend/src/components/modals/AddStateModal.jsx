import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  VStack,
  HStack,
  Text
} from '@chakra-ui/react';

/**
 * AddStateModal - Modal for adding a new state to the pipeline
 */
const AddStateModal = ({ 
  isOpen, 
  onClose, 
  newState, 
  setNewState,
  onAddState
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Add New State</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel>Name</FormLabel>
              <Input 
                value={newState.name}
                onChange={(e) => setNewState({...newState, name: e.target.value})}
                placeholder="Enter state name"
              />
            </FormControl>
            
            <FormControl isRequired>
              <FormLabel>Type</FormLabel>
              <Select 
                value={newState.type}
                onChange={(e) => setNewState({...newState, type: e.target.value})}
              >
                <option value="start">Start</option>
                <option value="llm">LLM (Claude)</option>
                <option value="end">End</option>
              </Select>
            </FormControl>
            
            <FormControl>
              <FormLabel>Description</FormLabel>
              <Input 
                value={newState.description}
                onChange={(e) => setNewState({...newState, description: e.target.value})}
                placeholder="Enter description"
              />
            </FormControl>
            
            {/* LLM-specific configuration */}
            {newState.type === 'llm' && (
              <>
                <FormControl>
                  <FormLabel>Model</FormLabel>
                  <Select
                    value={newState.config?.model || "claude-3-7-sonnet-20250219"}
                    onChange={(e) => setNewState({
                      ...newState,
                      config: {
                        ...newState.config || {},
                        model: e.target.value
                      }
                    })}
                  >
                    <option value="claude-3-7-sonnet-20250219">Claude 3.7 Sonnet</option>
                    <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                    <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                  </Select>
                </FormControl>
                
                <FormControl>
                  <FormLabel>Temperature</FormLabel>
                  <HStack>
                    <Input
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={newState.config?.temperature || 0.7}
                      onChange={(e) => setNewState({
                        ...newState,
                        config: {
                          ...newState.config || {},
                          temperature: parseFloat(e.target.value)
                        }
                      })}
                    />
                    <Text fontSize="sm" color="gray.500">
                      0 = deterministic, 1 = creative
                    </Text>
                  </HStack>
                </FormControl>
                
                <FormControl>
                  <FormLabel>System Prompt</FormLabel>
                  <Textarea
                    value={newState.config?.system_prompt || ""}
                    onChange={(e) => setNewState({
                      ...newState,
                      config: {
                        ...newState.config || {},
                        system_prompt: e.target.value
                      }
                    })}
                    placeholder="Optional system prompt to guide the model's behavior"
                    rows={3}
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel>Prompt Prefix (prepended to input)</FormLabel>
                  <Textarea
                    value={newState.config?.prompt_prefix || ""}
                    onChange={(e) => setNewState({
                      ...newState,
                      config: {
                        ...newState.config || {},
                        prompt_prefix: e.target.value
                      }
                    })}
                    placeholder="Text to prepend before the user's input"
                    rows={3}
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel>Prompt Suffix (appended to input)</FormLabel>
                  <Textarea
                    value={newState.config?.prompt_suffix || ""}
                    onChange={(e) => setNewState({
                      ...newState,
                      config: {
                        ...newState.config || {},
                        prompt_suffix: e.target.value
                      }
                    })}
                    placeholder="Text to append after the user's input"
                    rows={3}
                  />
                </FormControl>
              </>
            )}
            
            <FormControl>
              <FormLabel>Position</FormLabel>
              <HStack>
                <Input 
                  value={newState.position.x}
                  onChange={(e) => setNewState({
                    ...newState, 
                    position: {...newState.position, x: Number(e.target.value)}
                  })}
                  type="number"
                  placeholder="X"
                />
                <Input 
                  value={newState.position.y}
                  onChange={(e) => setNewState({
                    ...newState, 
                    position: {...newState.position, y: Number(e.target.value)}
                  })}
                  type="number"
                  placeholder="Y"
                />
              </HStack>
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="blue" onClick={onAddState}>
            Add State
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default AddStateModal; 