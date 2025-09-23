import { useState, useMemo, useCallback } from 'react';
import {
  Stack,
  Group,
  Text,
  Card,
  Badge,
  Button,
  Select,
  TextInput,
  Loader,
  Center,
  Alert,
  Avatar,
  Progress,
  Tooltip,
  ActionIcon,
  Paper,
  Pagination,
} from '@mantine/core';
import {
  IconPlayerPlay,
  IconCheck,
  IconAlertTriangle,
  IconClock,
  IconUser,
  IconCalendar,
  IconCategory,
  IconSearch,
  IconFilter,
  IconRefresh,
  IconRestore,
} from '@tabler/icons-react';
import { useDebouncedValue } from '@mantine/hooks';
import {
  usePaginatedProjectTasks,
  useUpdateTask,
} from './project.hook';
import type { 
  ProjectTaskWithAssignments, 
  TaskFilters, 
  TaskStatusType,
} from './project.typs';
import { CustomTaskFormDrawer } from './CustomTaskFormDrawer';
import { TaskEditModal } from './TaskEditModal';
import { useAutoRefresh } from './useAutoRefresh.hook';
import { useGlobalTaskRefresh } from './useGlobalTaskRefresh.hook';

interface PaginatedTaskListComponentProps {
  projectId: string;
  onTaskClick?: (taskId: string) => void;
  statusFilter?: TaskStatusType[];
  showOnlyCompleted?: boolean;
  showFilters?: boolean;
  showStepInfo?: boolean;
}

export function PaginatedTaskListComponent({ 
  projectId, 
  onTaskClick, 
  statusFilter, 
  showOnlyCompleted,
  showFilters = false,
  showStepInfo = false,
}: PaginatedTaskListComponentProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [localStatusFilter, setLocalStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebouncedValue(searchTerm, 300);
  const pageSize = 20;

  const { updateTask } = useUpdateTask();

  // Build filters based on props and local state
  const filters = useMemo((): TaskFilters => {
    const finalFilters: TaskFilters = {
      project_id: projectId,
    };

    // Handle status filtering from props or local state
    if (showOnlyCompleted) {
      finalFilters.status = ['completed' as TaskStatusType];
    } else if (statusFilter && statusFilter.length > 0) {
      finalFilters.status = statusFilter;
    } else if (localStatusFilter && localStatusFilter !== '') {
      finalFilters.status = [localStatusFilter as TaskStatusType];
    }

    // Add search filter
    if (debouncedSearchTerm) {
      finalFilters.search = debouncedSearchTerm;
    }

    return finalFilters;
  }, [projectId, statusFilter, showOnlyCompleted, localStatusFilter, debouncedSearchTerm]);

  const { 
    tasks, 
    loading, 
    error, 
    refetch,
    totalCount,
    totalPages,
  } = usePaginatedProjectTasks(filters, currentPage, pageSize);

  // Manual refresh handler (visible refresh)
  const handleManualRefresh = useCallback(() => {
    refetch(false); // Show loading for manual refresh
  }, [refetch]);

  // Silent refresh handler (for auto-refresh and global updates)
  const handleSilentRefresh = useCallback(() => {
    refetch(true); // Silent refresh without loading indicator
  }, [refetch]);

  // Set up auto-refresh every 2 minutes when window is active
  const { isActive, isWindowActive } = useAutoRefresh({
    enabled: true,
    interval: 120000, // 2 minutes
    onRefresh: handleSilentRefresh, // Use silent refresh for auto-refresh
  });

  // Listen for global task updates to refresh all tabs
  useGlobalTaskRefresh(projectId, () => handleSilentRefresh()); // Use silent refresh for global updates

  // Note: Step completion is now handled globally in ProjectDetail


  const [customTaskDrawerOpened, setCustomTaskDrawerOpened] = useState(false);
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ProjectTaskWithAssignments | null>(null);

  const handleCreateCustomTask = () => {
    setCustomTaskDrawerOpened(true);
  };

  const handleCustomTaskSuccess = () => {
    refetch();
  };


  const handleEditSuccess = () => {
    refetch();
    setSelectedTask(null);
    setEditModalOpened(false);
  };

  const handleStatusQuickChange = async (taskId: string, newStatus: TaskStatusType) => {
    await updateTask(taskId, { task_status: newStatus });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getStatusIcon = (status: TaskStatusType) => {
    switch (status) {
      case 'completed':
        return <IconCheck size={16} color="green" />;
      case 'ongoing':
        return <IconPlayerPlay size={16} color="blue" />;
      case 'escalated':
        return <IconAlertTriangle size={16} color="red" />;
      default:
        return <IconClock size={16} color="gray" />;
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
      default:
        return 'gray';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleString();
  };

  const isOverdue = (deadline: string | null, status: TaskStatusType) => {
    if (!deadline || status === 'completed') return false;
    return new Date(deadline) < new Date();
  };

  if (error) {
    return (
      <Alert color="red" title="Error">
        Failed to load project tasks. Please try again.
      </Alert>
    );
  }

  // Get current step info
  const currentStepInfo = tasks.length > 0 ? {
    phase_name: tasks[0].phase_name,
    phase_order: tasks[0].phase_order,
    step_name: tasks[0].step_name,
    step_order: tasks[0].step_order,
  } : null;

  const completedTasks = tasks.filter(t => t.task_status === 'completed');
  const progressPercentage = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  return (
    <Stack gap="md">
      {/* Current Step Header */}
      {showStepInfo && currentStepInfo && (
        <Paper withBorder p="md">
          <Group justify="space-between" mb="md">
            <div>
              <Text size="lg" fw={600}>
                Phase {currentStepInfo.phase_order}: {currentStepInfo.phase_name}
              </Text>
              <Text size="md" c="dimmed">
                Step {currentStepInfo.step_order}: {currentStepInfo.step_name}
              </Text>
            </div>
            
            <Group gap="xs">
              <Tooltip label={`Auto-refresh ${isActive ? 'active' : 'paused'} (${isWindowActive ? 'window active' : 'window inactive'})`}>
                <ActionIcon
                  variant="light"
                  onClick={handleManualRefresh}
                  loading={loading}
                  color={isActive ? 'blue' : 'gray'}
                  size="sm"
                >
                  <IconRefresh size={14} />
                </ActionIcon>
              </Tooltip>
              
              <Button
                variant="light"
                leftSection={<IconCategory size={16} />}
                onClick={handleCreateCustomTask}
                loading={false}
                size="sm"
              >
                Add Custom Task
              </Button>
            </Group>
          </Group>

          <Group justify="space-between" mb="sm">
            <Text size="sm" fw={500}>Progress</Text>
            <Text size="sm" fw={500}>
              {completedTasks.length} of {tasks.length} tasks completed
            </Text>
          </Group>
          
          <Progress
            value={progressPercentage}
            size="lg"
            color={progressPercentage === 100 ? 'green' : 'blue'}
          />
        </Paper>
      )}

      {/* Filters - only show if not controlled by parent */}
      {showFilters && (
        <Card withBorder p="md">
          <Group gap="md">
            <TextInput
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftSection={<IconSearch size={16} />}
              style={{ flex: 1 }}
            />
            
            <Select
              placeholder="Filter by status"
              value={localStatusFilter}
              onChange={(value) => setLocalStatusFilter(value || '')}
              data={[
                { value: '', label: 'All Statuses' },
                { value: 'pending', label: 'Pending' },
                { value: 'ongoing', label: 'Ongoing' },
                { value: 'completed', label: 'Completed' },
                { value: 'escalated', label: 'Escalated' },
              ]}
              leftSection={<IconFilter size={16} />}
              clearable
              w={150}
            />
          </Group>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Center h={200}>
          <Loader size="lg" />
        </Center>
      )}

      {/* Tasks List */}
      {!loading && tasks.length === 0 ? (
        <Center h={200}>
          <Text c="dimmed">{showOnlyCompleted ? 'No completed tasks found' : 'No tasks found'}</Text>
        </Center>
      ) : !loading && (
        <Stack gap="sm">
          {tasks.map((task) => (
            <Card 
              key={task.project_task_id} 
              withBorder 
              p="md"
            >
              <Group justify="space-between" align="flex-start" onClick={() => onTaskClick?.(task.project_task_id)} style={{ cursor: 'pointer', flex: 1 }}>
                <div style={{ flex: 1 }}>
                  {/* Task Header */}
                  <Group gap="sm" mb="sm">
                    {getStatusIcon(task.task_status)}
                    
                    <Text fw={500} size="md" style={{ flex: 1 }}>
                      {task.task_name}
                    </Text>
                    
                    <Group gap="xs">
                      <Badge
                        color={getStatusColor(task.task_status)}
                        variant="light"
                        size="sm"
                      >
                        {task.task_status}
                      </Badge>
                      
                      {task.is_custom && (
                        <Badge variant="outline" size="sm" color="blue">
                          Custom
                        </Badge>
                      )}
                      
                      {task.category && (
                        <Badge variant="outline" size="sm">
                          {task.category}
                        </Badge>
                      )}
                    </Group>
                  </Group>

                  {/* Task Description */}
                  {task.task_description && (
                    <Text size="sm" c="dimmed" mb="sm">
                      {task.task_description}
                    </Text>
                  )}

                  {/* Task Details */}
                  <Group gap="md" mb="sm">
                    {/* Estimated Days */}
                    {task.estimated_days && (
                      <Group gap="xs">
                        <IconClock size={14} color="gray" />
                        <Text size="xs" c="dimmed">
                          {task.estimated_days}d estimated
                        </Text>
                      </Group>
                    )}

                    {/* Deadline */}
                    {task.deadline && (
                      <Group gap="xs">
                        <IconCalendar size={14} color={isOverdue(task.deadline, task.task_status) ? 'red' : 'gray'} />
                        <Text 
                          size="xs" 
                          c={isOverdue(task.deadline, task.task_status) ? 'red' : 'dimmed'}
                          fw={isOverdue(task.deadline, task.task_status) ? 500 : 400}
                        >
                          Due: {formatDateTime(task.deadline)}
                          {isOverdue(task.deadline, task.task_status) && ' (Overdue)'}
                        </Text>
                      </Group>
                    )}

                    {/* Started/Completed Times */}
                    {task.started_at && (
                      <Text size="xs" c="dimmed">
                        Started: {formatDate(task.started_at)}
                      </Text>
                    )}
                    
                    {task.completed_at && (
                      <Text size="xs" c="green">
                        Completed: {formatDate(task.completed_at)}
                      </Text>
                    )}
                  </Group>

                  {/* Assigned Crew */}
                  {task.assigned_crew.length > 0 && (
                    <Group gap="xs" mb="sm">
                      <Text size="xs" c="dimmed">Assigned to:</Text>
                      <Group gap={4}>
                        {task.assigned_crew.slice(0, 3).map((crew, index) => (
                          <Tooltip key={index} label={`${crew.crew_name} (${crew.role_name})`}>
                            <Avatar size="xs" radius="xl">
                              <IconUser size={10} />
                            </Avatar>
                          </Tooltip>
                        ))}
                        {task.assigned_crew.length > 3 && (
                          <Text size="xs" c="dimmed">
                            +{task.assigned_crew.length - 3} more
                          </Text>
                        )}
                      </Group>
                    </Group>
                  )}

                  {/* Checklist Progress */}
                  {task.checklist_items.length > 0 && (
                    <Group gap="xs" mb="sm">
                      <Text size="xs" c="dimmed">Checklist:</Text>
                      <Text size="xs" c="dimmed">
                        {task.checklist_items.filter(item => item.completed).length} of {task.checklist_items.length} items
                      </Text>
                    </Group>
                  )}
                </div>

                {/* Actions */}
                <Group gap="xs">
                  {/* Quick Status Actions */}
                  <Group gap={2}>
                    {task.task_status === 'pending' && (
                      <Tooltip label="Start Task">
                        <ActionIcon
                          variant="light"
                          size="sm"
                          color="blue"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusQuickChange(task.project_task_id, 'ongoing');
                          }}
                        >
                          <IconPlayerPlay size={14} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                    
                    {task.task_status === 'ongoing' && (
                      <>
                        <Tooltip label="Complete Task">
                          <ActionIcon
                            variant="light"
                            size="sm"
                            color="green"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusQuickChange(task.project_task_id, 'completed');
                            }}
                          >
                            <IconCheck size={14} />
                          </ActionIcon>
                        </Tooltip>
                      </>
                    )}
                    
                    {task.task_status === 'completed' && (
                      <Tooltip label="Reopen Task">
                        <ActionIcon
                          variant="light"
                          size="sm"
                          color="blue"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusQuickChange(task.project_task_id, 'ongoing');
                          }}
                        >
                          <IconRestore size={14} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </Group>

                  {/* <Menu shadow="md" width={220}>
                    <Menu.Target>
                      <ActionIcon variant="subtle" size="sm" onClick={(e) => e.stopPropagation()}>
                        <IconDots size={14} />
                      </ActionIcon>
                    </Menu.Target>

                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={<IconEye size={14} />}
                        onClick={() => onTaskClick?.(task.project_task_id)}
                      >
                        View Details
                      </Menu.Item>
                      
                       <Menu.Item
                        leftSection={<IconEdit size={14} />}
                        onClick={() => {
                          if (onTaskEdit) {
                            onTaskEdit(task);
                          } else {
                            handleEditTask(task);
                          }
                        }}
                      >
                        Edit Task
                      </Menu.Item> 
                      
                      
                      <Menu.Divider />
                      
                      {task.task_status !== 'ongoing' && (
                        <Menu.Item
                          leftSection={<IconPlayerPlay size={14} />}
                          color="blue"
                          onClick={() => handleStatusQuickChange(task.project_task_id, 'ongoing')}
                        >
                          {task.task_status === 'pending' ? 'Start Task' : 'Resume Task'}
                        </Menu.Item>
                      )}
                      
                      {task.task_status !== 'completed' && (
                        <Menu.Item
                          leftSection={<IconCheck size={14} />}
                          color="green"
                          onClick={() => handleStatusQuickChange(task.project_task_id, 'completed')}
                        >
                          Mark Complete
                        </Menu.Item>
                      )}
                      
                      {task.task_status !== 'escalated' && task.task_status !== 'completed' && (
                        <Menu.Item
                          leftSection={<IconAlertTriangle size={14} />}
                          color="red"
                          onClick={() => handleStatusQuickChange(task.project_task_id, 'escalated')}
                        >
                          Escalate Task
                        </Menu.Item>
                      )}
                    </Menu.Dropdown>
                  </Menu> */}
                </Group>
              </Group>
            </Card>
          ))}
        </Stack>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <Group justify="center" mt="md">
          <Pagination
            value={currentPage}
            onChange={handlePageChange}
            total={totalPages}
            size="sm"
            withEdges
          />
          <Text size="sm" c="dimmed">
            Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalCount)} of {totalCount} tasks
          </Text>
        </Group>
      )}


      {/* Custom Task Form Drawer */}
      <CustomTaskFormDrawer
        opened={customTaskDrawerOpened}
        onClose={() => setCustomTaskDrawerOpened(false)}
        projectId={projectId}
        onSuccess={handleCustomTaskSuccess}
      />

      {/* Task Edit Modal */}
      <TaskEditModal
        opened={editModalOpened}
        onClose={() => {
          setEditModalOpened(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
        onSuccess={handleEditSuccess}
      />
    </Stack>
  );
}
