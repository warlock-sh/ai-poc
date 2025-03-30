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
  VStack
} from '@chakra-ui/react';

/**
 * ExecutePipelineModal - Modal for executing a pipeline with an initial prompt
 */
const ExecutePipelineModal = ({
  isOpen,
  onClose,
  initialPrompt,
  setInitialPrompt,
  onExecute,
  isExecuting
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Execute Pipeline</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel>Initial Prompt</FormLabel>
              <Input 
                value={initialPrompt}
                onChange={(e) => setInitialPrompt(e.target.value)}
                placeholder="Enter initial prompt"
              />
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose} isDisabled={isExecuting}>
            Cancel
          </Button>
          <Button 
            colorScheme="green" 
            onClick={onExecute}
            isLoading={isExecuting}
          >
            Execute
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ExecutePipelineModal; 