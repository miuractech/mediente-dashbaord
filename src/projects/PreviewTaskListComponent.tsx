import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Stack,
  Group,
  Text,
  Card,
  Badge,
  Button,
  Avatar,
  Progress,
  Tooltip,
  ActionIcon,
  Loader,
  Center,
  Alert,
} from '@mantine/core';
import {
  IconPlayerPlay,
  IconCheck,
  IconAlertTriangle,
  IconClock,
  IconUser,
  IconCalendar,
  IconCategory,
} from '@tabler/icons-react';
import { useProjectTasks, useUpdateTask } from './project.hook';
import type { 
  ProjectTaskWithAssignments, 
  TaskFilters, 
  TaskStatusType,
} from './project.typs';

interface PreviewTaskListComponentProps {
  projectId: string;
  onTaskClick?: (taskId: string) => void;
  statusFilter?: TaskStatusType[];
  maxTasks?: number;
}

export function PreviewTaskListComponent({ 
  projectId, 
  onTaskClick, 
  statusFilter,
  maxTasks = 3,
}: PreviewTaskListComponentProps) {
  const { updateTask } = useUpdateTask();

  // Build filters
  const filters = useMemo((): TaskFilters => {
    const finalFilters: TaskFilters = {
      project_id: projectId,
    };

    if (statusFilter && statusFilter.length > 0) {
      finalFilters.status = statusFilter;
    }

    return finalFilters;
  }, [projectId, statusFilter]);

  const { tasks, loading, error } = useProjectTasks(filters);

  // Limit tasks to maxTasks
  const limitedTasks = useMemo(() => {
    return tasks.slice(0, maxTasks);
  }, [tasks, maxTasks]);

  const handleStatusChange = async (taskId: string, newStatus: TaskStatusType) => {
    await updateTask(taskId, { task_status: newStatus });
  };

  const getStatusIcon = (status: TaskStatusType) => {
    switch (status) {
      case 'completed':
        return <IconCheck size={16} color="var(--mantine-color-green-6)" />;
      case 'ongoing':
        return <IconPlayerPlay size={16} color="var(--mantine-color-blue-6)" />;
      case 'escalated':
        return <IconAlertTriangle size={16} color="var(--mantine-color-red-6)" />;
      case 'pending':
      default:
        return <IconClock size={16} color="var(--mantine-color-orange-6)" />;
    }
  };

  const getStatusColor = (status: TaskStatusType) => {
    switch (status) {
      case 'completed':
        return 'green';
      case 'ongoing':
        return 'blue';
      case 'escalated':
        return 'red';
      case 'pending':
      default:
        return 'orange';
    }
  };

  if (loading) {
    return (
      <Center h={100}>
        <Loader size="sm" />
      </Center>
    );
  }

  if (error) {
    return (
      <Alert color="red" variant="light" p="sm">
        <Text size="sm">Failed to load tasks: {error}</Text>
      </Alert>
    );
  }

  if (limitedTasks.length === 0) {
    return (
      <Alert color="blue" variant="light" p="sm">
        <Text size="sm" ta="center">No upcoming tasks available</Text>
      </Alert>
    );
  }

  return (
    <Stack gap="xs">
      {limitedTasks.map((task) => (
        <Card 
          key={task.task_id} 
          withBorder 
          p="sm" 
          style={{ cursor: onTaskClick ? 'pointer' : 'default' }}
          onClick={() => onTaskClick?.(task.task_id)}
        >
          <Group justify="space-between" align="flex-start">
            <Stack gap="xs" flex={1}>
              <Group gap="xs">
                {getStatusIcon(task.task_status)}
                <Text fw={500} size="sm">
                  {task.task_name}
                </Text>
                <Badge 
                  size="xs" 
                  variant="light" 
                  color={getStatusColor(task.task_status)}
                >
                  {task.task_status}
                </Badge>
              </Group>
              
              {task.task_description && (
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {task.task_description}
                </Text>
              )}
              
              <Group gap="md">
                {task.phase_name && (
                  <Group gap={4}>
                    <IconCategory size={12} color="var(--mantine-color-dimmed)" />
                    <Text size="xs" c="dimmed">
                      {task.phase_name}
                    </Text>
                  </Group>
                )}
                
                {task.estimated_days && (
                  <Group gap={4}>
                    <IconCalendar size={12} color="var(--mantine-color-dimmed)" />
                    <Text size="xs" c="dimmed">
                      {task.estimated_days}d
                    </Text>
                  </Group>
                )}
                
                {task.assignments && task.assignments.length > 0 && (
                  <Group gap={4}>
                    <IconUser size={12} color="var(--mantine-color-dimmed)" />
                    <Text size="xs" c="dimmed">
                      {task.assignments.length} assigned
                    </Text>
                  </Group>
                )}
              </Group>
            </Stack>
          </Group>
        </Card>
      ))}
    </Stack>
  );
}
