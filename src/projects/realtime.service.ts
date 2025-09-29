import supabase from '../supabase';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { ProjectTaskWithAssignments, ProjectWithStats } from './project.typs';

export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface RealtimeTaskEvent {
  eventType: RealtimeEventType;
  new: ProjectTaskWithAssignments;
  old: ProjectTaskWithAssignments;
}

export interface RealtimeProjectEvent {
  eventType: RealtimeEventType;
  new: ProjectWithStats;
  old: ProjectWithStats;
}

type DatabasePayload = RealtimePostgresChangesPayload<Record<string, unknown>>;

class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();

  subscribeToProjectTasks(
    projectId: string,
    onTaskChange: (event: RealtimeTaskEvent) => void,
    onError?: (error: string) => void
  ): () => void {
    const channelName = `project_tasks_${projectId}`;
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_tasks',
          filter: `project_id=eq.${projectId}`,
        },
        async (payload: DatabasePayload) => {
          try {
            const taskId = (payload.new as Record<string, unknown>)?.project_task_id || (payload.old as Record<string, unknown>)?.project_task_id;
            if (!taskId) return;

            let fullTask: ProjectTaskWithAssignments | null = null;

            if (payload.eventType !== 'DELETE') {
              const { data, error } = await supabase
                .from('project_tasks_with_assignments')
                .select('*')
                .eq('project_task_id', taskId)
                .single();

              if (!error && data) {
                fullTask = data;
              }
            }

            onTaskChange({
              eventType: payload.eventType as RealtimeEventType,
              new: fullTask || (payload.new as ProjectTaskWithAssignments),
              old: payload.old as ProjectTaskWithAssignments,
            });
          } catch (error) {
            console.error('Error processing task change:', error);
            onError?.(error instanceof Error ? error.message : 'Unknown error');
          }
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return () => this.unsubscribe(channelName);
  }

  subscribeToTaskAssignments(
    projectId: string,
    onAssignmentChange: () => void,
    onError?: (error: string) => void
  ): () => void {
    const channelName = `task_assignments_${projectId}`;
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_task_assignments',
        },
        () => {
          try {
            onAssignmentChange();
          } catch (error) {
            console.error('Error processing assignment change:', error);
            onError?.(error instanceof Error ? error.message : 'Unknown error');
          }
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return () => this.unsubscribe(channelName);
  }

  subscribeToProject(
    projectId: string,
    onProjectChange: (event: RealtimeProjectEvent) => void,
    onError?: (error: string) => void
  ): () => void {
    const channelName = `project_${projectId}`;
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `project_id=eq.${projectId}`,
        },
        async (payload: DatabasePayload) => {
          try {
            let fullProject: ProjectWithStats | null = null;

            if (payload.eventType !== 'DELETE') {
              const { data, error } = await supabase
                .from('projects_with_stats')
                .select('*')
                .eq('project_id', projectId)
                .single();

              if (!error && data) {
                fullProject = data;
              }
            }

            onProjectChange({
              eventType: payload.eventType as RealtimeEventType,
              new: fullProject || (payload.new as ProjectWithStats),
              old: payload.old as ProjectWithStats,
            });
          } catch (error) {
            console.error('Error processing project change:', error);
            onError?.(error instanceof Error ? error.message : 'Unknown error');
          }
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return () => this.unsubscribe(channelName);
  }

  subscribeToProjectCrewAssignments(
    projectId: string,
    onCrewAssignmentChange: () => void,
    onError?: (error: string) => void
  ): () => void {
    const channelName = `crew_assignments_${projectId}`;
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_crew_assignments',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          try {
            onCrewAssignmentChange();
          } catch (error) {
            console.error('Error processing crew assignment change:', error);
            onError?.(error instanceof Error ? error.message : 'Unknown error');
          }
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return () => this.unsubscribe(channelName);
  }

  unsubscribe(channelName: string): void {
    const channel = this.channels.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
    }
  }

  unsubscribeAll(): void {
    for (const [channelName] of this.channels) {
      this.unsubscribe(channelName);
    }
  }

  getActiveSubscriptions(): string[] {
    return Array.from(this.channels.keys());
  }

  isSubscribed(channelName: string): boolean {
    return this.channels.has(channelName);
  }

  getSubscriptionCount(): number {
    return this.channels.size;
  }

  cleanupAllSubscriptions(): void {
    this.unsubscribeAll();
    
  }
}

export const realtimeService = new RealtimeService();
export default realtimeService;
