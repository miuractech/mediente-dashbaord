import { useEffect, useState } from 'react';
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
} from '@mantine/core';
import { IconArrowLeft, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { CrewAssignmentModal } from '../projects/CrewAssignmentModal';
import { useProject, useProjectCanStart, useStartProject } from '../projects/project.hook';

export default function ProjectCrewAssignment() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [modalOpened, setModalOpened] = useState(true);

  const { project, loading, error } = useProject(projectId || null);
  const { canStart, loading: canStartLoading, refetch: refetchCanStart } = useProjectCanStart(projectId || null);
  const { startProject, loading: startLoading } = useStartProject();

  useEffect(() => {
    // If crew assignment is complete, auto-start the project and redirect
    if (canStart === true && project) {
      const autoStartProject = async () => {
        try {
          await startProject(project.project_id);
          navigate(`/admin/projects/${project.project_id}`, { replace: true });
        } catch (error) {
          console.error('Failed to auto-start project:', error);
          // Still redirect even if auto-start fails
          navigate(`/admin/projects/${project.project_id}`, { replace: true });
        }
      };
      
      autoStartProject();
    }
  }, [canStart, project, navigate, startProject]);

  const handleAssignmentSuccess = () => {
    refetchCanStart();
  };

  const handleModalClose = () => {
    setModalOpened(false);
    navigate('/admin/projects');
  };

  const handleContinueToProject = () => {
    if (project) {
      navigate(`/admin/projects/${project.project_id}`);
    }
  };

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
    { title: project.project_name, href: null },
    { title: 'Crew Assignment', href: null },
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
            Crew Assignment
          </Text>
          <Text size="sm" c="dimmed">
            Assign crew members to project roles before starting the project
          </Text>
        </div>
        
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate('/admin/projects')}
        >
          Back to Projects
        </Button>
      </Group>

      {/* Project Info Card */}
      <Card withBorder p="md">
        <Group justify="space-between" mb="md">
          <div>
            <Text fw={500} size="lg">
              {project.project_name}
            </Text>
            {project.project_description && (
              <Text size="sm" c="dimmed" mt="xs">
                {project.project_description}
              </Text>
            )}
          </div>
          
          {project.image_url && (
            <img
              src={project.image_url}
              alt={project.project_name}
              style={{
                width: 80,
                height: 80,
                objectFit: 'cover',
                borderRadius: 8,
              }}
            />
          )}
        </Group>

        {/* Status Alert */}
        {canStartLoading || startLoading ? (
          <Alert>
            <Loader size="sm" />
            {startLoading ? 'Starting project and loading tasks...' : 'Checking crew assignment status...'}
          </Alert>
        ) : canStart === false ? (
          <Alert icon={<IconAlertCircle size={16} />} color="orange">
            <Group justify="space-between">
              <div>
                <Text fw={500}>Crew Assignment Required</Text>
                <Text size="sm">
                  {project.unfilled_roles} of {project.total_roles} roles need to be filled before the project can start.
                </Text>
              </div>
              <Button
                size="sm"
                onClick={() => setModalOpened(true)}
              >
                Assign Crew
              </Button>
            </Group>
          </Alert>
        ) : (
          <Alert icon={<IconCheck size={16} />} color="green">
            <Group justify="space-between">
              <div>
                <Text fw={500}>All Roles Filled!</Text>
                <Text size="sm">
                  All {project.total_roles} roles have been assigned. The project is ready to start.
                </Text>
              </div>
              <Button
                size="sm"
                onClick={handleContinueToProject}
              >
                Continue to Project
              </Button>
            </Group>
          </Alert>
        )}
      </Card>

      {/* Role Assignment Stats */}
      <Card withBorder p="md">
        <Text fw={500} mb="md">
          Assignment Progress
        </Text>
        
        <Group justify="space-around">
          <Stack align="center" gap="xs">
            <Text size="lg" fw={700} c="green">
              {project.filled_roles}
            </Text>
            <Text size="sm" c="dimmed">
              Filled Roles
            </Text>
          </Stack>
          
          <Stack align="center" gap="xs">
            <Text size="lg" fw={700} c="orange">
              {project.unfilled_roles}
            </Text>
            <Text size="sm" c="dimmed">
              Unfilled Roles
            </Text>
          </Stack>
          
          <Stack align="center" gap="xs">
            <Text size="lg" fw={700}>
              {project.total_roles}
            </Text>
            <Text size="sm" c="dimmed">
              Total Roles
            </Text>
          </Stack>
        </Group>
      </Card>

      {/* Crew Assignment Modal */}
      <CrewAssignmentModal
        project={project}
        opened={modalOpened}
        onClose={handleModalClose}
        onSuccess={handleAssignmentSuccess}
      />
    </Stack>
  );
}