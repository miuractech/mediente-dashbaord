import { useCallback, useEffect } from 'react';
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
  Badge,
  Image,
  Progress,
  SimpleGrid,
  Paper,
  ActionIcon,
  Tooltip,
  Title,
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
  IconChartBar,
  IconEye,
} from '@tabler/icons-react';
import { useProject, useCurrentStepCompletion, useStartProject } from '../projects/project.hook';
import { useAutoRefresh } from '../projects/useAutoRefresh.hook';
import { useGlobalTaskRefresh } from '../projects/useGlobalTaskRefresh.hook';

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

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
          
          const success = await startProject(project.project_id);
          if (success) {
            
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

  // Use template-based progress calculation for accurate completion percentage
  const progressPercentage = project.completion_percentage || 0;


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

      {/* Project Overview Dashboard */}
      <Card withBorder p="xl">
        <Stack gap="xl">
          {/* Project Header with Key Stats */}
          <Group justify="space-between" align="flex-start">
            <Stack gap="xs" flex={1}>
              <Title order={2}>Project Overview</Title>
              <Text size="sm" c="dimmed" maw={400}>
                {project.project_description || 'No description provided'}
              </Text>
            </Stack>
            
            {project.image_url && (
              <Image
                src={project.image_url}
                alt={project.project_name}
                w={120}
                h={80}
                radius="md"
                fallbackSrc="https://placehold.co/120x80?text=No+Image"
              />
            )}
          </Group>

          {/* Key Statistics Grid */}
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="lg">
            <Paper withBorder p="md" ta="center">
              <Group justify="center" gap="xs" mb="xs">
                <IconChartBar size={20} color="var(--mantine-color-blue-6)" />
                <Text fw={600} c="blue">Progress</Text>
              </Group>
              <Text size="xl" fw={700} c="blue">
                {progressPercentage}%
              </Text>
              <Progress
                value={progressPercentage}
                size="sm"
                color={escalatedTasksCount > 0 ? 'red' : progressPercentage === 100 ? 'green' : 'blue'}
                mt="xs"
                radius="xl"
              />
            </Paper>
            
            <Paper withBorder p="md" ta="center">
              <Group justify="center" gap="xs" mb="xs">
                <IconCheck size={20} color="var(--mantine-color-green-6)" />
                <Text fw={600} c="green">Completed</Text>
              </Group>
              <Text size="xl" fw={700} c="green">
                {project.completed_tasks}
              </Text>
              <Text size="xs" c="dimmed">
                of {project.total_tasks} total
              </Text>
            </Paper>
            
            <Paper withBorder p="md" ta="center">
              <Group justify="center" gap="xs" mb="xs">
                <IconClock size={20} color="var(--mantine-color-orange-6)" />
                <Text fw={600} c="orange">Active</Text>
              </Group>
              <Text size="xl" fw={700} c="orange">
                {project.loaded_tasks || 0}
              </Text>
              <Text size="xs" c="dimmed">tasks loaded</Text>
            </Paper>
            
            <Paper withBorder p="md" ta="center">
              <Group justify="center" gap="xs" mb="xs">
                <IconAlertTriangle size={20} color="var(--mantine-color-red-6)" />
                <Text fw={600} c="red">Escalated</Text>
              </Group>
              <Text size="xl" fw={700} c="red">
                {escalatedTasksCount}
              </Text>
              <Text size="xs" c="dimmed">need attention</Text>
            </Paper>
          </SimpleGrid>

          {/* Project Timeline and Status */}
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
            <Paper withBorder p="md">
              <Group gap="xs" mb="md">
                <IconCalendar size={18} color="var(--mantine-color-blue-6)" />
                <Text fw={600}>Timeline</Text>
              </Group>
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Start Date</Text>
                  <Badge variant="light" color="blue" size="sm">
                    {project.project_start_date 
                      ? new Date(project.project_start_date).toLocaleDateString()
                      : 'Not set'
                    }
                  </Badge>
                </Group>
                {project.project_end_date && (
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">End Date</Text>
                    <Badge variant="light" color="orange" size="sm">
                      {new Date(project.project_end_date).toLocaleDateString()}
                    </Badge>
                  </Group>
                )}
              </Stack>
            </Paper>

            <Paper withBorder p="md">
              <Group gap="xs" mb="md">
                <IconInfoCircle size={18} color="var(--mantine-color-green-6)" />
                <Text fw={600}>Status</Text>
              </Group>
              <Group gap="md">
                <Badge 
                  color={project.project_status === 'active' ? 'blue' : 'gray'} 
                  variant="filled" 
                  size="lg"
                >
                  {project.project_status.charAt(0).toUpperCase() + project.project_status.slice(1)}
                </Badge>
                {escalatedTasksCount > 0 && (
                  <Badge color="red" variant="light" size="sm">
                    {escalatedTasksCount} Issues
                  </Badge>
                )}
              </Group>
            </Paper>
          </SimpleGrid>

          {/* Escalation Alert */}
          {escalatedTasksCount > 0 && (
            <Alert color="red" variant="light">
              <Group gap="sm">
                <IconAlertTriangle size={16} />
                <Text size="sm">
                  <strong>{escalatedTasksCount} task{escalatedTasksCount > 1 ? 's' : ''}</strong> require immediate attention and may be blocking project progress.
                </Text>
              </Group>
            </Alert>
          )}
        </Stack>
      </Card>

      {/* View Navigation */}
      <Card withBorder p="md">
        <Stack gap="md">
          <Group gap="xs">
            <IconEye size={18} color="var(--mantine-color-blue-6)" />
            <Text fw={600}>Project Views</Text>
          </Group>
          
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
            <Button
              variant="light"
              leftSection={<IconList size={16} />}
              onClick={() => navigate(`/admin/projects/${projectId}/tasks`)}
              fullWidth
            >
              View All Tasks
              <Badge ml="auto" size="xs" variant="filled">
                {project.loaded_tasks || 0}
              </Badge>
            </Button>
            
            <Button
              variant="light"
              leftSection={<IconCalendar size={16} />}
              onClick={() => navigate(`/admin/projects/${projectId}/calendar`)}
              fullWidth
            >
              Calendar View
            </Button>
            
            <Button
              variant="light"
              leftSection={<IconAlertTriangle size={16} />}
              onClick={() => navigate(`/admin/projects/${projectId}/tasks?status=escalated`)}
              fullWidth
              color="red"
              disabled={escalatedTasksCount === 0}
            >
              Escalated Tasks
              {escalatedTasksCount > 0 && (
                <Badge ml="auto" size="xs" variant="filled" color="red">
                  {escalatedTasksCount}
                </Badge>
              )}
            </Button>
            
            <Button
              variant="light"
              leftSection={<IconCheck size={16} />}
              onClick={() => navigate(`/admin/projects/${projectId}/tasks?status=completed`)}
              fullWidth
              color="green"
            >
              Completed Tasks
              <Badge ml="auto" size="xs" variant="filled" color="green">
                {project.completed_tasks}
              </Badge>
            </Button>
          </SimpleGrid>
        </Stack>
      </Card>



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

    </Stack>
  );
}