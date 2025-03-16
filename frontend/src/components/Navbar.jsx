import React from 'react';
import { Box, Flex, Heading, Button } from '@chakra-ui/react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <Box bg="blue.600" color="white" px={4} py={3}>
      <Flex justify="space-between" align="center" maxW="1200px" mx="auto">
        <Link to="/">
          <Heading size="md">Agentic Pipeline Manager</Heading>
        </Link>
        <Link to="/create">
          <Button colorScheme="whiteAlpha">Create New Pipeline</Button>
        </Link>
      </Flex>
    </Box>
  );
};

export default Navbar; 