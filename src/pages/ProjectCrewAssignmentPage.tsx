import { useState, useEffect } from 'react';
import { useDebouncedValue } from '@mantine/hooks';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Stack,
  Group,
  Text,
  Button,
  Card,
  Badge,
  Avatar,
  Alert,
  Loader,
  Center,
  Breadcrumbs,
  Anchor,
  SimpleGrid,
  TextInput,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconCheck,
  IconAlertCircle,
  IconUser,
  IconSearch,
  IconTrash,
  IconPlus,
} from '@tabler/icons-react';
import {
  useProject,
  useProjectRoles,
  useProjectCrewAssignments,
  useAvailableCrew,
  useAssignCrewToRole,
  useRemoveCrewFromProject,
  useProjectCanStart,
} from '../projects/project.hook';

export default function ProjectCrewAssignmentPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebouncedValue(searchTerm, 300);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  const { project, loading: projectLoading } = useProject(projectId || null);
  const { roles, loading: rolesLoading, refetch: refetchRoles } = useProjectRoles(projectId || null);
  const { assignments, loading: assignmentsLoading, refetch: refetchAssignments } = useProjectCrewAssignments(projectId || null);
  const { crew, loading: crewLoading } = useAvailableCrew(debouncedSearchTerm);
  const { assignCrew, loading: assignLoading } = useAssignCrewToRole();
  const { removeCrew, loading: removeLoading } = useRemoveCrewFromProject();
  const { canStart, refetch: refetchCanStart } = useProjectCanStart(projectId || null);

  const loading = projectLoading || rolesLoading || assignmentsLoading;

  // Get assigned crew IDs to filter out from available crew
  // Backend search is now handled by the useAvailableCrew hook
  const assignedCrewIds = assignments.map(a => a.crew.id);
  const availableCrew = crew.filter(c => !assignedCrewIds.includes(c.id));

  // Get roles grouped by fill status
  const filledRoles = roles.filter(r => assignments.some(a => a.role.role_id === r.role_id));
  const unfilledRoles = roles.filter(r => !assignments.some(a => a.role.role_id === r.role_id));

  const handleAssignCrew = async (crewId: string, roleId: string) => {
    if (!projectId) return;

    const success = await assignCrew({
      project_id: projectId,
      role_id: roleId,
      crew_id: crewId,
    });

    if (success) {
      refetchRoles();
      refetchAssignments();
      refetchCanStart();
    }
  };

  const handleRemoveCrew = async (assignmentId: string) => {
    const success = await removeCrew(assignmentId);
    if (success) {
      refetchRoles();
      refetchAssignments();
      refetchCanStart();
    }
  };

  if (!project) {
    return (
      <Stack gap="md" p="md">
        <Alert color="red" title="Error">
          Project not found.
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
            Crew Assignment - {project.project_name}
          </Text>
          <Text size="sm" c="dimmed" mt="xs">
            Assign crew members to project roles
          </Text>
        </div>
        
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate(`/admin/projects/${projectId}`)}
        >
          Back to Project
        </Button>
      </Group>

      {/* Project Status Alert */}
      {canStart === false && (
        <Alert icon={<IconAlertCircle size={16} />} color="orange">
          Complete all role assignments to start the project ({assignments.length} of {roles.length} roles filled)
        </Alert>
      )}

      {canStart === true && (
        <Alert icon={<IconCheck size={16} />} color="green">
          All roles are filled! Project is ready to start.
        </Alert>
      )}

      {loading ? (
        <Center h={400}>
          <Loader size="lg" />
        </Center>
      ) : (
        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
          {/* Roles Section */}
          <Stack gap="md">
            <Text size="lg" fw={600}>Project Roles</Text>

            {/* Unfilled Roles */}
            {unfilledRoles.length > 0 && (
              <Card withBorder p="md">
                <Text fw={500} mb="md" c="orange">
                  Unfilled Roles ({unfilledRoles.length})
                </Text>
                <Stack gap="sm">
                  {unfilledRoles.map((role) => (
                    <Card
                      key={role.role_id}
                      withBorder
                      p="sm"
                      style={{
                        cursor: 'pointer',
                        backgroundColor: selectedRoleId === role.role_id ? 'var(--mantine-color-orange-0)' : undefined,
                      }}
                      onClick={() => setSelectedRoleId(selectedRoleId === role.role_id ? null : role.role_id)}
                    >
                      <Group justify="space-between">
                        <div>
                          <Text fw={500}>{role.role_name}</Text>
                          <Text size="sm" c="dimmed">{role.department_name}</Text>
                        </div>
                        <Badge variant="outline" color="orange">
                          Unfilled
                        </Badge>
                      </Group>
                    </Card>
                  ))}
                </Stack>
              </Card>
            )}

            {/* Filled Roles */}
            {assignments.length > 0 && (
              <Card withBorder p="md">
                <Text fw={500} mb="md" c="green">
                  Assigned Roles ({assignments.length})
                </Text>
                <Stack gap="sm">
                  {assignments.map((assignment) => (
                    <Card key={assignment.assignment_id} withBorder p="sm">
                      <Group justify="space-between">
                        <Group gap="sm">
                          <Avatar
                            src={assignment.crew.photo_url}
                            size="sm"
                            radius="xl"
                          >
                            <IconUser size={16} />
                          </Avatar>
                          <div>
                            <Text fw={500}>{assignment.crew.name}</Text>
                            <Text size="xs" c="dimmed">{assignment.crew.email}</Text>
                            <Badge size="xs" variant="light">
                              {assignment.role.role_name} - {assignment.role.department_name}
                            </Badge>
                          </div>
                        </Group>
                        <ActionIcon
                          color="red"
                          variant="subtle"
                          onClick={() => handleRemoveCrew(assignment.assignment_id)}
                          loading={removeLoading}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Card>
                  ))}
                </Stack>
              </Card>
            )}
          </Stack>

          {/* Available Crew Section */}
          <Stack gap="md">
            <Group justify="space-between">
              <Text size="lg" fw={600}>Available Crew</Text>
              <TextInput
                placeholder="Search crew members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftSection={<IconSearch size={16} />}
                w={250}
              />
            </Group>

            {selectedRoleId && (
              <Alert color="blue" variant="light">
                <Text size="sm">
                  Click on a crew member below to assign them to the selected role: {' '}
                  <Text component="span" fw={500}>
                    {unfilledRoles.find(r => r.role_id === selectedRoleId)?.role_name}
                  </Text>
                </Text>
              </Alert>
            )}

            <Card withBorder p="md" mih={400}>
              {crewLoading ? (
                <Center h={300}>
                  <Loader size="sm" />
                </Center>
              ) : availableCrew.length === 0 ? (
                <Center h={300}>
                  <Text c="dimmed">
                    {searchTerm ? 'No crew members found matching your search' : 'All crew members are already assigned'}
                  </Text>
                </Center>
              ) : (
                <Stack gap="xs" mah={500} style={{ overflowY: 'auto' }}>
                  {availableCrew.map((member) => (
                    <Card
                      key={member.id}
                      withBorder
                      p="sm"
                      style={{
                        cursor: selectedRoleId ? 'pointer' : 'default',
                        opacity: selectedRoleId ? 1 : 0.7,
                      }}
                      onClick={() => {
                        if (selectedRoleId) {
                          handleAssignCrew(member.id, selectedRoleId);
                          setSelectedRoleId(null);
                        }
                      }}
                    >
                      <Group gap="sm">
                        <Avatar
                          src={member.photo_url}
                          size="sm"
                          radius="xl"
                        >
                          <IconUser size={16} />
                        </Avatar>
                        <div style={{ flex: 1 }}>
                          <Text fw={500}>{member.name}</Text>
                          <Text size="xs" c="dimmed">{member.email}</Text>
                          {member.phone && (
                            <Text size="xs" c="dimmed">{member.phone}</Text>
                          )}
                        </div>
                        {selectedRoleId && (
                          <Tooltip label="Click to assign to selected role">
                            <ActionIcon variant="light" color="blue" size="sm">
                              <IconPlus size={14} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Group>
                    </Card>
                  ))}
                </Stack>
              )}
            </Card>
          </Stack>
        </SimpleGrid>
      )}
    </Stack>
  );
}
