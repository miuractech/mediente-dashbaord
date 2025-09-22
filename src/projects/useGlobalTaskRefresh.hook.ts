import { useEffect, useCallback } from 'react';

// Global event for task updates
const TASK_UPDATED_EVENT = 'task-updated-global';

// Custom event dispatcher for task updates
export const dispatchTaskUpdate = (projectId: string, taskId: string) => {
  const event = new CustomEvent(TASK_UPDATED_EVENT, {
    detail: { projectId, taskId, timestamp: Date.now() }
  });
  window.dispatchEvent(event);
};

// Hook to listen for global task updates
export function useGlobalTaskRefresh(
  projectId: string | null,
  onTaskUpdate: (taskId?: string) => void
) {
  const handleTaskUpdate = useCallback((event: CustomEvent) => {
    const { projectId: updatedProjectId, taskId } = event.detail;
    
    // Only refresh if the update is for the same project
    if (projectId && updatedProjectId === projectId) {
      onTaskUpdate(taskId);
    }
  }, [projectId, onTaskUpdate]);

  useEffect(() => {
    if (!projectId) return;

    window.addEventListener(TASK_UPDATED_EVENT, handleTaskUpdate as EventListener);

    return () => {
      window.removeEventListener(TASK_UPDATED_EVENT, handleTaskUpdate as EventListener);
    };
  }, [projectId, handleTaskUpdate]);
}

export default useGlobalTaskRefresh;
