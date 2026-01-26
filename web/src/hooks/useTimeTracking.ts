import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Task } from '@veritas-kanban/shared';

const API_BASE = '/api';

export interface TimeSummary {
  byProject: { project: string; totalSeconds: number; taskCount: number }[];
  total: number;
}

/**
 * Get time summary by project
 */
export function useTimeSummary() {
  return useQuery<TimeSummary>({
    queryKey: ['time', 'summary'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/tasks/time/summary`);
      if (!response.ok) {
        throw new Error('Failed to get time summary');
      }
      return response.json();
    },
  });
}

/**
 * Start timer for a task
 */
export function useStartTimer() {
  const queryClient = useQueryClient();

  return useMutation<Task, Error, string>({
    mutationFn: async (taskId) => {
      const response = await fetch(`${API_BASE}/tasks/${taskId}/time/start`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start timer');
      }
      
      return response.json();
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.setQueryData(['tasks', task.id], task);
      queryClient.invalidateQueries({ queryKey: ['time', 'summary'] });
    },
  });
}

/**
 * Stop timer for a task
 */
export function useStopTimer() {
  const queryClient = useQueryClient();

  return useMutation<Task, Error, string>({
    mutationFn: async (taskId) => {
      const response = await fetch(`${API_BASE}/tasks/${taskId}/time/stop`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to stop timer');
      }
      
      return response.json();
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.setQueryData(['tasks', task.id], task);
      queryClient.invalidateQueries({ queryKey: ['time', 'summary'] });
    },
  });
}

/**
 * Add manual time entry
 */
export function useAddTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation<Task, Error, { taskId: string; duration: number; description?: string }>({
    mutationFn: async ({ taskId, duration, description }) => {
      const response = await fetch(`${API_BASE}/tasks/${taskId}/time/entry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration, description }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add time entry');
      }
      
      return response.json();
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.setQueryData(['tasks', task.id], task);
      queryClient.invalidateQueries({ queryKey: ['time', 'summary'] });
    },
  });
}

/**
 * Delete a time entry
 */
export function useDeleteTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation<Task, Error, { taskId: string; entryId: string }>({
    mutationFn: async ({ taskId, entryId }) => {
      const response = await fetch(`${API_BASE}/tasks/${taskId}/time/entry/${entryId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete time entry');
      }
      
      return response.json();
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.setQueryData(['tasks', task.id], task);
      queryClient.invalidateQueries({ queryKey: ['time', 'summary'] });
    },
  });
}

/**
 * Format seconds to human readable duration
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  
  if (minutes > 0 && secs > 0) {
    return `${minutes}m ${secs}s`;
  }
  
  return `${minutes}m`;
}

/**
 * Parse duration string to seconds (e.g., "1h 30m" or "45m" or "30")
 */
export function parseDuration(input: string): number | null {
  const trimmed = input.trim().toLowerCase();
  
  // Try parsing as plain number (minutes)
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10) * 60;
  }
  
  // Try parsing with units
  let totalSeconds = 0;
  
  const hourMatch = trimmed.match(/(\d+)\s*h/);
  if (hourMatch) {
    totalSeconds += parseInt(hourMatch[1], 10) * 3600;
  }
  
  const minMatch = trimmed.match(/(\d+)\s*m/);
  if (minMatch) {
    totalSeconds += parseInt(minMatch[1], 10) * 60;
  }
  
  const secMatch = trimmed.match(/(\d+)\s*s/);
  if (secMatch) {
    totalSeconds += parseInt(secMatch[1], 10);
  }
  
  return totalSeconds > 0 ? totalSeconds : null;
}
