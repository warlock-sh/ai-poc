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
  Select,
  VStack
} from '@chakra-ui/react';

/**
 * AddTransitionModal - Modal for adding a transition between states
 */
const AddTransitionModal = ({
  isOpen,
  onClose,
  newTransition,
  setNewTransition,
  sourceOutputs,
  targetInputs,
  onAddTransition
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Connect States</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel>Source Output</FormLabel>
              <Select
                value={newTransition.outputId}
                onChange={(e) => setNewTransition({...newTransition, outputId: e.target.value})}
              >
                <option value="">Select output</option>
                {sourceOutputs.map(output => (
                  <option key={output.id} value={output.id}>
                    {output.name}
                  </option>
                ))}
              </Select>
            </FormControl>
            
            <FormControl isRequired>
              <FormLabel>Target Input</FormLabel>
              <Select
                value={newTransition.inputId}
                onChange={(e) => setNewTransition({...newTransition, inputId: e.target.value})}
              >
                <option value="">Select input</option>
                {targetInputs.map(input => (
                  <option key={input.id} value={input.id}>
                    {input.name}
                  </option>
                ))}
              </Select>
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button 
            colorScheme="blue" 
            onClick={onAddTransition}
            isDisabled={!newTransition.outputId || !newTransition.inputId}
          >
            Add Connection
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default AddTransitionModal; 