import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for managing WebSocket connections
 * @param {Object} options - Configuration options
 * @param {Function} options.onMessage - Callback for message events
 * @param {Function} options.onOpen - Callback for connection open events
 * @param {Function} options.onClose - Callback for connection close events
 * @param {Function} options.onError - Callback for error events
 */
const useWebSocket = ({ onMessage, onOpen, onClose, onError }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Create WebSocket connection
  const connect = useCallback((executionId) => {
    if (socket) {
      socket.close();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/execution/${executionId}`;
    
    console.log(`Connecting to WebSocket at ${wsUrl}`);
    const newSocket = new WebSocket(wsUrl);
    
    newSocket.onopen = (event) => {
      console.log('WebSocket connection established');
      setIsConnected(true);
      if (onOpen) onOpen(event);
    };
    
    newSocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('WebSocket message received:', data);
      if (onMessage) onMessage(data);
    };
    
    newSocket.onclose = (event) => {
      console.log('WebSocket connection closed');
      setIsConnected(false);
      if (onClose) onClose(event);
    };
    
    newSocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (onError) onError(error);
    };
    
    setSocket(newSocket);
    return newSocket;
  }, [socket, onMessage, onOpen, onClose, onError]);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (socket) {
      socket.close();
      setSocket(null);
    }
  }, [socket]);

  // Clean up WebSocket on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [socket]);

  return {
    socket,
    isConnected,
    connect,
    disconnect
  };
};

export default useWebSocket; 