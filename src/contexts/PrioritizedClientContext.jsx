import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const PrioritizedClientContext = createContext(null);

export const PrioritizedClientProvider = ({ children }) => {
  const [currentClient, setCurrentClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPrioritized = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getPrioritizedClient();
      setCurrentClient(data.client);
    } catch (err) {
      console.error('Error fetching prioritized client:', err);
      setError(err.message || 'Failed to load prioritized client');
      setCurrentClient(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrioritized();
  }, [fetchPrioritized]);

  const cycleToNext = useCallback(async () => {
    try {
      const data = await api.cyclePrioritizedClient();
      setCurrentClient(data.client);
      setError(null);
      return data.client;
    } catch (err) {
      console.error('Error cycling prioritized client:', err);
      setError(err.message || 'Failed to cycle');
      throw err;
    }
  }, []);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchPrioritized();
  }, [fetchPrioritized]);

  const value = {
    currentClient,
    loading,
    error,
    cycleToNext,
    refresh,
  };

  return (
    <PrioritizedClientContext.Provider value={value}>
      {children}
    </PrioritizedClientContext.Provider>
  );
};

export const usePrioritizedClient = () => {
  const ctx = useContext(PrioritizedClientContext);
  if (!ctx) {
    throw new Error('usePrioritizedClient must be used within PrioritizedClientProvider');
  }
  return ctx;
};
