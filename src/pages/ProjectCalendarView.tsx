import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Stack,
  Group,
  Button,
  Text,
  Alert,
  Loader,
  Center,
  Breadcrumbs,
  Anchor,
  Badge,
  Card,
  SimpleGrid,
  Paper,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconCalendar,
  IconClock,
  IconCheck,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { useProject } from '../projects/project.hook';
import { useAutoRefresh } from '../projects/useAutoRefresh.hook';
import { useGlobalTaskRefresh } from '../projects/useGlobalTaskRefresh.hook';

export default function ProjectCalendarView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const { project, loading, error, refetch } = useProject(projectId || null);

  // Silent refresh handler
  const handleSilentRefresh = useCallback(() => {
    refetch(true);
  }, [refetch]);

  // Set up auto-refresh every 2 minutes when window is active
  useAutoRefresh({
    enabled: !!projectId,
    interval: 120000,
    onRefresh: handleSilentRefresh,
  });

  // Listen for global task updates
  useGlobalTaskRefresh(projectId || null, () => {
    handleSilentRefresh();
  });

  if (loading) {
    return (
      <Center h="100vh">
        <Loader size="lg" />
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

  const breadcrumbItems = [
    { title: 'Projects', href: '/admin/projects' },
    { title: project.project_name, href: `/admin/projects/${projectId}` },
    { title: 'Calendar', href: null },
  ].map((item, index) => (
    item.href ? (
      <Anchor key={index} onClick={() => navigate(item.href)}>
        {item.title}
      </Anchor>
    ) : (
      <Text key={index}>{item.title}</Text>
    )
  ));

  return (
    <Stack gap="md" p="md">
      {/* Breadcrumbs */}
      <Breadcrumbs>{breadcrumbItems}</Breadcrumbs>

      {/* Header */}
      <Group justify="space-between">
        <div>
          <Text size="xl" fw={700}>
            {project.project_name} - Calendar
          </Text>
          <Group gap="xs" mt="xs">
            <Badge color="blue" variant="light">
              Project Timeline
            </Badge>
          </Group>
        </div>
        
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate(`/admin/projects/${projectId}`)}
        >
          Back to Overview
        </Button>
      </Group>

      {/* Project Timeline Overview */}
      <Card withBorder p="md">
        <Group gap="xs" mb="md">
          <IconCalendar size={18} color="var(--mantine-color-blue-6)" />
          <Text fw={600}>Project Timeline</Text>
        </Group>
        
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
          <Paper withBorder p="md" ta="center">
            <Group justify="center" gap="xs" mb="xs">
              <IconCalendar size={16} color="var(--mantine-color-blue-6)" />
              <Text fw={500} c="blue">Start Date</Text>
            </Group>
            <Text size="lg" fw={700}>
              {project.project_start_date 
                ? new Date(project.project_start_date).toLocaleDateString()
                : 'Not set'
              }
            </Text>
          </Paper>
          
          {project.project_end_date && (
            <Paper withBorder p="md" ta="center">
              <Group justify="center" gap="xs" mb="xs">
                <IconClock size={16} color="var(--mantine-color-orange-6)" />
                <Text fw={500} c="orange">End Date</Text>
              </Group>
              <Text size="lg" fw={700}>
                {new Date(project.project_end_date).toLocaleDateString()}
              </Text>
            </Paper>
          )}
          
          <Paper withBorder p="md" ta="center">
            <Group justify="center" gap="xs" mb="xs">
              <IconCheck size={16} color="var(--mantine-color-green-6)" />
              <Text fw={500} c="green">Progress</Text>
            </Group>
            <Text size="lg" fw={700}>
              {project.completion_percentage || 0}%
            </Text>
          </Paper>
          
          <Paper withBorder p="md" ta="center">
            <Group justify="center" gap="xs" mb="xs">
              <IconAlertTriangle size={16} color="var(--mantine-color-red-6)" />
              <Text fw={500} c="red">Status</Text>
            </Group>
            <Badge 
              color={project.project_status === 'active' ? 'blue' : 'gray'} 
              variant="filled" 
              size="lg"
            >
              {project.project_status.charAt(0).toUpperCase() + project.project_status.slice(1)}
            </Badge>
          </Paper>
        </SimpleGrid>
      </Card>

      {/* Calendar Placeholder - Future Enhancement */}
      <Card withBorder p="xl">
        <Stack align="center" gap="md">
          <IconCalendar size={48} color="var(--mantine-color-gray-5)" />
          <Text size="lg" fw={600} c="dimmed">
            Calendar View Coming Soon
          </Text>
          <Text size="sm" c="dimmed" ta="center" maw={400}>
            This view will show task schedules, deadlines, and project milestones in a calendar format. 
            For now, you can view tasks in the task list.
          </Text>
          <Button
            variant="light"
            onClick={() => navigate(`/admin/projects/${projectId}/tasks`)}
          >
            View Tasks List
          </Button>
        </Stack>
      </Card>

      {/* Quick Stats */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
        <Paper withBorder p="md" ta="center">
          <Text size="xs" c="dimmed" mb="xs">Total Tasks</Text>
          <Text size="xl" fw={700} c="blue">
            {project.total_tasks}
          </Text>
        </Paper>
        
        <Paper withBorder p="md" ta="center">
          <Text size="xs" c="dimmed" mb="xs">Completed</Text>
          <Text size="xl" fw={700} c="green">
            {project.completed_tasks}
          </Text>
        </Paper>
        
        <Paper withBorder p="md" ta="center">
          <Text size="xs" c="dimmed" mb="xs">Active</Text>
          <Text size="xl" fw={700} c="orange">
            {project.loaded_tasks || 0}
          </Text>
        </Paper>
        
        <Paper withBorder p="md" ta="center">
          <Text size="xs" c="dimmed" mb="xs">Escalated</Text>
          <Text size="xl" fw={700} c="red">
            {project.escalated_tasks || 0}
          </Text>
        </Paper>
      </SimpleGrid>
    </Stack>
  );
}
