import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  VStack,
  Heading,
  useToast,
  HStack
} from '@chakra-ui/react';
import { Link } from 'react-router-dom';

const PipelineCreator = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Create a new pipeline with empty nodes and edges
      const newPipeline = {
        name,
        description,
        nodes: [],
        edges: []
      };
      
      const response = await fetch('/api/pipelines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPipeline),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create pipeline');
      }
      
      const data = await response.json();
      
      toast({
        title: 'Pipeline created.',
        description: 'Your new pipeline has been created successfully.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Navigate to the pipeline detail page
      navigate(`/pipelines/${data.id}`);
    } catch (error) {
      console.error('Error creating pipeline:', error);
      
      toast({
        title: 'Error creating pipeline.',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box maxW="800px" mx="auto" p={5}>
      <HStack justify="space-between" mb={6}>
        <Heading>Create New Pipeline</Heading>
        <Link to="/">
          <Button variant="outline">Cancel</Button>
        </Link>
      </HStack>
      
      <form onSubmit={handleSubmit}>
        <VStack spacing={4} align="stretch">
          <FormControl isRequired>
            <FormLabel>Pipeline Name</FormLabel>
            <Input 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter pipeline name"
            />
          </FormControl>
          
          <FormControl>
            <FormLabel>Description</FormLabel>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter a description for your pipeline"
              rows={4}
            />
          </FormControl>
          
          <Button 
            mt={4} 
            colorScheme="blue" 
            type="submit"
            isLoading={isSubmitting}
          >
            Create Pipeline
          </Button>
        </VStack>
      </form>
    </Box>
  );
};

export default PipelineCreator; 