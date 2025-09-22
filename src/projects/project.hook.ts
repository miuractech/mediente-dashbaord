import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../auth/useAuth';
import { projectService } from './project.service';
import { realtimeService, type RealtimeTaskEvent, type RealtimeProjectEvent } from './realtime.service';
import { dispatchTaskUpdate } from './useGlobalTaskRefresh.hook';
import type {
  Project,
  ProjectWithStats,
  ProjectTask,
  ProjectTaskWithAssignments,
  ProjectRole,
  ProjectCrewAssignmentWithDetails,
  CreateProjectInput,
  UpdateProjectInput,
  CreateCustomTaskInput,
  UpdateTaskInput,
  AssignCrewInput,
  AssignTaskCrewInput,
  ProjectFilters,
  TaskFilters,
  TemplateOption,
  CrewMember,
  ProjectStatistics,
} from './project.typs';

// =====================================================
// PROJECT HOOKS
// =====================================================

export function useProjects(filters?: ProjectFilters) {
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize filters to prevent infinite re-renders
  const memoizedFilters = useMemo(() => filters, [
    filters,
  ]);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await projectService.getProjects(memoizedFilters);
      setProjects(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch projects';
      setError(message);
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, [memoizedFilters]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const refetch = useCallback(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    loading,
    error,
    refetch,
  };
}

export function useProject(projectId: string | null, enableRealtime = true) {
  const [project, setProject] = useState<ProjectWithStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const fetchProject = useCallback(async (silent = false) => {
    if (!projectId) {
      setProject(null);
      return;
    }

    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);
      const data = await projectService.getProjectWithStats(projectId);
      setProject(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch project';
      setError(message);
      if (!silent) {
        notifications.show({
          title: 'Error',
          message,
          color: 'red',
        });
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [projectId]);

  // Set up real-time subscription
  useEffect(() => {
    if (!projectId || !enableRealtime) return;

    const handleProjectChange = (event: RealtimeProjectEvent) => {
      if (event.eventType === 'UPDATE' && event.new) {
        setProject(event.new);
      } else if (event.eventType === 'DELETE') {
        setProject(null);
      }
    };

    const handleError = (error: string) => {
      console.error('Real-time project subscription error:', error);
    };

    unsubscribeRef.current = realtimeService.subscribeToProject(
      projectId,
      handleProjectChange,
      handleError
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [projectId, enableRealtime]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const refetch = useCallback((silent = false) => {
    fetchProject(silent);
  }, [fetchProject]);

  return {
    project,
    loading,
    error,
    refetch,
  };
}

// =====================================================
// DASHBOARD ANALYTICS HOOKS
// =====================================================

export function useDashboardAnalytics() {
  const [analytics, setAnalytics] = useState<ProjectStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);
      const data = await projectService.getDashboardAnalytics();
      setAnalytics(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch dashboard analytics';
      setError(message);
      if (!silent) {
        notifications.show({
          title: 'Error',
          message,
          color: 'red',
        });
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const refetch = useCallback((silent = false) => {
    fetchAnalytics(silent);
  }, [fetchAnalytics]);

  return {
    analytics,
    loading,
    error,
    refetch,
  };
}

export function useActiveProjects() {
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);
      const data = await projectService.getActiveProjects();
      setProjects(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch active projects';
      setError(message);
      if (!silent) {
        notifications.show({
          title: 'Error',
          message,
          color: 'red',
        });
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const refetch = useCallback((silent = false) => {
    fetchProjects(silent);
  }, [fetchProjects]);

  return {
    projects,
    loading,
    error,
    refetch,
  };
}

export function useProjectEscalatedTasks(projectId: string | null) {
  const [tasks, setTasks] = useState<ProjectTaskWithAssignments[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async (silent = false) => {
    if (!projectId) {
      setTasks([]);
      return;
    }

    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);
      const data = await projectService.getProjectEscalatedTasks(projectId);
      setTasks(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch escalated tasks';
      setError(message);
      if (!silent) {
        notifications.show({
          title: 'Error',
          message,
          color: 'red',
        });
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [projectId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const refetch = useCallback((silent = false) => {
    fetchTasks(silent);
  }, [fetchTasks]);

  return {
    tasks,
    loading,
    error,
    refetch,
  };
}

export function useProjectPhaseProgress(projectId: string | null) {
  const [phases, setPhases] = useState<Array<{
    phase_name: string;
    phase_order: number;
    total_tasks: number;
    completed_tasks: number;
    ongoing_tasks: number;
    pending_tasks: number;
    escalated_tasks: number;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPhases = useCallback(async (silent = false) => {
    if (!projectId) {
      setPhases([]);
      return;
    }

    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);
      const data = await projectService.getProjectPhaseProgress(projectId);
      setPhases(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch phase progress';
      setError(message);
      if (!silent) {
        notifications.show({
          title: 'Error',
          message,
          color: 'red',
        });
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [projectId]);

  useEffect(() => {
    fetchPhases();
  }, [fetchPhases]);

  const refetch = useCallback((silent = false) => {
    fetchPhases(silent);
  }, [fetchPhases]);

  return {
    phases,
    loading,
    error,
    refetch,
  };
}

export function useCreateProject() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const createProject = useCallback(async (input: CreateProjectInput): Promise<Project | null> => {
    if (!user?.email) {
      notifications.show({
        title: 'Error',
        message: 'User not authenticated',
        color: 'red',
      });
      return null;
    }

    try {
      setLoading(true);
      const project = await projectService.createProject(input, user.email);
      notifications.show({
        title: 'Success',
        message: 'Project created successfully',
        color: 'green',
      });
      return project;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create project';
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  return {
    createProject,
    loading,
  };
}

export function useUpdateProject() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const updateProject = useCallback(async (
    projectId: string,
    input: UpdateProjectInput
  ): Promise<Project | null> => {
    if (!user?.email) {
      notifications.show({
        title: 'Error',
        message: 'User not authenticated',
        color: 'red',
      });
      return null;
    }

    try {
      setLoading(true);
      const project = await projectService.updateProject(projectId, input, user.email);
      notifications.show({
        title: 'Success',
        message: 'Project updated successfully',
        color: 'green',
      });
      return project;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update project';
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  return {
    updateProject,
    loading,
  };
}

export function useArchiveProject() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const archiveProject = useCallback(async (projectId: string): Promise<boolean> => {
    if (!user?.email) {
      notifications.show({
        title: 'Error',
        message: 'User not authenticated',
        color: 'red',
      });
      return false;
    }

    try {
      setLoading(true);
      await projectService.archiveProject(projectId, user.email);
      notifications.show({
        title: 'Success',
        message: 'Project archived successfully',
        color: 'green',
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to archive project';
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  return {
    archiveProject,
    loading,
  };
}

// =====================================================
// PROJECT ROLE AND CREW HOOKS
// =====================================================

export function useProjectRoles(projectId: string | null) {
  const [roles, setRoles] = useState<ProjectRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    if (!projectId) {
      setRoles([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await projectService.getProjectRoles(projectId);
      setRoles(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch project roles';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const refetch = useCallback(() => {
    fetchRoles();
  }, [fetchRoles]);

  return {
    roles,
    loading,
    error,
    refetch,
  };
}

export function useProjectCrewAssignments(projectId: string | null, enableRealtime = true) {
  const [assignments, setAssignments] = useState<ProjectCrewAssignmentWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const fetchAssignments = useCallback(async () => {
    if (!projectId) {
      setAssignments([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await projectService.getProjectCrewAssignments(projectId);
      setAssignments(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch crew assignments';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Set up real-time subscription for crew assignments
  useEffect(() => {
    if (!projectId || !enableRealtime) return;

    const handleCrewAssignmentChange = () => {
      fetchAssignments();
    };

    const handleError = (error: string) => {
      console.error('Real-time crew assignment subscription error:', error);
    };

    unsubscribeRef.current = realtimeService.subscribeToProjectCrewAssignments(
      projectId,
      handleCrewAssignmentChange,
      handleError
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [projectId, enableRealtime, fetchAssignments]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const refetch = useCallback(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  return {
    assignments,
    loading,
    error,
    refetch,
  };
}

export function useAssignCrewToRole() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const assignCrew = useCallback(async (input: AssignCrewInput): Promise<boolean> => {
    if (!user?.email) {
      notifications.show({
        title: 'Error',
        message: 'User not authenticated',
        color: 'red',
      });
      return false;
    }

    try {
      setLoading(true);
      await projectService.assignCrewToRole(input, user.email);
      notifications.show({
        title: 'Success',
        message: 'Crew assigned to role successfully',
        color: 'green',
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to assign crew to role';
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  return {
    assignCrew,
    loading,
  };
}

export function useRemoveCrewFromProject() {
  const [loading, setLoading] = useState(false);

  const removeCrew = useCallback(async (assignmentId: string): Promise<boolean> => {
    try {
      setLoading(true);
      await projectService.removeCrewFromProject(assignmentId);
      notifications.show({
        title: 'Success',
        message: 'Crew removed from project successfully',
        color: 'green',
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove crew from project';
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    removeCrew,
    loading,
  };
}

// =====================================================
// TASK HOOKS
// =====================================================

export function useProjectTasks(filters: TaskFilters, enableRealtime = true) {
  const [tasks, setTasks] = useState<ProjectTaskWithAssignments[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeTasksRef = useRef<(() => void) | null>(null);
  const unsubscribeAssignmentsRef = useRef<(() => void) | null>(null);

  // Memoize filters to prevent infinite re-renders
  const memoizedFilters = useMemo(() => filters, [
    filters,
  ]);

  const fetchTasks = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);
      const data = await projectService.getProjectTasks(memoizedFilters);
      setTasks(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch project tasks';
      setError(message);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [memoizedFilters]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!filters.project_id || !enableRealtime) return;

    const handleTaskChange = (event: RealtimeTaskEvent) => {
      setTasks(prevTasks => {
        const taskId = event.new?.project_task_id || event.old?.project_task_id;
        
        if (event.eventType === 'INSERT' && event.new) {
          // Add new task if it matches current filters
          return [...prevTasks, event.new];
        } else if (event.eventType === 'UPDATE' && event.new) {
          // Update existing task
          return prevTasks.map(task => 
            task.project_task_id === taskId ? event.new : task
          );
        } else if (event.eventType === 'DELETE') {
          // Remove deleted task
          return prevTasks.filter(task => task.project_task_id !== taskId);
        }
        
        return prevTasks;
      });
    };

    const handleAssignmentChange = () => {
      // Refetch tasks when assignments change to get updated assignment data
      fetchTasks(true); // Silent refresh for real-time updates
    };

    const handleError = (error: string) => {
      console.error('Real-time task subscription error:', error);
    };

    // Subscribe to task changes
    unsubscribeTasksRef.current = realtimeService.subscribeToProjectTasks(
      filters.project_id,
      handleTaskChange,
      handleError
    );

    // Subscribe to assignment changes
    unsubscribeAssignmentsRef.current = realtimeService.subscribeToTaskAssignments(
      filters.project_id,
      handleAssignmentChange,
      handleError
    );

    return () => {
      if (unsubscribeTasksRef.current) {
        unsubscribeTasksRef.current();
        unsubscribeTasksRef.current = null;
      }
      if (unsubscribeAssignmentsRef.current) {
        unsubscribeAssignmentsRef.current();
        unsubscribeAssignmentsRef.current = null;
      }
    };
  }, [filters.project_id, enableRealtime, fetchTasks]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const refetch = useCallback((silent = false) => {
    fetchTasks(silent);
  }, [fetchTasks]);

  return {
    tasks,
    loading,
    error,
    refetch,
  };
}

// New paginated task hook for tab filtering
export function usePaginatedProjectTasks(
  filters: TaskFilters,
  page = 1,
  limit = 20,
  enableRealtime = true
) {
  const [tasks, setTasks] = useState<ProjectTaskWithAssignments[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  const unsubscribeTasksRef = useRef<(() => void) | null>(null);
  const unsubscribeAssignmentsRef = useRef<(() => void) | null>(null);

  // Memoize filters to prevent infinite re-renders
  const memoizedFilters = useMemo(() => ({ ...filters, page, limit }), [
    filters,
    page,
    limit,
  ]);

  const fetchTasks = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);
      const data = await projectService.getPaginatedProjectTasks(memoizedFilters, page, limit);
      setTasks(data.tasks);
      setTotalCount(data.totalCount);
      setHasNextPage(data.hasNextPage);
      setHasPrevPage(page > 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch project tasks';
      setError(message);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [memoizedFilters, page, limit]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!filters.project_id || !enableRealtime) return;

    const handleTaskChange = () => {
      // For paginated results, we refetch to maintain consistency
      fetchTasks(true); // Silent refresh for real-time updates
    };

    const handleAssignmentChange = () => {
      fetchTasks(true); // Silent refresh for real-time updates
    };

    const handleError = (error: string) => {
      console.error('Real-time task subscription error:', error);
    };

    // Subscribe to task changes
    unsubscribeTasksRef.current = realtimeService.subscribeToProjectTasks(
      filters.project_id,
      handleTaskChange,
      handleError
    );

    // Subscribe to assignment changes
    unsubscribeAssignmentsRef.current = realtimeService.subscribeToTaskAssignments(
      filters.project_id,
      handleAssignmentChange,
      handleError
    );

    return () => {
      if (unsubscribeTasksRef.current) {
        unsubscribeTasksRef.current();
        unsubscribeTasksRef.current = null;
      }
      if (unsubscribeAssignmentsRef.current) {
        unsubscribeAssignmentsRef.current();
        unsubscribeAssignmentsRef.current = null;
      }
    };
  }, [filters.project_id, enableRealtime, fetchTasks]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const refetch = useCallback((silent = false) => {
    fetchTasks(silent);
  }, [fetchTasks]);

  const totalPages = Math.ceil(totalCount / limit);

  return {
    tasks,
    loading,
    error,
    refetch,
    totalCount,
    hasNextPage,
    hasPrevPage,
    totalPages,
    currentPage: page,
  };
}

export function useTask(taskId: string | null) {
  const [task, setTask] = useState<ProjectTaskWithAssignments | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTask = useCallback(async () => {
    if (!taskId) {
      setTask(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await projectService.getTaskById(taskId);
      setTask(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch task';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const refetch = useCallback(() => {
    fetchTask();
  }, [fetchTask]);

  return {
    task,
    loading,
    error,
    refetch,
  };
}

export function useUpdateTask() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const updateTask = useCallback(async (
    taskId: string,
    input: UpdateTaskInput
  ): Promise<ProjectTask | null> => {
    if (!user?.email) {
      notifications.show({
        title: 'Error',
        message: 'User not authenticated',
        color: 'red',
      });
      return null;
    }

    try {
      setLoading(true);
      const task = await projectService.updateTask(taskId, input, user.email);
      
      // Dispatch global task update event for cross-tab refresh
      dispatchTaskUpdate(task.project_id, taskId);
      
      // If task was marked as completed, dispatch step completion check
      if (input.task_status === 'completed') {
        // Use a small delay to ensure the task update is reflected in the database
        setTimeout(() => {
          dispatchTaskUpdate(task.project_id, 'step-check');
        }, 100);
      }
      
      notifications.show({
        title: 'Success',
        message: 'Task updated successfully',
        color: 'green',
      });
      return task;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update task';
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  return {
    updateTask,
    loading,
  };
}

export function useCreateCustomTask() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const createCustomTask = useCallback(async (
    projectId: string,
    input: CreateCustomTaskInput
  ): Promise<ProjectTask | null> => {
    if (!user?.email) {
      notifications.show({
        title: 'Error',
        message: 'User not authenticated',
        color: 'red',
      });
      return null;
    }

    try {
      setLoading(true);
      const task = await projectService.createCustomTask(projectId, input, user.email);
      notifications.show({
        title: 'Success',
        message: 'Custom task created successfully',
        color: 'green',
      });
      return task;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create custom task';
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  return {
    createCustomTask,
    loading,
  };
}

export function useAssignCrewToTask() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const assignCrew = useCallback(async (input: AssignTaskCrewInput): Promise<boolean> => {
    if (!user?.email) {
      notifications.show({
        title: 'Error',
        message: 'User not authenticated',
        color: 'red',
      });
      return false;
    }

    try {
      setLoading(true);
      await projectService.assignCrewToTask(input, user.email);
      notifications.show({
        title: 'Success',
        message: 'Crew assigned to task successfully',
        color: 'green',
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to assign crew to task';
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  return {
    assignCrew,
    loading,
  };
}

export function useRemoveCrewFromTask() {
  const [loading, setLoading] = useState(false);

  const removeCrew = useCallback(async (taskId: string, crewId: string): Promise<boolean> => {
    try {
      setLoading(true);
      const success = await projectService.removeCrewFromTask(taskId, crewId);
      if (success) {
        notifications.show({
          title: 'Success',
          message: 'Crew removed from task successfully',
          color: 'green',
        });
      }
      return success;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove crew from task';
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    removeCrew,
    loading,
  };
}

export function useLoadNextStepTasks() {
  const [loading, setLoading] = useState(false);

  const loadNextStep = useCallback(async (projectId: string): Promise<boolean> => {
    try {
      setLoading(true);
      const result = await projectService.loadNextPhaseTasks(projectId);
      if (result) {
        notifications.show({
          title: 'Success',
          message: 'Next step tasks loaded successfully',
          color: 'green',
        });
      } else {
        notifications.show({
          title: 'Info',
          message: 'No more tasks to load or current step not completed',
          color: 'blue',
        });
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load next step tasks';
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loadNextStep,
    loading,
  };
}

// Hook to check if current step is completed and auto-load next step
export function useCurrentStepCompletion(projectId: string | null) {
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoLoadingNext, setAutoLoadingNext] = useState(false);
  const [stepInfo, setStepInfo] = useState<{
    phase_name: string;
    phase_order: number;
    step_name: string;
    step_order: number;
  } | null>(null);

  const checkStepCompletion = useCallback(async () => {
    if (!projectId) {
      setIsCompleted(false);
      setStepInfo(null);
      return;
    }

    try {
      setLoading(true);
      // Get all currently loaded tasks
      const loadedTasks = await projectService.getProjectTasks({
        project_id: projectId,
        is_loaded: true,
      });

      if (loadedTasks.length === 0) {
        setIsCompleted(false);
        setStepInfo(null);
        return;
      }

      // Get step info from first task
      const firstTask = loadedTasks[0];
      const currentStepInfo = {
        phase_name: firstTask.phase_name,
        phase_order: firstTask.phase_order,
        step_name: firstTask.step_name,
        step_order: firstTask.step_order,
      };
      setStepInfo(currentStepInfo);

      // Check if all non-custom loaded tasks are completed
      const nonCustomTasks = loadedTasks.filter(t => !t.is_custom);
      const completed = nonCustomTasks.length > 0 && nonCustomTasks.every(t => t.task_status === 'completed');
      
      // If step just completed and we haven't already auto-loaded, do it now
      if (completed && !isCompleted && !autoLoadingNext) {
        setAutoLoadingNext(true);
        try {
          const success = await projectService.loadNextPhaseTasks(projectId);
          if (success) {
            notifications.show({
              title: 'Step Completed! 🎉',
              message: `Automatically loaded next step tasks. Step "${currentStepInfo.step_name}" completed successfully.`,
              color: 'green',
            });
            // Reset completion state to allow for next step detection
            setIsCompleted(false);
          } else {
            // No more steps available
            notifications.show({
              title: 'Project Phase Complete! 🎉',
              message: 'All tasks in this phase have been completed. Great work!',
              color: 'green',
            });
            setIsCompleted(true);
          }
        } catch (error) {
          console.error('Failed to auto-load next step:', error);
          notifications.show({
            title: 'Auto-progression Failed',
            message: 'Step completed but failed to load next step automatically. Please refresh the page.',
            color: 'orange',
          });
          setIsCompleted(completed);
        } finally {
          setAutoLoadingNext(false);
        }
      } else {
        setIsCompleted(completed);
      }
    } catch (error) {
      console.error('Failed to check step completion:', error);
      setIsCompleted(false);
      setStepInfo(null);
    } finally {
      setLoading(false);
    }
  }, [projectId, isCompleted, autoLoadingNext]);

  useEffect(() => {
    checkStepCompletion();
  }, [checkStepCompletion]);

  const refetch = useCallback(() => {
    checkStepCompletion();
  }, [checkStepCompletion]);

  return {
    isCompleted,
    stepInfo,
    loading: loading || autoLoadingNext,
    autoLoadingNext,
    refetch,
  };
}

// =====================================================
// UTILITY HOOKS
// =====================================================

export function useAvailableTemplates(searchTerm?: string, limit: number = 5) {
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchTemplates = useCallback(async (offset: number = 0, reset: boolean = true) => {
    try {
      setLoading(true);
      setError(null);
      const { templates: data, total: totalCount } = await projectService.getAvailableTemplates(searchTerm, limit, offset);
      
      if (reset) {
        setTemplates(data);
      } else {
        setTemplates(prev => [...prev, ...data]);
      }
      
      setTotal(totalCount);
      setHasMore(offset + data.length < totalCount);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch templates';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, limit]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchTemplates(templates.length, false);
    }
  }, [loading, hasMore, templates.length, fetchTemplates]);

  const refetch = useCallback(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return {
    templates,
    loading,
    error,
    total,
    hasMore,
    loadMore,
    refetch,
  };
}

export function useAvailableCrew(searchTerm?: string, limit?: number) {
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCrew = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await projectService.getAvailableCrew(searchTerm, limit);
      setCrew(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch crew';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, limit]);

  useEffect(() => {
    fetchCrew();
  }, [fetchCrew]);

  const refetch = useCallback(() => {
    fetchCrew();
  }, [fetchCrew]);

  return {
    crew,
    loading,
    error,
    refetch,
  };
}

export function useStartProject() {
  const [loading, setLoading] = useState(false);

  const startProject = useCallback(async (projectId: string): Promise<boolean> => {
    try {
      setLoading(true);
      const result = await projectService.startProject(projectId);
      notifications.show({
        title: 'Success',
        message: 'Project started successfully',
        color: 'green',
      });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start project';
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    startProject,
    loading,
  };
}

// =====================================================
// COMPUTED HOOKS
// =====================================================

export function useProjectProgress(project: ProjectWithStats | null) {
  return useMemo(() => {
    if (!project) return null;

    const totalTasks = project.total_tasks || 0;
    if (totalTasks === 0) return null;

    const completedTasks = project.completed_tasks || 0;
    const ongoingTasks = project.ongoing_tasks || 0;
    const pendingTasks = project.pending_tasks || 0;
    const escalatedTasks = project.escalated_tasks || 0;

    const progressPercentage = Math.round((completedTasks / totalTasks) * 100);

    return {
      totalTasks,
      completedTasks,
      ongoingTasks,
      pendingTasks,
      escalatedTasks,
      progressPercentage,
      isCompleted: progressPercentage === 100,
      hasEscalatedTasks: escalatedTasks > 0,
    };
  }, [project]);
}

export function useProjectCanStart(projectId: string | null) {
  const [canStart, setCanStart] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const checkCanStart = useCallback(async () => {
    if (!projectId) {
      setCanStart(null);
      return;
    }

    try {
      setLoading(true);
      const result = await projectService.canProjectStart(projectId);
      setCanStart(result);
    } catch {
      setCanStart(false);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    checkCanStart();
  }, [checkCanStart]);

  const refetch = useCallback(() => {
    checkCanStart();
  }, [checkCanStart]);

  return {
    canStart,
    loading,
    refetch,
  };
}

// =====================================================
// SEARCH HOOKS
// =====================================================

export function useProjectSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<ProjectWithStats[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      const results = await projectService.searchProjects(term);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedSearch = useMemo(
    () => debounce(search as (...args: unknown[]) => unknown, 300),
    [search]
  );

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);

  return {
    searchTerm,
    setSearchTerm,
    searchResults,
    loading,
  };
}

// =====================================================
// FILE UPLOAD HOOKS
// =====================================================

export function useUploadProjectImage() {
  const [loading, setLoading] = useState(false);

  const uploadImage = useCallback(async (file: File, projectId: string): Promise<string | null> => {
    try {
      setLoading(true);
      const imageUrl = await projectService.uploadProjectImage(file, projectId);
      notifications.show({
        title: 'Success',
        message: 'Project image uploaded successfully',
        color: 'green',
      });
      return imageUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload image';
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    uploadImage,
    loading,
  };
}

export function useUploadTaskFile() {
  const [loading, setLoading] = useState(false);

  const uploadFile = useCallback(async (file: File, taskId: string): Promise<{ id: string; file_url: string; file_name: string; file_size: number; file_type: string; uploaded_at: string } | null> => {
    try {
      setLoading(true);
      const result = await projectService.uploadTaskFile(file, taskId);
      notifications.show({
        title: 'Success',
        message: 'File uploaded successfully',
        color: 'green',
      });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload file';
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadMultipleFiles = useCallback(async (files: File[], taskId: string): Promise<{ id: string; file_url: string; file_name: string; file_size: number; file_type: string; uploaded_at: string }[]> => {
    const results: { id: string; file_url: string; file_name: string; file_size: number; file_type: string; uploaded_at: string }[] = [];
    
    try {
      setLoading(true);
      for (const file of files) {
        const result = await projectService.uploadTaskFile(file, taskId);
        results.push(result);
      }
      
      notifications.show({
        title: 'Success',
        message: `${files.length} file(s) uploaded successfully`,
        color: 'green',
      });
      
      return results;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload files';
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
      });
      return results; // Return partial results
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    uploadFile,
    uploadMultipleFiles,
    loading,
  };
}

export function useDeleteTaskFile() {
  const [loading, setLoading] = useState(false);

  const deleteFile = useCallback(async (fileUrl: string): Promise<boolean> => {
    try {
      setLoading(true);
      await projectService.deleteTaskFile(fileUrl);
      notifications.show({
        title: 'Success',
        message: 'File deleted successfully',
        color: 'green',
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete file';
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    deleteFile,
    loading,
  };
}

// =====================================================
// COMMENT HOOKS
// =====================================================

export function useAddTaskComment() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const addComment = useCallback(async (
    taskId: string, 
    comment: string
  ): Promise<{ id: string; text: string; author: string; created_at: string } | null> => {
    if (!user?.email) {
      notifications.show({
        title: 'Error',
        message: 'User not authenticated',
        color: 'red',
      });
      return null;
    }

    try {
      setLoading(true);
      const result = await projectService.addTaskComment(taskId, comment, user.email, user.email);
      notifications.show({
        title: 'Success',
        message: 'Comment added successfully',
        color: 'green',
      });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add comment';
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    addComment,
    loading,
  };
}

export function useDeleteTaskComment() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const deleteComment = useCallback(async (taskId: string, commentId: string): Promise<boolean> => {
    if (!user?.email) {
      notifications.show({
        title: 'Error',
        message: 'User not authenticated',
        color: 'red',
      });
      return false;
    }

    try {
      setLoading(true);
      await projectService.deleteTaskComment(taskId, commentId, user.email);
      notifications.show({
        title: 'Success',
        message: 'Comment deleted successfully',
        color: 'green',
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete comment';
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    deleteComment,
    loading,
  };
}

// =====================================================
// GLOBAL TASK HOOKS
// =====================================================

export function useAllEscalatedTasks() {
  const [tasks, setTasks] = useState<ProjectTaskWithAssignments[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await projectService.getAllEscalatedTasks();
      setTasks(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch escalated tasks';
      setError(message);
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const refetch = useCallback(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    loading,
    error,
    refetch,
  };
}

export function useAllOverdueTasks() {
  const [tasks, setTasks] = useState<ProjectTaskWithAssignments[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await projectService.getAllOverdueTasks();
      setTasks(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch overdue tasks';
      setError(message);
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const refetch = useCallback(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    loading,
    error,
    refetch,
  };
}

export function useAllPendingTasks() {
  const [tasks, setTasks] = useState<ProjectTaskWithAssignments[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await projectService.getAllPendingTasks();
      setTasks(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch pending tasks';
      setError(message);
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const refetch = useCallback(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    loading,
    error,
    refetch,
  };
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}