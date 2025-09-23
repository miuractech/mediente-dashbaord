import { useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
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
  Tabs,
  Badge,
  SegmentedControl,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconCheck,
  IconClock,
  IconAlertTriangle,
  IconList,
} from '@tabler/icons-react';
import { PaginatedTaskListComponent } from '../projects/PaginatedTaskListComponent';
import { TaskDrawer } from '../projects/TaskDrawer';
import { useProject, useCurrentStepCompletion } from '../projects/project.hook';
import { useAutoRefresh } from '../projects/useAutoRefresh.hook';
import { useGlobalTaskRefresh } from '../projects/useGlobalTaskRefresh.hook';

export default function ProjectTasksView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const statusParam = searchParams.get('status');
  
  const [activeTab, setActiveTab] = useState<string | null>(
    statusParam || 'overview'
  );
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskDrawerOpened, setTaskDrawerOpened] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table');

  const { project, loading, error, refetch } = useProject(projectId || null);
  const { 
    autoLoadingNext, 
    refetch: refetchStepCompletion 
  } = useCurrentStepCompletion(projectId || null);

  // Silent refresh handler
  const handleSilentRefresh = useCallback(() => {
    refetch(true);
    refetchStepCompletion();
  }, [refetch, refetchStepCompletion]);

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
    { title: 'Tasks', href: null },
  ].map((item, index) => (
    item.href ? (
      <Anchor key={index} onClick={() => navigate(item.href)}>
        {item.title}
      </Anchor>
    ) : (
      <Text key={index}>{item.title}</Text>
    )
  ));

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
            {project.project_name} - Tasks
          </Text>
          <Group gap="xs" mt="xs">
            <Badge color="green" variant="light">
              Running Tasks
            </Badge>
            <Badge color="orange" variant="light">
              {project.pending_tasks || 0} Pending
            </Badge>
            {project.escalated_tasks > 0 && (
              <Badge color="red" variant="light">
                {project.escalated_tasks} Escalated
              </Badge>
            )}
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

      {/* View Toggle and Tabs */}
      <Group justify="space-between" align="flex-end">
        <Tabs value={activeTab} onChange={setActiveTab} style={{ flex: 1 }}>
          <Tabs.List>
            <Tabs.Tab value="overview" leftSection={<IconList size={16} />}>
              Running Tasks
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
        </Tabs>

        <SegmentedControl
          data={[
            { label: 'Card', value: 'card' },
            { label: 'Table', value: 'table' },
          ]}
          value={viewMode}
          onChange={(value) => setViewMode(value as 'card' | 'table')}
          size="sm"
        />
      </Group>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <div style={{ display: 'none' }}>
          <Tabs.List>
            <div></div>
          </Tabs.List>
        </div>

        <Tabs.Panel value="overview" pt="md">
          <Stack gap="lg">
            {/* Current Running Tasks */}
            <PaginatedTaskListComponent
              projectId={projectId || ''}
              onTaskClick={handleTaskClick}
              statusFilter={['ongoing' as const, 'escalated' as const]}
              showStepInfo={true}
              viewMode={viewMode}
              showUpcoming={true}
            />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="pending" pt="md">
          <PaginatedTaskListComponent
            projectId={projectId || ''}
            onTaskClick={handleTaskClick}
            statusFilter={['pending' as const]}
            viewMode={viewMode}
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
              viewMode={viewMode}
            />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="completed" pt="md">
          <PaginatedTaskListComponent
            projectId={projectId || ''}
            onTaskClick={handleTaskClick}
            showOnlyCompleted={true}
            viewMode={viewMode}
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
