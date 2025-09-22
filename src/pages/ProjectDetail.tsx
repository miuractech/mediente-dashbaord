import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Stack,
  Group,
  Button,
  Text,
  Card,
  Alert,
  Loader,
  Center,
  Breadcrumbs,
  Anchor,
  Tabs,
  Badge,
  Image,
  Progress,
  SimpleGrid,
  Paper,
  Divider,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconUsers,
  IconCheck,
  IconClock,
  IconAlertTriangle,
  IconList,
  IconCalendar,
  IconExternalLink,
  IconRefresh,
  IconInfoCircle,
} from '@tabler/icons-react';
import { PaginatedTaskListComponent } from '../projects/PaginatedTaskListComponent';
import { TaskDrawer } from '../projects/TaskDrawer';
import { useProject, useCurrentStepCompletion, useStartProject } from '../projects/project.hook';
import { useAutoRefresh } from '../projects/useAutoRefresh.hook';
import { useGlobalTaskRefresh } from '../projects/useGlobalTaskRefresh.hook';

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string | null>('overview');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskDrawerOpened, setTaskDrawerOpened] = useState(false);

  const { project, loading, error, refetch } = useProject(projectId || null);
  const { 
    isCompleted: stepCompleted, 
    stepInfo, 
    autoLoadingNext, 
    refetch: refetchStepCompletion 
  } = useCurrentStepCompletion(projectId || null);
  const { startProject, loading: startingProject } = useStartProject();

  // Manual refresh handler (visible refresh)
  const handleManualRefresh = useCallback(() => {
    refetch(false); // Show loading for manual refresh
    refetchStepCompletion();
  }, [refetch, refetchStepCompletion]);

  // Silent refresh handler (for auto-refresh and global updates)
  const handleSilentRefresh = useCallback(() => {
    refetch(true); // Silent refresh without loading indicator
    refetchStepCompletion();
  }, [refetch, refetchStepCompletion]);

  // Set up auto-refresh every 2 minutes when window is active
  const { isActive, isWindowActive } = useAutoRefresh({
    enabled: !!projectId,
    interval: 120000, // 2 minutes
    onRefresh: handleSilentRefresh, // Use silent refresh for auto-refresh
  });

  // Listen for global task updates to refresh project stats
  useGlobalTaskRefresh(projectId || null, (taskId) => {
    handleSilentRefresh();
    // If this is a step completion check, also refresh step completion
    if (taskId === 'step-check') {
      refetchStepCompletion();
    }
  }); // Use silent refresh for global updates

  // Auto-start project if it has no tasks but all roles are filled
  useEffect(() => {
    const autoStartProjectIfNeeded = async () => {
      if (project && 
          project.unfilled_roles === 0 && 
          project.total_tasks === 0 && 
          project.project_status === 'active' && 
          !startingProject) {
        try {
          console.log('Project has no loaded tasks, attempting to auto-start:', project.project_id);
          const success = await startProject(project.project_id);
          if (success) {
            console.log('Project auto-started successfully, refreshing data');
            // Refresh project data to get the loaded tasks
            setTimeout(() => {
              handleSilentRefresh();
              refetchStepCompletion();
            }, 500); // Small delay to ensure DB operations complete
          }
        } catch (error) {
          console.error('Failed to auto-start project:', error);
          // Even if auto-start fails, the user can still see the project
          // They might need to manually start it or check crew assignments
        }
      }
    };

    // Only run auto-start check if we have project data and it's not currently loading
    if (project && !loading) {
      autoStartProjectIfNeeded();
    }
  }, [project, startProject, startingProject, handleSilentRefresh, refetchStepCompletion, loading]);

  // Tasks are now handled by SimpleTaskListComponent

  if (loading || startingProject) {
    return (
      <Center h="100vh">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          {startingProject && (
            <Text size="sm" c="dimmed">
              Starting project and loading initial tasks...
            </Text>
          )}
        </Stack>
      </Center>
    );
  }

  if (error || !project) {
    return (
      <Stack gap="md" p="md">
        <Alert color="red" title="Error">
          Project not found or failed to load.
        </Alert>
        <Button onClick={() => navigate('/admin/projects')}>
          Back to Projects
        </Button>
      </Stack>
    );
  }

  // Check if crew assignment is complete - redirect to crew management if not
  if (project.unfilled_roles > 0) {
    return (
      <Stack gap="md" p="md">
        <Alert color="orange" title="Crew Assignment Required">
          This project has {project.unfilled_roles} unfilled roles. Please complete crew assignments before accessing project details.
        </Alert>
        <Group>
          <Button onClick={() => navigate('/admin/projects')}>
            Back to Projects
          </Button>
          <Button 
            onClick={() => navigate(`/admin/projects/${projectId}/crew-management`)}
            variant="filled"
          >
            Manage Crew Assignments
          </Button>
        </Group>
      </Stack>
    );
  }

  // Check if project has no tasks and show manual start option
  if (project.total_tasks === 0 && project.unfilled_roles === 0 && !startingProject) {
    return (
      <Stack gap="md" p="md">
        <Alert color="blue" title="Project Ready to Start">
          All crew assignments are complete. Click below to start the project and load the initial tasks.
        </Alert>
        <Group>
          <Button onClick={() => navigate('/admin/projects')}>
            Back to Projects
          </Button>
          <Button 
            onClick={async () => {
              const success = await startProject(project.project_id);
              if (success) {
                setTimeout(() => {
                  handleSilentRefresh();
                  refetchStepCompletion();
                }, 500);
              }
            }}
            variant="filled"
            loading={startingProject}
          >
            Start Project
          </Button>
        </Group>
      </Stack>
    );
  }

  const breadcrumbItems = [
    { title: 'Projects', href: '/admin/projects' },
    { title: project.project_name, href: null },
  ].map((item, index) => (
    item.href ? (
      <Anchor key={index} onClick={() => navigate(item.href)}>
        {item.title}
      </Anchor>
    ) : (
      <Text key={index}>{item.title}</Text>
    )
  ));

  // Use project stats for escalated tasks count
  const escalatedTasksCount = project?.escalated_tasks || 0;

  // Current phase/step info is now handled by the SimpleTaskListComponent

  // Use template-based progress calculation for accurate completion percentage
  const progressPercentage = project.completion_percentage || 0;

  const handleTaskClick = (taskId: string) => {
    navigate(`/admin/projects/${projectId}/tasks/${taskId}`);
  };

  const handleTaskDrawerClose = () => {
    setTaskDrawerOpened(false);
    setSelectedTaskId(null);
  };


  return (
    <Stack gap="md" p="md">
      {/* Breadcrumbs */}
      <Breadcrumbs>{breadcrumbItems}</Breadcrumbs>

      {/* Header */}
      <Group justify="space-between">
        <div>
          <Text size="xl" fw={700}>
            {project.project_name}
          </Text>
          <Group gap="xs" mt="xs">
            <Badge color={project.project_status === 'active' ? 'blue' : 'gray'} variant="light">
              {project.project_status.charAt(0).toUpperCase() + project.project_status.slice(1)}
            </Badge>
            {escalatedTasksCount > 0 && (
              <Badge color="red" variant="light">
                {escalatedTasksCount} Escalated
              </Badge>
            )}
          </Group>
        </div>
        
        <Group>
          <Tooltip label={`Auto-refresh ${isActive ? 'active' : 'paused'} (${isWindowActive ? 'window active' : 'window inactive'})`}>
            <ActionIcon
              variant="light"
              size="lg"
              onClick={handleManualRefresh}
              loading={loading}
              color={isActive ? 'blue' : 'gray'}
            >
              <IconRefresh size={18} />
            </ActionIcon>
          </Tooltip>
          
          <Tooltip label="Manage Crew Assignments">
            <Button
              leftSection={<IconUsers size={16} />}
              rightSection={<IconExternalLink size={14} />}
              onClick={() => navigate(`/admin/projects/${projectId}/crew-management`)}
              variant="light"
            >
              Crew Management
            </Button>
          </Tooltip>
          
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate('/admin/projects')}
          >
            Back to Projects
          </Button>
        </Group>
      </Group>

      {/* Enhanced Project Overview Card */}
      <Card withBorder p="md">
      

        <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="lg">
          {/* Description & Status Column */}
          <Stack gap="md">
            <div>
              <Group gap="xs" mb="xs">
                <IconList size={16} color="var(--mantine-color-blue-6)" />
                <Text fw={500}>Description</Text>
              </Group>
              <Text size="sm" c="dimmed" mb="md">
                {project.project_description || 'No description provided'}
              </Text>
            </div>

            <Divider />

            {/* Statistics in Description Area */}
            <div>
              <Group gap="xs" mb="md">
                <Text fw={500}>Project Statistics</Text>
                <Tooltip 
                  label="Total tasks shows all tasks from template. Loaded tasks shows currently active tasks. Progress is calculated against template total."
                  position="top"
                  multiline
                  w={250}
                >
                  <ActionIcon variant="subtle" size="xs">
                    <IconInfoCircle size={12} />
                  </ActionIcon>
                </Tooltip>
              </Group>
              <SimpleGrid cols={2} spacing="sm">
                <Paper withBorder p="sm" ta="center">
                  <Text size="lg" fw={700} c="blue">
                    {project.total_tasks}
                  </Text>
                  <Text size="xs" c="dimmed">Total Tasks (Template)</Text>
                </Paper>
                
                <Paper withBorder p="sm" ta="center">
                  <Text size="lg" fw={700} c="green">
                    {project.completed_tasks}
                  </Text>
                  <Text size="xs" c="dimmed">Completed</Text>
                </Paper>
                
                <Paper withBorder p="sm" ta="center">
                  <Text size="lg" fw={700} c="orange">
                    {project.loaded_tasks || 0}
                  </Text>
                  <Text size="xs" c="dimmed">Loaded Tasks</Text>
                </Paper>
                
                <Paper withBorder p="sm" ta="center">
                  <Text size="lg" fw={700} c="red">
                    {project.escalated_tasks}
                  </Text>
                  <Text size="xs" c="dimmed">Escalated</Text>
                </Paper>
              </SimpleGrid>
            </div>
          </Stack>

          {/* Timeline Column */}
          <Stack gap="md">
            <div>
              <Group gap="xs" mb="xs">
                <IconCalendar size={16} color="var(--mantine-color-green-6)" />
                <Text fw={500}>Project Timeline</Text>
              </Group>
              <Stack gap="md">
                <div>
                  <Text size="xs" c="dimmed" mb="xs">Start Date</Text>
                  <Badge variant="light" color="blue" size="sm">
                    {project.project_start_date 
                      ? new Date(project.project_start_date).toLocaleDateString()
                      : 'Not set'
                    }
                  </Badge>
                </div>
                {project.project_end_date && (
                  <div>
                    <Text size="xs" c="dimmed" mb="xs">End Date</Text>
                    <Badge variant="light" color="orange" size="sm">
                      {new Date(project.project_end_date).toLocaleDateString()}
                    </Badge>
                  </div>
                )}
                <div>
                  <Text size="xs" c="dimmed" mb="xs">Status</Text>
                  <Badge color={project.project_status === 'active' ? 'blue' : 'gray'} variant="filled" size="sm">
                    {project.project_status.charAt(0).toUpperCase() + project.project_status.slice(1)}
                  </Badge>
                </div>
              </Stack>
            </div>
          </Stack>

          {/* Image & Progress Column */}
          <Stack gap="md">
            {project.image_url && (
              <div>
                <Text fw={500} mb="xs">Project Image</Text>
                <Image
                  src={project.image_url}
                  alt={project.project_name}
                  h={180}
                  radius="md"
                  fallbackSrc="https://placehold.co/400x200?text=No+Image"
                />
              </div>
            )}

            <div>
              <Group justify="space-between" mb="xs">
                <Text fw={500}>Overall Progress</Text>
                <Text size="sm" fw={600} c={escalatedTasksCount > 0 ? 'red' : 'blue'}>
                  {progressPercentage}%
                </Text>
              </Group>
              <Progress
                value={progressPercentage}
                size="xl"
                color={escalatedTasksCount > 0 ? 'red' : progressPercentage === 100 ? 'green' : 'blue'}
                mb="xs"
                radius="md"
              />
              <Text size="xs" c="dimmed" ta="center">
                {project.completed_tasks} of {project.total_tasks} tasks completed ({Math.round(progressPercentage)}%)
              </Text>
              <Text size="xs" c="dimmed" ta="center" mt="xs">
                {project.loaded_tasks || 0} tasks currently loaded from template
              </Text>
              
              {escalatedTasksCount > 0 && (
                <Alert color="red" variant="light" mt="sm" p="xs">
                  <Group gap="xs">
                    <IconAlertTriangle size={16} />
                    <Text size="xs">
                      {escalatedTasksCount} task{escalatedTasksCount > 1 ? 's' : ''} require immediate attention
                    </Text>
                  </Group>
                </Alert>
              )}
            </div>
          </Stack>
        </SimpleGrid>
      </Card>


      {/* Tabs for different views */}
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="overview" leftSection={<IconList size={16} />}>
            All Active Tasks
          </Tabs.Tab>
          <Tabs.Tab value="pending" leftSection={<IconClock size={16} />}>
            Pending Tasks ({project.pending_tasks || 0})
          </Tabs.Tab>
          <Tabs.Tab value="escalated" leftSection={<IconAlertTriangle size={16} />}>
            Escalated Tasks ({project.escalated_tasks || 0})
          </Tabs.Tab>
          <Tabs.Tab value="completed" leftSection={<IconCheck size={16} />}>
            Completed Tasks ({project.completed_tasks || 0})
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          <PaginatedTaskListComponent
            projectId={projectId || ''}
            onTaskClick={handleTaskClick}
            statusFilter={['pending' as const, 'ongoing' as const, 'escalated' as const]}
            showStepInfo={true}
          />
        </Tabs.Panel>

        <Tabs.Panel value="pending" pt="md">
          <PaginatedTaskListComponent
            projectId={projectId || ''}
            onTaskClick={handleTaskClick}
            statusFilter={['pending' as const]}
          />
        </Tabs.Panel>

        <Tabs.Panel value="escalated" pt="md">
          <Stack gap="md">
            {project.escalated_tasks > 0 && (
              <Alert color="red" variant="light">
                <Group gap="xs">
                  <IconAlertTriangle size={16} />
                  <Text size="sm">
                    These tasks require immediate attention and may be blocking project progress.
                  </Text>
                </Group>
              </Alert>
            )}
            
            <PaginatedTaskListComponent
              projectId={projectId || ''}
              onTaskClick={handleTaskClick}
              statusFilter={['escalated' as const]}
            />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="completed" pt="md">
          <PaginatedTaskListComponent
            projectId={projectId || ''}
            onTaskClick={handleTaskClick}
            showOnlyCompleted={true}
          />
        </Tabs.Panel>
      </Tabs>

      {/* Automated Step Progression Status */}
      {autoLoadingNext && (
        <Alert color="blue" variant="light">
          <Group gap="sm">
            <Loader size="sm" />
            <Text>
              🎉 Step completed! Automatically loading next step tasks...
            </Text>
          </Group>
        </Alert>
      )}
      
      {/* Final Step/Phase Completion */}
      {stepCompleted && !autoLoadingNext && stepInfo && (
        <Alert color="green" variant="light">
          <Text>
            🎉 All tasks completed! This phase of the project is finished.
          </Text>
        </Alert>
      )}

      {/* Task Drawer */}
      <TaskDrawer
        taskId={selectedTaskId}
        opened={taskDrawerOpened}
        onClose={handleTaskDrawerClose}
        onTaskUpdate={refetch}
      />
    </Stack>
  );
}