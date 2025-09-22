import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Stack,
  Title,
  Text,
  Card,
  Group,
  Badge,
  Button,
  Grid,
  Box,
  Alert,
  LoadingOverlay,
  Breadcrumbs,
  Anchor,
  Tabs,
  Select,
  TextInput,
  ActionIcon,
  Menu,
  Progress,
  Pagination
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import {
  IconArrowLeft,
  IconClipboardList,
  IconUsers,
  IconSearch,
  IconFilter,
  IconPlayerPlay,
  IconCheck,
  IconClock,
  IconAlertTriangle,
  IconDots,
  IconEdit,
  IconCalendar,
  IconFlag,
  IconChevronDown
} from '@tabler/icons-react';
import { useAuth } from '../auth/useAuth';
import { useProject, useProjectTasks, useProjectCrew } from '../project/project.hook';
import ProjectTaskView from '../project/ProjectTaskView';
import type { 
  ProjectTaskWithCrew, 
  TaskStatusType,
  ProjectTaskFilters
} from '../project/project.typs';

export default function ProjectTaskManagement() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch] = useDebouncedValue(searchQuery, 300);
  const [selectedStatus, setSelectedStatus] = useState<TaskStatusType | 'all'>('all');
  const [selectedPhase, setSelectedPhase] = useState<string>('all');
  const [selectedCrew, setSelectedCrew] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [currentPage, setCurrentPage] = useState(1);

  const { project, loading: projectLoading } = useProject(projectId || null);
  const { crew } = useProjectCrew(projectId || null);
  
  // Build filters for tasks
  const taskFilters: ProjectTaskFilters = {
    is_archived: false,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(selectedStatus !== 'all' && { task_status: selectedStatus }),
    ...(selectedPhase !== 'all' && { phase_name: selectedPhase }),
    ...(selectedCrew !== 'all' && { assigned_crew_id: selectedCrew })
  };

  const {
    tasks,
    totalCount,
    currentPage: taskCurrentPage,
    totalPages,
    pageSize,
    loading: tasksLoading,
    assignToCrew,
    startTask,
    completeTask,
    updateTask,
    updateFilters,
    updatePagination
  } = useProjectTasks(
    projectId || null,
    taskFilters,
    { page: currentPage, pageSize: 20 }
  );

  // Get unique phases for filter
  const phases = [...new Set(tasks.map(task => task.phase_name))];

  const getStatusColor = (status: TaskStatusType) => {
    switch (status) {
      case 'pending': return 'gray';
      case 'ongoing': return 'blue';
      case 'completed': return 'green';
      case 'escalated': return 'red';
      default: return 'gray';
    }
  };

  const handleStatusChange = (status: TaskStatusType | 'all') => {
    setSelectedStatus(status);
    setCurrentPage(1);
  };

  const handlePhaseChange = (phase: string) => {
    setSelectedPhase(phase);
    setCurrentPage(1);
  };

  const handleCrewChange = (crewId: string) => {
    setSelectedCrew(crewId);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    updatePagination({ page });
  };

  const TaskCard = ({ task }: { task: ProjectTaskWithCrew }) => (
    <Card withBorder p="md" h="100%">
      <Stack gap="sm" h="100%">
        <Group justify="space-between">
          <Box style={{ flex: 1 }}>
            <Group gap="xs" mb="xs">
              <Text fw={600} size="sm" lineClamp={1}>
                {task.task_name}
              </Text>
              {task.is_critical && (
                <IconFlag size={14} color="red" />
              )}
            </Group>
            
            <Group gap="xs" mb="sm">
              <Badge size="xs" color={getStatusColor(task.task_status)}>
                {task.task_status}
              </Badge>
              <Badge size="xs" variant="light">
                {task.phase_name}
              </Badge>
            </Group>

            {task.task_description && (
              <Text size="sm" c="dimmed" lineClamp={2} mb="sm">
                {task.task_description}
              </Text>
            )}

            <Group gap="md" mb="sm">
              {task.estimated_hours && (
                <Group gap={4}>
                  <IconClock size={12} />
                  <Text size="xs" c="dimmed">
                    {task.estimated_hours}h
                  </Text>
                </Group>
              )}
              
              {task.assigned_role_name && (
                <Group gap={4}>
                  <IconUsers size={12} />
                  <Text size="xs" c="dimmed">
                    {task.assigned_role_name}
                  </Text>
                </Group>
              )}

              {task.expected_end_time && (
                <Group gap={4}>
                  <IconCalendar size={12} />
                  <Text size="xs" c="dimmed">
                    Due {new Date(task.expected_end_time).toLocaleDateString()}
                  </Text>
                </Group>
              )}
            </Group>

            {/* Checklist Progress */}
            {task.checklist_items && task.checklist_items.length > 0 && (
              <Box mb="sm">
                <Group justify="space-between" mb={4}>
                  <Text size="xs" fw={500}>Checklist</Text>
                  <Text size="xs" c="dimmed">
                    {task.checklist_items.filter(item => item.completed).length}/{task.checklist_items.length}
                  </Text>
                </Group>
                <Progress
                  size="xs"
                  value={(task.checklist_items.filter(item => item.completed).length / task.checklist_items.length) * 100}
                  color="blue"
                />
              </Box>
            )}

            {/* Assigned Crew */}
            {task.assigned_crew_member && (
              <Text size="xs" c="dimmed" mb="sm">
                Assigned to: {task.assigned_crew_member.user_name}
              </Text>
            )}
          </Box>

          <Menu shadow="md" width={200}>
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray">
                <IconDots size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {task.task_status === 'pending' && (
                <Menu.Item
                  leftSection={<IconPlayerPlay size={14} />}
                  onClick={() => startTask(task.project_task_id, user?.id || '')}
                >
                  Start Task
                </Menu.Item>
              )}
              {task.task_status === 'ongoing' && (
                <Menu.Item
                  leftSection={<IconCheck size={14} />}
                  onClick={() => completeTask(task.project_task_id, user?.id || '')}
                  color="green"
                >
                  Complete Task
                </Menu.Item>
              )}
              <Menu.Item
                leftSection={<IconEdit size={14} />}
                onClick={() => {/* TODO: Implement edit modal */}}
              >
                Edit Task
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>

        {/* Action Buttons */}
        <Group gap="xs" mt="auto">
          {task.task_status === 'pending' && (
            <Button
              size="xs"
              leftSection={<IconPlayerPlay size={12} />}
              onClick={() => startTask(task.project_task_id, user?.id || '')}
            >
              Start
            </Button>
          )}
          {task.task_status === 'ongoing' && (
            <Button
              size="xs"
              color="green"
              leftSection={<IconCheck size={12} />}
              onClick={() => completeTask(task.project_task_id, user?.id || '')}
            >
              Complete
            </Button>
          )}
          {task.task_status === 'escalated' && (
            <Alert color="red" p="xs">
              <Group gap={4}>
                <IconAlertTriangle size={12} />
                <Text size="xs">Escalated</Text>
              </Group>
            </Alert>
          )}
        </Group>
      </Stack>
    </Card>
  );

  if (!project) {
    return (
      <Container size="xl">
        <LoadingOverlay visible={projectLoading} />
        <Alert color="red" title="Project not found">
          The requested project could not be found.
        </Alert>
      </Container>
    );
  }

  const taskStats = {
    total: totalCount,
    pending: tasks.filter(t => t.task_status === 'pending').length,
    ongoing: tasks.filter(t => t.task_status === 'ongoing').length,
    completed: tasks.filter(t => t.task_status === 'completed').length,
    escalated: tasks.filter(t => t.task_status === 'escalated').length
  };

  return (
    <Container size="xl">
      <Stack gap="md">
        {/* Breadcrumbs */}
        <Breadcrumbs>
          <Anchor onClick={() => navigate('/admin/projects')}>Projects</Anchor>
          <Anchor onClick={() => navigate(`/admin/projects/${projectId}`)}>{project.project_name}</Anchor>
          <Text>Task Management</Text>
        </Breadcrumbs>

        {/* Header */}
        <Group justify="space-between">
          <Box>
            <Group gap="sm" mb="xs">
              <ActionIcon variant="light" onClick={() => navigate(`/admin/projects/${projectId}`)}>
                <IconArrowLeft size={16} />
              </ActionIcon>
              <Title order={1}>Task Management</Title>
            </Group>
            <Text c="dimmed">{project.project_name}</Text>
          </Box>
          
          <Group gap="md">
            <Badge size="lg" leftSection={<IconClipboardList size={16} />}>
              {taskStats.total} tasks
            </Badge>
            <Button
              variant="light"
              leftSection={<IconUsers size={16} />}
              onClick={() => navigate(`/admin/projects/${projectId}/crew`)}
            >
              Manage Crew
            </Button>
          </Group>
        </Group>

        {/* Stats Overview */}
        <Grid>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder p="md" ta="center">
              <Text size="xl" fw={700} c="gray">{taskStats.pending}</Text>
              <Text size="sm" c="dimmed">Pending</Text>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder p="md" ta="center">
              <Text size="xl" fw={700} c="blue">{taskStats.ongoing}</Text>
              <Text size="sm" c="dimmed">Ongoing</Text>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder p="md" ta="center">
              <Text size="xl" fw={700} c="green">{taskStats.completed}</Text>
              <Text size="sm" c="dimmed">Completed</Text>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder p="md" ta="center">
              <Text size="xl" fw={700} c="red">{taskStats.escalated}</Text>
              <Text size="sm" c="dimmed">Escalated</Text>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Filters and Search */}
        <Card withBorder p="md">
          <Stack gap="md">
            <Group justify="space-between">
              <Text fw={600}>Filters</Text>
              <Button
                variant="light"
                size="xs"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedStatus('all');
                  setSelectedPhase('all');
                  setSelectedCrew('all');
                  setCurrentPage(1);
                }}
              >
                Clear All
              </Button>
            </Group>
            
            <Grid>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <TextInput
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.currentTarget.value)}
                  leftSection={<IconSearch size={16} />}
                />
              </Grid.Col>
              
              <Grid.Col span={{ base: 12, md: 2 }}>
                <Select
                  placeholder="Status"
                  data={[
                    { value: 'all', label: 'All Status' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'ongoing', label: 'Ongoing' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'escalated', label: 'Escalated' }
                  ]}
                  value={selectedStatus}
                  onChange={(value) => handleStatusChange(value as TaskStatusType | 'all')}
                />
              </Grid.Col>
              
              <Grid.Col span={{ base: 12, md: 3 }}>
                <Select
                  placeholder="Phase"
                  data={[
                    { value: 'all', label: 'All Phases' },
                    ...phases.map(phase => ({ value: phase, label: phase }))
                  ]}
                  value={selectedPhase}
                  onChange={(value) => handlePhaseChange(value || 'all')}
                />
              </Grid.Col>
              
              <Grid.Col span={{ base: 12, md: 3 }}>
                <Select
                  placeholder="Assigned Crew"
                  data={[
                    { value: 'all', label: 'All Crew' },
                    { value: 'unassigned', label: 'Unassigned' },
                    ...crew.map(member => ({ 
                      value: member.project_crew_id, 
                      label: member.user_name 
                    }))
                  ]}
                  value={selectedCrew}
                  onChange={(value) => handleCrewChange(value || 'all')}
                />
              </Grid.Col>
            </Grid>
          </Stack>
        </Card>

        {/* Task List */}
        <Box pos="relative">
          <LoadingOverlay visible={tasksLoading} />
          
          {tasks.length === 0 ? (
            <Card withBorder p="xl">
              <Text ta="center" c="dimmed">
                No tasks found matching the current filters
              </Text>
            </Card>
          ) : (
            <>
              <Grid>
                {tasks.map(task => (
                  <Grid.Col key={task.project_task_id} span={{ base: 12, md: 6, lg: 4 }}>
                    <TaskCard task={task} />
                  </Grid.Col>
                ))}
              </Grid>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <Group justify="center" mt="xl">
                  <Pagination
                    value={currentPage}
                    onChange={handlePageChange}
                    total={totalPages}
                    size="sm"
                  />
                </Group>
              )}
            </>
          )}
        </Box>

        {/* Alternative: Use the existing ProjectTaskView component */}
        <Card withBorder>
          <Text fw={600} mb="md">Detailed Task View</Text>
          <ProjectTaskView
            projectId={projectId}
            currentUserId={user?.id || ''}
            viewMode="project"
          />
        </Card>
      </Stack>
    </Container>
  );
}
