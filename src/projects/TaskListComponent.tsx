import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stack,
  Group,
  Text,
  Card,
  Badge,
  Button,
  ActionIcon,
  Menu,
  Progress,
  Collapse,
  Select,
  TextInput,
  Loader,
  Center,
  Alert,
  Tooltip,
  Avatar,
} from '@mantine/core';
import {
  IconChevronDown,
  IconChevronRight,
  IconDots,
  IconEdit,
  IconPlayerPlay,
  IconCheck,
  IconAlertTriangle,
  IconClock,
  IconUser,
  IconPlus,
  IconFilter,
  IconSearch,
} from '@tabler/icons-react';
import { useDebouncedValue } from '@mantine/hooks';
import {
  useProjectTasks,
  useUpdateTask,
  useCreateCustomTask,
  useLoadNextStepTasks,
} from './project.hook';
import type { 
  ProjectTaskWithAssignments, 
  TaskFilters, 
  TaskStatusType,
  CreateCustomTaskInput,
} from './project.typs';

interface TaskListComponentProps {
  projectId: string;
  onTaskEdit?: (task: ProjectTaskWithAssignments) => void;
}

interface PhaseGroup {
  phase_name: string;
  phase_order: number;
  steps: StepGroup[];
}

interface StepGroup {
  step_name: string;
  step_order: number;
  tasks: ProjectTaskWithAssignments[];
}

export function TaskListComponent({ projectId, onTaskEdit }: TaskListComponentProps) {
  const navigate = useNavigate();
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyLoaded, setShowOnlyLoaded] = useState(false);
  const [debouncedSearchTerm] = useDebouncedValue(searchTerm, 300);

  const { updateTask } = useUpdateTask();
  const { createCustomTask, loading: createLoading } = useCreateCustomTask();
  const { loadNextStep, loading: loadNextLoading } = useLoadNextStepTasks();

  // Build filters with useMemo to prevent infinite re-renders
  const filters = useMemo((): TaskFilters => ({
    project_id: projectId,
    ...(statusFilter && { status: [statusFilter as TaskStatusType] }),
    ...(debouncedSearchTerm && { search: debouncedSearchTerm }),
    ...(showOnlyLoaded && { is_loaded: true }),
  }), [projectId, statusFilter, debouncedSearchTerm, showOnlyLoaded]);

  const { tasks, loading, error, refetch } = useProjectTasks(filters);

  const handleStatusChange = async (taskId: string, newStatus: TaskStatusType) => {
    const success = await updateTask(taskId, { task_status: newStatus });
    if (success) {
      refetch();
    }
  };

  const handleLoadNextStep = async () => {
    const success = await loadNextStep(projectId);
    if (success) {
      refetch();
    }
  };

  const handleCreateCustomTask = async () => {
    const input: CreateCustomTaskInput = {
      task_name: 'New Custom Task',
      task_description: 'Custom task description',
      estimated_hours: 1,
    };

    const task = await createCustomTask(projectId, input);
    if (task) {
      refetch();
    }
  };

  const togglePhase = (phaseName: string) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phaseName)) {
      newExpanded.delete(phaseName);
    } else {
      newExpanded.add(phaseName);
    }
    setExpandedPhases(newExpanded);
  };

  const toggleStep = (stepKey: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepKey)) {
      newExpanded.delete(stepKey);
    } else {
      newExpanded.add(stepKey);
    }
    setExpandedSteps(newExpanded);
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

  const groupTasksByPhaseAndStep = (tasks: ProjectTaskWithAssignments[]): PhaseGroup[] => {
    const phaseMap = new Map<string, PhaseGroup>();

    tasks.forEach(task => {
      const phaseKey = `${task.phase_order}-${task.phase_name}`;
      
      if (!phaseMap.has(phaseKey)) {
        phaseMap.set(phaseKey, {
          phase_name: task.phase_name,
          phase_order: task.phase_order,
          steps: [],
        });
      }

      const phase = phaseMap.get(phaseKey)!;
      const stepKey = `${task.step_order}-${task.step_name}`;
      
      let step = phase.steps.find(s => `${s.step_order}-${s.step_name}` === stepKey);
      if (!step) {
        step = {
          step_name: task.step_name,
          step_order: task.step_order,
          tasks: [],
        };
        phase.steps.push(step);
      }

      step.tasks.push(task);
    });

    // Sort phases and steps
    const phases = Array.from(phaseMap.values()).sort((a, b) => a.phase_order - b.phase_order);
    phases.forEach(phase => {
      phase.steps.sort((a, b) => a.step_order - b.step_order);
      phase.steps.forEach(step => {
        step.tasks.sort((a, b) => a.task_order - b.task_order);
      });
    });

    return phases;
  };

  if (error) {
    return (
      <Alert color="red" title="Error">
        Failed to load project tasks. Please try again.
      </Alert>
    );
  }

  if (loading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  const groupedTasks = groupTasksByPhaseAndStep(tasks);
  const loadedTasks = tasks.filter(t => t.is_loaded);
  const completedLoadedTasks = loadedTasks.filter(t => t.task_status === 'completed');
  const hasUncompletedTasks = loadedTasks.some(t => t.task_status !== 'completed');

  return (
    <Stack gap="md">
      {/* Header */}
      <Group justify="space-between">
        <div>
          <Text size="xl" fw={700}>
            Project Tasks
          </Text>
          <Text size="sm" c="dimmed">
            Manage and track project progress
          </Text>
        </div>
        
        <Group gap="sm">
          <Button
            variant="light"
            leftSection={<IconPlus size={16} />}
            onClick={handleCreateCustomTask}
            loading={createLoading}
          >
            Add Custom Task
          </Button>
          
          <Button
            leftSection={<IconPlayerPlay size={16} />}
            onClick={handleLoadNextStep}
            loading={loadNextLoading}
            disabled={hasUncompletedTasks}
          >
            Load Next Step
          </Button>
        </Group>
      </Group>

      {/* Progress Summary */}
      {loadedTasks.length > 0 && (
        <Card withBorder p="md">
          <Group justify="space-between" mb="sm">
            <Text fw={500}>Current Progress</Text>
            <Text size="sm" c="dimmed">
              {completedLoadedTasks.length} of {loadedTasks.length} loaded tasks completed
            </Text>
          </Group>
          
          <Progress
            value={(completedLoadedTasks.length / loadedTasks.length) * 100}
            color={hasUncompletedTasks ? 'blue' : 'green'}
            size="lg"
          />
        </Card>
      )}

      {/* Filters */}
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
            value={statusFilter}
            onChange={(value) => setStatusFilter(value || '')}
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
          
          <Button
            variant={showOnlyLoaded ? 'filled' : 'light'}
            size="sm"
            onClick={() => setShowOnlyLoaded(!showOnlyLoaded)}
          >
            {showOnlyLoaded ? 'Show All' : 'Loaded Only'}
          </Button>
        </Group>
      </Card>

      {/* Task Groups */}
      {groupedTasks.length === 0 ? (
        <Center h={200}>
          <Text c="dimmed">No tasks found matching your filters</Text>
        </Center>
      ) : (
        <Stack gap="sm">
          {groupedTasks.map((phase) => {
            const phaseKey = `${phase.phase_order}-${phase.phase_name}`;
            const isPhaseExpanded = expandedPhases.has(phaseKey);
            const phaseTasks = phase.steps.flatMap(s => s.tasks);
            const phaseCompletedTasks = phaseTasks.filter(t => t.task_status === 'completed').length;

            return (
              <Card key={phaseKey} withBorder>
                <Group
                  justify="space-between"
                  style={{ cursor: 'pointer' }}
                  onClick={() => togglePhase(phaseKey)}
                  p="md"
                >
                  <Group gap="sm">
                    <ActionIcon variant="subtle" size="sm">
                      {isPhaseExpanded ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                    </ActionIcon>
                    
                    <div>
                      <Text fw={500}>
                        Phase {phase.phase_order}: {phase.phase_name}
                      </Text>
                      <Text size="sm" c="dimmed">
                        {phaseCompletedTasks} of {phaseTasks.length} tasks completed
                      </Text>
                    </div>
                  </Group>

                  <Group gap="xs">
                    <Progress
                      value={(phaseCompletedTasks / phaseTasks.length) * 100}
                      w={100}
                      size="sm"
                    />
                    <Text size="sm" c="dimmed">
                      {Math.round((phaseCompletedTasks / phaseTasks.length) * 100)}%
                    </Text>
                  </Group>
                </Group>

                <Collapse in={isPhaseExpanded}>
                  <Stack gap="sm" p="md" pt={0}>
                    {phase.steps.map((step) => {
                      const stepKey = `${phaseKey}-${step.step_order}-${step.step_name}`;
                      const isStepExpanded = expandedSteps.has(stepKey);
                      const stepCompletedTasks = step.tasks.filter(t => t.task_status === 'completed').length;

                      return (
                        <Card key={stepKey} withBorder bg="gray.0">
                          <Group
                            justify="space-between"
                            style={{ cursor: 'pointer' }}
                            onClick={() => toggleStep(stepKey)}
                            p="sm"
                          >
                            <Group gap="sm">
                              <ActionIcon variant="subtle" size="sm">
                                {isStepExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                              </ActionIcon>
                              
                              <div>
                                <Text size="sm" fw={500}>
                                  Step {step.step_order}: {step.step_name}
                                </Text>
                                <Text size="xs" c="dimmed">
                                  {stepCompletedTasks} of {step.tasks.length} tasks completed
                                </Text>
                              </div>
                            </Group>

                            <Group gap="xs">
                              <Progress
                                value={(stepCompletedTasks / step.tasks.length) * 100}
                                w={80}
                                size="xs"
                              />
                            </Group>
                          </Group>

                          <Collapse in={isStepExpanded}>
                            <Stack gap="xs" p="sm" pt={0}>
                              {step.tasks.map((task) => (
                                <Card 
                                  key={task.project_task_id} 
                                  withBorder 
                                  bg="white"
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => navigate(`/admin/projects/${projectId}/tasks/${task.project_task_id}`)}
                                >
                                  <Group justify="space-between" p="sm">
                                    <Group gap="sm" style={{ flex: 1 }}>
                                      {getStatusIcon(task.task_status)}
                                      
                                      <div style={{ flex: 1 }}>
                                        <Group gap="xs" mb="xs">
                                          <Text size="sm" fw={500} lineClamp={1}>
                                            {task.task_name}
                                          </Text>
                                          
                                          {task.is_custom && (
                                            <Badge size="xs" variant="outline" color="blue">
                                              Custom
                                            </Badge>
                                          )}
                                          
                                          {!task.is_loaded && (
                                            <Badge size="xs" variant="outline" color="gray">
                                              Not Loaded
                                            </Badge>
                                          )}
                                        </Group>
                                        
                                        {task.task_description && (
                                          <Text size="xs" c="dimmed" lineClamp={1} mb="xs">
                                            {task.task_description}
                                          </Text>
                                        )}
                                        
                                        <Group gap="xs">
                                          <Badge
                                            size="xs"
                                            color={getStatusColor(task.task_status)}
                                            variant="light"
                                          >
                                            {task.task_status}
                                          </Badge>
                                          
                                          {task.estimated_hours && (
                                            <Badge size="xs" variant="outline">
                                              {task.estimated_hours}h
                                            </Badge>
                                          )}
                                          
                                          {task.assigned_crew.length > 0 && (
                                            <Group gap={2}>
                                              {task.assigned_crew.slice(0, 3).map((crew, index) => (
                                                <Tooltip key={index} label={crew.crew_name}>
                                                  <Avatar size="xs" radius="xl">
                                                    <IconUser size={10} />
                                                  </Avatar>
                                                </Tooltip>
                                              ))}
                                              {task.assigned_crew.length > 3 && (
                                                <Text size="xs" c="dimmed">
                                                  +{task.assigned_crew.length - 3}
                                                </Text>
                                              )}
                                            </Group>
                                          )}
                                        </Group>
                                      </div>
                                    </Group>

                                    <Group gap="xs" onClick={(e) => e.stopPropagation()}>
                                      {task.task_status !== 'completed' && (
                                        <Select
                                          size="xs"
                                          value={task.task_status}
                                          onChange={(value) => value && handleStatusChange(task.project_task_id, value as TaskStatusType)}
                                          data={[
                                            { value: 'pending', label: 'Pending' },
                                            { value: 'ongoing', label: 'Ongoing' },
                                            { value: 'completed', label: 'Completed' },
                                            { value: 'escalated', label: 'Escalated' },
                                          ]}
                                          w={100}
                                        />
                                      )}

                                      <Menu shadow="md" width={200}>
                                        <Menu.Target>
                                          <ActionIcon variant="subtle" size="sm">
                                            <IconDots size={14} />
                                          </ActionIcon>
                                        </Menu.Target>

                                        <Menu.Dropdown>
                                          {onTaskEdit && (
                                            <Menu.Item
                                              leftSection={<IconEdit size={14} />}
                                              onClick={() => onTaskEdit(task)}
                                            >
                                              Edit Task
                                            </Menu.Item>
                                          )}
                                        </Menu.Dropdown>
                                      </Menu>
                                    </Group>
                                  </Group>
                                </Card>
                              ))}
                            </Stack>
                          </Collapse>
                        </Card>
                      );
                    })}
                  </Stack>
                </Collapse>
              </Card>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
