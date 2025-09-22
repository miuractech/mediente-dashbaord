import { useState, useMemo } from 'react';
import {
  Stack,
  Group,
  Text,
  Card,
  Badge,
  Select,
  TextInput,
  ActionIcon,
  Loader,
  Center,
  SegmentedControl,
  Tooltip,
  ScrollArea,
} from '@mantine/core';
import {
  IconSearch,
  IconRefresh,
  IconAlertTriangle,
  IconClock,
  IconEye,
  IconPlayerPlay,
  IconCheck,
  IconPlayerPause,
} from '@tabler/icons-react';
import {
  useAllEscalatedTasks,
  useAllOverdueTasks,
  useAllPendingTasks,
  useUpdateTask,
} from './project.hook';
import type { TaskStatusType } from './project.typs';
import { TaskDrawer } from './TaskDrawer';

type TaskViewType = 'escalated' | 'overdue' | 'pending';

export function SimpleTaskOverview() {
  const [activeView, setActiveView] = useState<TaskViewType>('escalated');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskDrawerOpened, setTaskDrawerOpened] = useState(false);

  const { tasks: escalatedTasks, loading: escalatedLoading, refetch: refetchEscalated } = useAllEscalatedTasks();
  const { tasks: overdueTasks, loading: overdueLoading, refetch: refetchOverdue } = useAllOverdueTasks();
  const { tasks: pendingTasks, loading: pendingLoading, refetch: refetchPending } = useAllPendingTasks();
  const { updateTask } = useUpdateTask();

  const currentTasks = useMemo(() => {
    switch (activeView) {
      case 'escalated':
        return escalatedTasks;
      case 'overdue':
        return overdueTasks;
      case 'pending':
        return pendingTasks;
      default:
        return [];
    }
  }, [activeView, escalatedTasks, overdueTasks, pendingTasks]);

  const currentLoading = useMemo(() => {
    switch (activeView) {
      case 'escalated':
        return escalatedLoading;
      case 'overdue':
        return overdueLoading;
      case 'pending':
        return pendingLoading;
      default:
        return false;
    }
  }, [activeView, escalatedLoading, overdueLoading, pendingLoading]);

  const uniqueProjects = useMemo(() => {
    const projectMap = new Map();
    currentTasks.forEach(task => {
      if (!projectMap.has(task.project_id) && task.projects?.project_name) {
        projectMap.set(task.project_id, task.projects.project_name);
      }
    });
    return Array.from(projectMap.entries()).map(([id, name]) => ({ value: id, label: name })).sort((a, b) => a.label.localeCompare(b.label));
  }, [currentTasks]);

  const filteredTasks = useMemo(() => {
    let filtered = currentTasks;

    if (selectedProject) {
      filtered = filtered.filter(task => task.project_id === selectedProject);
    }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(task => 
          task.task_name.toLowerCase().includes(query) ||
          task.task_description?.toLowerCase().includes(query) ||
          task.projects?.project_name?.toLowerCase().includes(query) ||
          task.phase_name.toLowerCase().includes(query) ||
          task.step_name.toLowerCase().includes(query)
        );
      }

    return filtered;
  }, [currentTasks, selectedProject, searchQuery]);

  const handleRefresh = () => {
    switch (activeView) {
      case 'escalated':
        refetchEscalated();
        break;
      case 'overdue':
        refetchOverdue();
        break;
      case 'pending':
        refetchPending();
        break;
    }
  };

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setTaskDrawerOpened(true);
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatusType) => {
    await updateTask(taskId, { task_status: newStatus });
    handleRefresh();
  };

  const getStatusColor = (status: TaskStatusType) => {
    switch (status) {
      case 'completed': return 'green';
      case 'ongoing': return 'blue';
      case 'escalated': return 'red';
      case 'pending': return 'orange';
      default: return 'gray';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const getViewIcon = (view: TaskViewType) => {
    switch (view) {
      case 'escalated':
        return <IconAlertTriangle size={16} />;
      case 'overdue':
        return <IconClock size={16} />;
      case 'pending':
        return <IconPlayerPause size={16} />;
    }
  };

  const getViewColor = (view: TaskViewType) => {
    switch (view) {
      case 'escalated':
        return 'red';
      case 'overdue':
        return 'orange';
      case 'pending':
        return 'blue';
    }
  };

  return (
    <Stack gap="lg">
      {/* Header */}
      <Group justify="space-between">
        <div>
          <Text size="xl" fw={700}>Task Overview</Text>
          <Text size="md" c="dimmed">Monitor pending, escalated, and overdue tasks across all projects</Text>
        </div>
        <Tooltip label="Refresh tasks">
          <ActionIcon
            variant="light"
            size="lg"
            onClick={handleRefresh}
            loading={currentLoading}
          >
            <IconRefresh size={20} />
          </ActionIcon>
        </Tooltip>
      </Group>

      {/* View Selector */}
      <Card withBorder p="md">
        <SegmentedControl
          value={activeView}
          onChange={(value) => setActiveView(value as TaskViewType)}
          data={[
            {
              value: 'escalated',
              label: (
                <Group gap="xs">
                  <IconAlertTriangle size={16} />
                  <Text>Escalated ({escalatedTasks.length})</Text>
                </Group>
              ),
            },
            {
              value: 'overdue',
              label: (
                <Group gap="xs">
                  <IconClock size={16} />
                  <Text>Overdue ({overdueTasks.length})</Text>
                </Group>
              ),
            },
            {
              value: 'pending',
              label: (
                <Group gap="xs">
                  <IconPlayerPause size={16} />
                  <Text>Pending ({pendingTasks.length})</Text>
                </Group>
              ),
            },
          ]}
          fullWidth
        />
      </Card>

      {/* Filters */}
      <Card withBorder p="md">
        <Group gap="md">
          <TextInput
            placeholder="Search tasks, projects, phases..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Select
            placeholder="All projects"
            value={selectedProject}
            onChange={(value) => setSelectedProject(value || '')}
            data={uniqueProjects}
            clearable
            style={{ minWidth: 200 }}
          />
        </Group>
      </Card>

      {/* Task List */}
      <Card withBorder p="md">
        <Group justify="space-between" mb="md">
          <Group gap="sm">
            {getViewIcon(activeView)}
            <Text fw={600} size="lg" c={getViewColor(activeView)}>
              {activeView.charAt(0).toUpperCase() + activeView.slice(1)} Tasks
            </Text>
            <Badge color={getViewColor(activeView)} variant="light">
              {filteredTasks.length} tasks
            </Badge>
          </Group>
        </Group>

        {currentLoading ? (
          <Center h={300}>
            <Loader size="lg" />
          </Center>
        ) : filteredTasks.length > 0 ? (
          <ScrollArea h={600}>
            <Stack gap="sm">
              {filteredTasks.map((task) => (
                <Card key={task.project_task_id} withBorder p="md" radius="sm">
                  <Group justify="space-between" align="flex-start">
                    <div style={{ flex: 1 }}>
                      <Group gap="sm" mb="xs">
                        <Badge 
                          color={getStatusColor(task.task_status)} 
                          variant="light" 
                          size="sm"
                          leftSection={getViewIcon(activeView)}
                        >
                          {task.task_status.toUpperCase()}
                        </Badge>
                        <Text fw={600} size="sm">{task.task_name}</Text>
                      </Group>

                      {task.task_description && (
                        <Text size="xs" c="dimmed" mb="xs" lineClamp={2}>
                          {task.task_description}
                        </Text>
                      )}

                      <Group gap="md" mb="xs">
                        <Text size="xs" c="blue" fw={500}>
                          {task.projects?.project_name || 'Unknown Project'}
                        </Text>
                        <Text size="xs" c="dimmed">
                          Phase {task.phase_order}: {task.phase_name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          Step {task.step_order}: {task.step_name}
                        </Text>
                      </Group>

                      <Group gap="md">
                        {task.started_at && (
                          <Text size="xs" c="dimmed">
                            Started: {formatDate(task.started_at)}
                          </Text>
                        )}
                        {task.deadline && (
                          <Text size="xs" c={activeView === 'overdue' ? 'red' : 'dimmed'}>
                            Due: {formatDate(task.deadline)}
                          </Text>
                        )}
                        {activeView === 'escalated' && task.escalated_at && (
                          <Text size="xs" c="red">
                            Escalated: {formatDate(task.escalated_at)}
                          </Text>
                        )}
                      </Group>
                    </div>

                    <Group gap="xs">
                      <Tooltip label="View Details">
                        <ActionIcon
                          variant="light"
                          size="sm"
                          color="blue"
                          onClick={() => handleTaskClick(task.project_task_id)}
                        >
                          <IconEye size={14} />
                        </ActionIcon>
                      </Tooltip>
                      
                      {task.task_status !== 'completed' && (
                        <Tooltip label="Start Task">
                          <ActionIcon
                            variant="light"
                            size="sm"
                            color="green"
                            onClick={() => handleStatusChange(task.project_task_id, 'ongoing')}
                          >
                            <IconPlayerPlay size={14} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                      
                      {task.task_status !== 'completed' && (
                        <Tooltip label="Mark Complete">
                          <ActionIcon
                            variant="light"
                            size="sm"
                            color="green"
                            onClick={() => handleStatusChange(task.project_task_id, 'completed')}
                          >
                            <IconCheck size={14} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Group>
                  </Group>
                </Card>
              ))}
            </Stack>
          </ScrollArea>
        ) : (
          <Center h={300}>
            <Stack align="center" gap="sm">
              {getViewIcon(activeView)}
              <Text size="lg" fw={500} c={getViewColor(activeView)}>
                No {activeView} tasks found
              </Text>
              <Text size="sm" c="dimmed">
                {selectedProject || searchQuery 
                  ? 'Try adjusting your filters'
                  : `Great! No ${activeView} tasks at the moment`
                }
              </Text>
            </Stack>
          </Center>
        )}
      </Card>

      {/* Task Details Drawer */}
      <TaskDrawer
        taskId={selectedTaskId}
        opened={taskDrawerOpened}
        onClose={() => {
          setTaskDrawerOpened(false);
          setSelectedTaskId(null);
        }}
        onTaskUpdate={handleRefresh}
      />
    </Stack>
  );
}
