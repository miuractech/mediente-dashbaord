import { useState, useEffect } from 'react';
import {
  Modal,
  Text,
  Button,
  Group,
  Stack,
  Table,
  Select,
  Badge,
  ActionIcon,
  Card,
  Avatar,
  Alert,
  Loader,
  Center,
} from '@mantine/core';
import { IconTrash, IconCheck, IconAlertCircle, IconUser, IconUserPlus } from '@tabler/icons-react';
import {
  useProjectRoles,
  useProjectCrewAssignments,
  useAvailableCrew,
  useAssignCrewToRole,
  useRemoveCrewFromProject,
  useProjectCanStart,
} from './project.hook';
import { CrewFormModal } from '../crew/CrewFormModal';
import { useAuth } from '../auth/useAuth';
import type { ProjectWithStats } from './project.typs';

interface CrewAssignmentModalProps {
  project: ProjectWithStats | null;
  opened: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CrewAssignmentModal({ project, opened, onClose, onSuccess }: CrewAssignmentModalProps) {
  const [selectedCrewId, setSelectedCrewId] = useState<string>('');
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [crewFormModalOpened, setCrewFormModalOpened] = useState(false);

  const { user } = useAuth();
  const { roles, loading: rolesLoading, refetch: refetchRoles } = useProjectRoles(project?.project_id || null);
  const { assignments, loading: assignmentsLoading, refetch: refetchAssignments } = useProjectCrewAssignments(project?.project_id || null);
  const { crew, loading: crewLoading, refetch: refetchCrew } = useAvailableCrew();
  const { assignCrew, loading: assignLoading } = useAssignCrewToRole();
  const { removeCrew, loading: removeLoading } = useRemoveCrewFromProject();
  const { canStart, refetch: refetchCanStart } = useProjectCanStart(project?.project_id || null);

  const loading = rolesLoading || assignmentsLoading || crewLoading;

  // Reset form when modal closes
  useEffect(() => {
    if (!opened) {
      setSelectedCrewId('');
      setSelectedRoleId('');
    }
  }, [opened]);

  const handleAssignCrew = async () => {
    if (!project || !selectedRoleId || !selectedCrewId) return;

    const success = await assignCrew({
      project_id: project.project_id,
      role_id: selectedRoleId,
      crew_id: selectedCrewId,
    });

    if (success) {
      setSelectedCrewId('');
      setSelectedRoleId('');
      refetchRoles();
      refetchAssignments();
      refetchCanStart();
      onSuccess?.();
    }
  };

  const handleCrewCreated = () => {
    setCrewFormModalOpened(false);
    refetchCrew();
  };

  const handleRemoveCrew = async (assignmentId: string) => {
    const success = await removeCrew(assignmentId);
    if (success) {
      refetchRoles();
      refetchAssignments();
      refetchCanStart();
      onSuccess?.();
    }
  };

  if (!project) return null;

  // Get available crew for selected role (exclude already assigned crew)
  const assignedCrewIds = assignments.map(a => a.crew.id);
  const availableCrew = crew.filter(c => !assignedCrewIds.includes(c.id));

  // Get unfilled roles
  const filledRoleIds = assignments.map(a => a.role.role_id);
  const unfilledRoles = roles.filter(r => !filledRoleIds.includes(r.role_id));

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Crew Assignment - ${project.project_name}`}
      size="xl"
      centered
    >
      <Stack gap="md">
        {/* Project Status Alert */}
        {canStart === false && (
          <Alert icon={<IconAlertCircle size={16} />} color="orange">
            Complete all role assignments to start the project
          </Alert>
        )}

        {canStart === true && (
          <Alert icon={<IconCheck size={16} />} color="green">
            All roles are filled! Project is ready to start.
          </Alert>
        )}

        {/* Assignment Form */}
        {unfilledRoles.length > 0 && availableCrew.length > 0 && (
          <Card withBorder p="md">
            <Text fw={500} mb="md">
              Assign Crew to Role
            </Text>
            
            <Group gap="md" align="end">
              <Select
                label="Select Role"
                placeholder="Choose a role to fill"
                value={selectedRoleId}
                onChange={(value) => setSelectedRoleId(value || '')}
                data={unfilledRoles.map(role => ({
                  value: role.role_id,
                  label: `${role.role_name} (${role.department_name})`,
                }))}
                style={{ flex: 1 }}
              />

              <Select
                label="Select Crew Member"
                placeholder="Choose crew member"
                value={selectedCrewId}
                onChange={(value) => setSelectedCrewId(value || '')}
                data={availableCrew.map(member => ({
                  value: member.id,
                  label: `${member.name} (${member.email})`,
                }))}
                style={{ flex: 1 }}
                disabled={!selectedRoleId}
              />

              <Button
                onClick={handleAssignCrew}
                disabled={!selectedRoleId || !selectedCrewId}
                loading={assignLoading}
              >
                Assign
              </Button>
            </Group>

            {/* Add New Crew Button */}
            <Group justify="center" mt="sm">
              <Button
                variant="light"
                size="sm"
                leftSection={<IconUserPlus size={14} />}
                onClick={() => setCrewFormModalOpened(true)}
              >
                Add New Crew Member
              </Button>
            </Group>
          </Card>
        )}

        {/* Current Assignments */}
        <div>
          <Text fw={500} mb="md">
            Current Assignments ({assignments.length} of {roles.length} roles filled)
          </Text>

          {loading ? (
            <Center h={200}>
              <Loader size="sm" />
            </Center>
          ) : assignments.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl">
              No crew members assigned yet
            </Text>
          ) : (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Crew Member</Table.Th>
                  <Table.Th>Role</Table.Th>
                  <Table.Th>Department</Table.Th>
                  <Table.Th>Assigned Date</Table.Th>
                  <Table.Th style={{ width: 100 }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {assignments.map((assignment) => (
                  <Table.Tr key={assignment.assignment_id}>
                    <Table.Td>
                      <Group gap="sm">
                        <Avatar
                          src={assignment.crew.photo_url}
                          size="sm"
                          radius="xl"
                        >
                          <IconUser size={16} />
                        </Avatar>
                        <div>
                          <Text size="sm" fw={500}>
                            {assignment.crew.name}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {assignment.crew.email}
                          </Text>
                        </div>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light">
                        {assignment.role.role_name}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {assignment.role.department_name}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {new Date(assignment.assigned_at).toLocaleDateString()}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        onClick={() => handleRemoveCrew(assignment.assignment_id)}
                        loading={removeLoading}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </div>

        {/* Unfilled Roles */}
        {unfilledRoles.length > 0 && (
          <div>
            <Text fw={500} mb="md" c="orange">
              Unfilled Roles ({unfilledRoles.length})
            </Text>
            <Group gap="xs">
              {unfilledRoles.map((role) => (
                <Badge key={role.role_id} variant="outline" color="orange">
                  {role.role_name} ({role.department_name})
                </Badge>
              ))}
            </Group>
          </div>
        )}

        {/* No available crew message */}
        {availableCrew.length === 0 && assignments.length < roles.length && (
          <Stack gap="sm">
            <Alert color="yellow">
              All available crew members have been assigned. Add more crew members to fill remaining roles.
            </Alert>
            <Group justify="center">
              <Button
                variant="light"
                leftSection={<IconUserPlus size={16} />}
                onClick={() => setCrewFormModalOpened(true)}
              >
                Add New Crew Member
              </Button>
            </Group>
          </Stack>
        )}

        {/* Actions */}
        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose}>
            Close
          </Button>
        </Group>
      </Stack>

      {/* Crew Form Modal */}
      <CrewFormModal
        opened={crewFormModalOpened}
        onClose={() => setCrewFormModalOpened(false)}
        onSuccess={handleCrewCreated}
        currentUserId={user?.id || ''}
      />
    </Modal>
  );
}
