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
  Tooltip,
  Title,
  Box,
  Button,
} from '@mantine/core';
import {
  IconSearch,
  IconRefresh,
  IconAlertTriangle,
  IconClock,
  IconEye,
  IconPlayerPause,
  IconClipboard,
  IconPlus,
} from '@tabler/icons-react';
import {
  useAllEscalatedTasks,
  useAllOverdueTasks,
  useAllPendingTasks,
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
          <Group gap="sm" mb="xs">
            <IconClipboard size={24} style={{ color: 'var(--mantine-color-primary-6)' }} />
            <Title order={2} fw={600} c="dark.7">Requires your attention</Title>
          </Group>
        </div>
        <Tooltip label="Refresh tasks">
          <ActionIcon
            variant="light"
            size="lg"
            onClick={handleRefresh}
            loading={currentLoading}
            style={{ 
              background: 'var(--mantine-color-primary-1)',
              color: 'var(--mantine-color-primary-6)'
            }}
          >
            <IconRefresh size={20} />
          </ActionIcon>
        </Tooltip>
      </Group>

      {/* View Selector */}
      <Box mb="md">
        <Group gap="md">
          <Box 
            onClick={() => setActiveView('escalated')}
            style={{ 
              cursor: 'pointer',
              padding: '12px 16px',
              borderRadius: '12px',
              backgroundColor: activeView === 'escalated' ? 'var(--mantine-color-red-0)' : 'white',
              border: activeView === 'escalated' ? '2px solid var(--mantine-color-red-4)' : '1px solid var(--mantine-color-gray-3)',
              transition: 'all 0.2s ease'
            }}
          >
            <Group gap="xs">
              <IconAlertTriangle size={16} color="var(--mantine-color-red-6)" />
              <Text c="red.7" fw={600} size="sm">ESCALATED</Text>
              <Text c="dimmed" size="sm">• {escalatedTasks.length} tasks</Text>
            </Group>
          </Box>
          
          <Box 
            onClick={() => setActiveView('overdue')}
            style={{ 
              cursor: 'pointer',
              padding: '12px 16px',
              borderRadius: '12px',
              backgroundColor: activeView === 'overdue' ? 'var(--mantine-color-orange-0)' : 'white',
              border: activeView === 'overdue' ? '2px solid var(--mantine-color-orange-4)' : '1px solid var(--mantine-color-gray-3)',
              transition: 'all 0.2s ease'
            }}
          >
            <Group gap="xs">
              <IconClock size={16} color="var(--mantine-color-orange-6)" />
              <Text c="orange.7" fw={600} size="sm">OVERDUE</Text>
              <Text c="dimmed" size="sm">• {overdueTasks.length} tasks</Text>
            </Group>
          </Box>

          <Box 
            onClick={() => setActiveView('pending')}
            style={{ 
              cursor: 'pointer',
              padding: '12px 16px',
              borderRadius: '12px',
              backgroundColor: activeView === 'pending' ? 'var(--mantine-color-blue-0)' : 'white',
              border: activeView === 'pending' ? '2px solid var(--mantine-color-blue-4)' : '1px solid var(--mantine-color-gray-3)',
              transition: 'all 0.2s ease'
            }}
          >
            <Group gap="xs">
              <IconPlayerPause size={16} color="var(--mantine-color-blue-6)" />
              <Text c="blue.7" fw={600} size="sm">PENDING</Text>
              <Text c="dimmed" size="sm">• {pendingTasks.length} tasks</Text>
            </Group>
          </Box>
        </Group>
      </Box>

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
      <Box>
        {currentLoading ? (
          <Center h={300}>
            <Loader size="lg" />
          </Center>
        ) : filteredTasks.length > 0 ? (
          <Stack gap="md">
            {/* Task Section Header */}
            <Group justify="space-between" align="flex-start" mb="md">
              <Text fw={600} size="md" c="dark.7">Name</Text>
              <Group gap="xl">
                <Text fw={600} size="md" c="dark.7">Priority</Text>
                <Text fw={600} size="md" c="dark.7">Due date</Text>
              </Group>
            </Group>

            {filteredTasks.map((task) => (
              <Group key={task.project_task_id} justify="space-between" align="center" p="md" style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '1px solid var(--mantine-color-gray-2)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                ':hover': {
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  transform: 'translateY(-1px)'
                }
              }}>
                <Group gap="md" style={{ flex: 1 }}>
                  <Box w={4} h={32} bg={getStatusColor(task.task_status)} style={{ borderRadius: '2px' }} />
                  <Box>
                    <Text fw={600} size="sm" c="dark.8" mb={2}>
                      {task.task_name}
                    </Text>
                    {task.task_description && (
                      <Text size="xs" c="dimmed" lineClamp={1}>
                        {task.task_description}
                      </Text>
                    )}
                  </Box>
                </Group>

                <Group gap="xl" align="center">
                  <Badge 
                    color={getStatusColor(task.task_status)}
                    variant="light"
                    size="sm"
                    style={{ 
                      borderRadius: '8px',
                      fontWeight: 500,
                      minWidth: '70px',
                      textAlign: 'center'
                    }}
                  >
                    {task.task_status === 'escalated' ? 'High' : 
                     task.task_status === 'pending' ? 'Normal' : 
                     task.task_status === 'ongoing' ? 'Low' : 'Normal'}
                  </Badge>
                  
                  <Text size="sm" c={activeView === 'overdue' ? 'red.7' : 'dark.6'} fw={500} style={{ minWidth: '80px' }}>
                    {task.deadline ? (
                      activeView === 'overdue' ? 'Today' :
                      activeView === 'pending' ? `${Math.ceil((new Date(task.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days left` :
                      formatDate(task.deadline)
                    ) : 'Not set'}
                  </Text>
                </Group>

                <ActionIcon
                  variant="subtle"
                  size="sm"
                  color="gray"
                  onClick={() => handleTaskClick(task.project_task_id)}
                >
                  <IconEye size={16} />
                </ActionIcon>
              </Group>
            ))}

            {/* Add Task Button */}
            <Group justify="flex-start" mt="md">
              <Button 
                variant="subtle" 
                leftSection={<IconPlus size={16} />}
                c="primary.6"
                style={{ fontWeight: 500 }}
              >
                + Add task
              </Button>
            </Group>
          </Stack>
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
      </Box>

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
