import { useState, useEffect } from 'react';
import {
  Stack,
  Group,
  Text,
  Card,
  Badge,
  Select,
  Grid,
  Progress,
  Alert,
  Loader,
  Center,
  Paper,
  SimpleGrid,
  Avatar,
  ActionIcon,
  Tooltip,
  Button,
} from '@mantine/core';
import {
  IconTrendingUp,
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconUsers,
  IconTarget,
  IconRefresh,
  IconEye,
  IconPlayerPlay,
  IconRestore,
} from '@tabler/icons-react';
import {
  useDashboardAnalytics,
  useActiveProjects,
  useProjectEscalatedTasks,
  useProjectPhaseProgress,
  useUpdateTask,
} from './project.hook';
import type { ProjectWithStats, TaskStatusType } from './project.typs';
import { TaskDrawer } from './TaskDrawer';

export function DashboardAnalytics() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskDrawerOpened, setTaskDrawerOpened] = useState(false);

  const { analytics, loading: analyticsLoading, refetch: refetchAnalytics } = useDashboardAnalytics();
  const { projects, loading: projectsLoading, refetch: refetchProjects } = useActiveProjects();
  const { tasks: escalatedTasks, loading: tasksLoading, refetch: refetchTasks } = useProjectEscalatedTasks(selectedProjectId || null);
  const { phases, loading: phasesLoading, refetch: refetchPhases } = useProjectPhaseProgress(selectedProjectId || null);
  const { updateTask } = useUpdateTask();

  // Auto-select first project when projects load
  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].project_id);
    }
  }, [projects, selectedProjectId]);

  const selectedProject = projects.find(p => p.project_id === selectedProjectId);

  const handleRefreshAll = () => {
    refetchAnalytics();
    refetchProjects();
    if (selectedProjectId) {
      refetchTasks();
      refetchPhases();
    }
  };

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setTaskDrawerOpened(true);
  };

  const handleTaskUpdate = () => {
    refetchTasks();
    refetchPhases();
    refetchAnalytics();
  };

  const handleStatusQuickChange = async (taskId: string, newStatus: TaskStatusType) => {
    await updateTask(taskId, { task_status: newStatus });
    handleTaskUpdate();
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

  return (
    <Stack gap="xl">
      {/* Header */}
      <Group justify="space-between">
        <div>
          <Text size="xl" fw={700}>Project Dashboard</Text>
          <Text size="md" c="dimmed">Analytics and escalated tasks overview</Text>
        </div>
        <Tooltip label="Refresh all data">
          <ActionIcon
            variant="light"
            size="lg"
            onClick={handleRefreshAll}
            loading={analyticsLoading || projectsLoading}
          >
            <IconRefresh size={20} />
          </ActionIcon>
        </Tooltip>
      </Group>

      {/* Overall Analytics */}
      {analyticsLoading ? (
        <Center h={200}>
          <Loader size="lg" />
        </Center>
      ) : analytics ? (
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
          <Card withBorder p="md">
            <Group gap="sm" mb="xs">
              <IconTarget size={20} color="var(--mantine-color-blue-6)" />
              <Text size="sm" c="dimmed">Total Projects</Text>
            </Group>
            <Text size="xl" fw={700}>{analytics.total_projects}</Text>
            <Group gap="xs" mt="xs">
              <Badge size="sm" variant="light" color="green">
                {analytics.active_projects} Active
              </Badge>
              <Badge size="sm" variant="light" color="gray">
                {analytics.completed_projects} Completed
              </Badge>
            </Group>
          </Card>

          <Card withBorder p="md">
            <Group gap="sm" mb="xs">
              <IconCheck size={20} color="var(--mantine-color-green-6)" />
              <Text size="sm" c="dimmed">Total Tasks</Text>
            </Group>
            <Text size="xl" fw={700}>{analytics.total_tasks}</Text>
            <Progress
              value={analytics.total_tasks > 0 ? (analytics.completed_tasks / analytics.total_tasks) * 100 : 0}
              size="sm"
              color="green"
              mt="xs"
            />
            <Text size="xs" c="dimmed" mt="xs">
              {analytics.completed_tasks} completed
            </Text>
          </Card>

          <Card withBorder p="md">
            <Group gap="sm" mb="xs">
              <IconAlertTriangle size={20} color="var(--mantine-color-red-6)" />
              <Text size="sm" c="dimmed">Escalated Tasks</Text>
            </Group>
            <Text size="xl" fw={700} c="red">{analytics.escalated_tasks}</Text>
            {analytics.escalated_tasks > 0 && (
              <Badge size="sm" variant="light" color="red" mt="xs">
                Needs Attention
              </Badge>
            )}
          </Card>

          <Card withBorder p="md">
            <Group gap="sm" mb="xs">
              <IconTrendingUp size={20} color="var(--mantine-color-indigo-6)" />
              <Text size="sm" c="dimmed">Completion Rate</Text>
            </Group>
            <Text size="xl" fw={700}>
              {analytics.total_tasks > 0 ? Math.round((analytics.completed_tasks / analytics.total_tasks) * 100) : 0}%
            </Text>
            <Progress
              value={analytics.total_tasks > 0 ? (analytics.completed_tasks / analytics.total_tasks) * 100 : 0}
              size="sm"
              color="indigo"
              mt="xs"
            />
          </Card>
        </SimpleGrid>
      ) : (
        <Alert color="red" title="Error">
          Failed to load dashboard analytics
        </Alert>
      )}

      {/* Project Selector */}
      <Card withBorder p="xl">
        <Group gap="sm" mb="lg">
          <IconUsers size={20} color="var(--mantine-color-blue-6)" />
          <Text fw={600} size="lg">Project Analysis</Text>
        </Group>

        {projectsLoading ? (
          <Center h={100}>
            <Loader />
          </Center>
        ) : (
          <Select
            placeholder="Select an active project to analyze"
            value={selectedProjectId}
            onChange={(value) => setSelectedProjectId(value || '')}
            data={projects.map(project => ({
              value: project.project_id,
              label: `${project.project_name} (${project.escalated_tasks} escalated)`,
            }))}
            size="md"
            leftSection={<IconTarget size={18} />}
            clearable
          />
        )}

        {/* Selected Project Stats */}
        {selectedProject && (
          <Grid mt="lg">
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Paper withBorder p="md">
                <Text size="sm" c="dimmed" mb="xs">Project Overview</Text>
                <Text fw={600} mb="md">{selectedProject.project_name}</Text>
                <Group gap="md">
                  <div>
                    <Text size="xs" c="dimmed">Total Tasks</Text>
                    <Text fw={500}>{selectedProject.total_tasks}</Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">Completed</Text>
                    <Text fw={500} c="green">{selectedProject.completed_tasks}</Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">Ongoing</Text>
                    <Text fw={500} c="blue">{selectedProject.ongoing_tasks}</Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">Escalated</Text>
                    <Text fw={500} c="red">{selectedProject.escalated_tasks}</Text>
                  </div>
                </Group>
                <Progress
                  value={selectedProject.total_tasks > 0 ? (selectedProject.completed_tasks / selectedProject.total_tasks) * 100 : 0}
                  size="md"
                  color="green"
                  mt="md"
                />
              </Paper>
            </Grid.Col>
            
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Paper withBorder p="md">
                <Text size="sm" c="dimmed" mb="xs">Team Assignment</Text>
                <Group gap="md">
                  <div>
                    <Text size="xs" c="dimmed">Total Roles</Text>
                    <Text fw={500}>{selectedProject.total_roles}</Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">Filled</Text>
                    <Text fw={500} c="green">{selectedProject.filled_roles}</Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">Unfilled</Text>
                    <Text fw={500} c="orange">{selectedProject.unfilled_roles}</Text>
                  </div>
                </Group>
                <Progress
                  value={selectedProject.total_roles > 0 ? (selectedProject.filled_roles / selectedProject.total_roles) * 100 : 0}
                  size="md"
                  color="blue"
                  mt="md"
                />
              </Paper>
            </Grid.Col>
          </Grid>
        )}
      </Card>

      {/* Phase Progress */}
      {selectedProjectId && (
        <Card withBorder p="xl">
          <Group gap="sm" mb="lg">
            <IconClock size={20} color="var(--mantine-color-indigo-6)" />
            <Text fw={600} size="lg">Phase Progress</Text>
          </Group>

          {phasesLoading ? (
            <Center h={100}>
              <Loader />
            </Center>
          ) : phases.length > 0 ? (
            <Stack gap="md">
              {phases.map((phase) => {
                const progressPercent = phase.total_tasks > 0 ? (phase.completed_tasks / phase.total_tasks) * 100 : 0;
                return (
                  <Paper key={`${phase.phase_order}-${phase.phase_name}`} withBorder p="md">
                    <Group justify="space-between" mb="sm">
                      <Text fw={600}>
                        Phase {phase.phase_order}: {phase.phase_name}
                      </Text>
                      <Badge variant="light" color={progressPercent === 100 ? 'green' : 'blue'}>
                        {Math.round(progressPercent)}% Complete
                      </Badge>
                    </Group>
                    <Progress value={progressPercent} size="md" color={progressPercent === 100 ? 'green' : 'blue'} mb="sm" />
                    <Group gap="md">
                      <Text size="xs" c="dimmed">
                        <Text span fw={500}>{phase.completed_tasks}</Text> / {phase.total_tasks} tasks completed
                      </Text>
                      {phase.ongoing_tasks > 0 && (
                        <Badge size="xs" variant="light" color="blue">
                          {phase.ongoing_tasks} ongoing
                        </Badge>
                      )}
                      {phase.escalated_tasks > 0 && (
                        <Badge size="xs" variant="light" color="red">
                          {phase.escalated_tasks} escalated
                        </Badge>
                      )}
                    </Group>
                  </Paper>
                );
              })}
            </Stack>
          ) : (
            <Text c="dimmed" ta="center" py="xl">
              No phases loaded yet for this project
            </Text>
          )}
        </Card>
      )}

      {/* Escalated Tasks */}
      {selectedProjectId && (
        <Card withBorder p="xl">
          <Group justify="space-between" mb="lg">
            <Group gap="sm">
              <IconAlertTriangle size={20} color="var(--mantine-color-red-6)" />
              <Text fw={600} size="lg">Escalated Tasks</Text>
              {escalatedTasks.length > 0 && (
                <Badge color="red" variant="light">
                  {escalatedTasks.length} tasks
                </Badge>
              )}
            </Group>
            {escalatedTasks.length > 0 && (
              <Button
                size="sm"
                variant="light"
                leftSection={<IconRefresh size={16} />}
                onClick={() => refetchTasks()}
                loading={tasksLoading}
              >
                Refresh
              </Button>
            )}
          </Group>

          {tasksLoading ? (
            <Center h={200}>
              <Loader size="lg" />
            </Center>
          ) : escalatedTasks.length > 0 ? (
            <Stack gap="md">
              {escalatedTasks.map((task) => (
                <Paper key={task.project_task_id} withBorder p="md">
                  <Group justify="space-between" align="flex-start">
                    <div style={{ flex: 1 }}>
                      <Group gap="sm" mb="sm">
                        <Badge color="red" variant="light" size="sm" leftSection={<IconAlertTriangle size={12} />}>
                          ESCALATED
                        </Badge>
                        <Text fw={600} size="md">{task.task_name}</Text>
                      </Group>

                      {task.task_description && (
                        <Text size="sm" c="dimmed" mb="sm">{task.task_description}</Text>
                      )}

                      <Group gap="md" mb="sm">
                        <Text size="xs" c="dimmed">
                          Phase {task.phase_order}: {task.phase_name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          Step {task.step_order}: {task.step_name}
                        </Text>
                        {task.escalated_at && (
                          <Text size="xs" c="red">
                            Escalated: {formatDate(task.escalated_at)}
                          </Text>
                        )}
                      </Group>

                      {task.escalation_reason && (
                        <Alert color="red" size="sm" mb="sm">
                          <Text size="sm">{task.escalation_reason}</Text>
                        </Alert>
                      )}

                      {task.assigned_crew.length > 0 && (
                        <Group gap="xs" mb="sm">
                          <Text size="xs" c="dimmed">Assigned to:</Text>
                          <Group gap={4}>
                            {task.assigned_crew.slice(0, 3).map((crew, index) => (
                              <Tooltip key={index} label={`${crew.crew_name} (${crew.role_name})`}>
                                <Avatar size="xs" radius="xl">
                                  <IconUsers size={10} />
                                </Avatar>
                              </Tooltip>
                            ))}
                            {task.assigned_crew.length > 3 && (
                              <Text size="xs" c="dimmed">+{task.assigned_crew.length - 3} more</Text>
                            )}
                          </Group>
                        </Group>
                      )}
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
                      <Tooltip label="Resume Task">
                        <ActionIcon
                          variant="light"
                          size="sm"
                          color="green"
                          onClick={() => handleStatusQuickChange(task.project_task_id, 'ongoing')}
                        >
                          <IconPlayerPlay size={14} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Mark Complete">
                        <ActionIcon
                          variant="light"
                          size="sm"
                          color="green"
                          onClick={() => handleStatusQuickChange(task.project_task_id, 'completed')}
                        >
                          <IconCheck size={14} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Group>
                </Paper>
              ))}
            </Stack>
          ) : (
            <Center h={200}>
              <Stack align="center" gap="sm">
                <IconCheck size={48} color="var(--mantine-color-green-6)" />
                <Text size="lg" fw={500} c="green">Great job!</Text>
                <Text size="md" c="dimmed">No escalated tasks in this project</Text>
              </Stack>
            </Center>
          )}
        </Card>
      )}

      {/* Task Details Drawer */}
      <TaskDrawer
        taskId={selectedTaskId}
        opened={taskDrawerOpened}
        onClose={() => {
          setTaskDrawerOpened(false);
          setSelectedTaskId(null);
        }}
        onTaskUpdate={handleTaskUpdate}
      />
    </Stack>
  );
}
