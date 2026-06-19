import { useState, useEffect, useRef, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const WS_URL = API_BASE.replace(/^http/, 'ws');
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff

export function useWebSocket(userId, username, color) {
  const wsRef = useRef(null);
  const [status, setStatus] = useState('disconnected'); // 'connecting' | 'connected' | 'disconnected'
  const [onlineCount, setOnlineCount] = useState(0);
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef(null);
  const listenersRef = useRef(new Map());

  // Register event listener
  const on = useCallback((type, handler) => {
    if (!listenersRef.current.has(type)) {
      listenersRef.current.set(type, new Set());
    }
    listenersRef.current.get(type).add(handler);

    return () => {
      listenersRef.current.get(type)?.delete(handler);
    };
  }, []);

  // Send message
  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  // Emit to listeners
  const emit = useCallback((type, data) => {
    listenersRef.current.get(type)?.forEach((handler) => {
      try {
        handler(data);
      } catch (err) {
        console.error(`Error in WS handler for ${type}:`, err);
      }
    });
  }, []);

  // Connect
  const connect = useCallback(() => {
    if (!userId) return;

    // Clean up existing
    if (wsRef.current) {
      wsRef.current.close();
    }

    setStatus('connecting');
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      reconnectAttempt.current = 0;

      // Register with server
      ws.send(JSON.stringify({
        type: 'register',
        userId,
        username,
        color,
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case 'user_count':
            setOnlineCount(msg.count);
            break;
          case 'tile_update':
            emit('tile_update', msg.tile);
            break;
          case 'leaderboard_update':
            emit('leaderboard_update', msg.leaderboard);
            break;
          case 'error':
            emit('error', msg);
            break;
          case 'registered':
            emit('registered', msg);
            break;
          default:
            break;
        }
      } catch {
        // Ignore invalid messages
      }
    };

    ws.onclose = () => {
      setStatus('disconnected');
      wsRef.current = null;

      // Reconnect with backoff
      const delay = RECONNECT_DELAYS[Math.min(reconnectAttempt.current, RECONNECT_DELAYS.length - 1)];
      reconnectAttempt.current += 1;

      reconnectTimer.current = setTimeout(() => {
        connect();
      }, delay);
    };

    ws.onerror = () => {
      // onclose will fire after this
    };
  }, [userId, username, color, emit]);

  // Connect on mount / user change
  useEffect(() => {
    if (userId) {
      connect();
    }

    return () => {
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [userId, connect]);

  return {
    status,
    onlineCount,
    send,
    on,
  };
}
