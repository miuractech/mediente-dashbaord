import {
  Modal,
  Text,
  Button,
  Group,
  Stack,
  Avatar,
  Card,
  Badge,
  Divider,
  ActionIcon,
  Alert,
} from '@mantine/core';
import { 
  IconUser, 
  IconMail, 
  IconPhone, 
  IconTrash, 
  IconCalendar,
  IconBriefcase,
  IconAlertTriangle,
  IconEdit,
} from '@tabler/icons-react';
import { modals } from '@mantine/modals';
import { useRemoveCrewFromProject } from './project.hook';
import { RoleAssignmentModal } from './RoleAssignmentModal';
import type { ProjectCrewAssignmentWithDetails } from './project.typs';
import { useState } from 'react';

interface CrewDetailModalProps {
  assignment: ProjectCrewAssignmentWithDetails | null;
  opened: boolean;
  onClose: () => void;
  onRemoveAssignment?: () => void;
}

export function CrewDetailModal({ 
  assignment, 
  opened, 
  onClose, 
  onRemoveAssignment 
}: CrewDetailModalProps) {
  const { removeCrew, loading: removeLoading } = useRemoveCrewFromProject();
  const [reassignModalOpened, setReassignModalOpened] = useState(false);

  const handleRemoveAssignment = () => {
    if (!assignment) return;

    modals.openConfirmModal({
      title: 'Remove Crew Assignment',
      children: (
        <Stack gap="sm">
          <Alert
            icon={<IconAlertTriangle size={16} />}
            color="red"
            variant="light"
          >
            This will remove <strong>{assignment.crew.name}</strong> from the role <strong>{assignment.role.role_name}</strong>.
          </Alert>
          <Text size="sm">
            Are you sure you want to remove this crew member from this role? This action cannot be undone.
          </Text>
        </Stack>
      ),
      labels: { confirm: 'Remove Assignment', cancel: 'Cancel' },
      confirmProps: { color: 'red', loading: removeLoading },
      onConfirm: async () => {
        const success = await removeCrew(assignment.assignment_id);
        if (success) {
          onRemoveAssignment?.();
        }
      },
    });
  };

  if (!assignment) return null;

  const { crew, role } = assignment;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Crew Member Details"
      size="md"
      centered
    >
      <Stack gap="md">
        {/* Crew Member Header */}
        <Card withBorder p="md">
          <Group gap="md">
            <Avatar
              src={crew.photo_url}
              size="lg"
              radius="xl"
            >
              <IconUser size={24} />
            </Avatar>
            <div style={{ flex: 1 }}>
              <Text fw={600} size="lg">{crew.name}</Text>
              <Group gap="xs" mt="xs">
                <Badge 
                  color={crew.status ? 'green' : 'red'} 
                  variant="light" 
                  size="sm"
                >
                  {crew.status ? 'Active' : 'Inactive'}
                </Badge>
                {crew.is_archived && (
                  <Badge color="gray" variant="light" size="sm">
                    Archived
                  </Badge>
                )}
              </Group>
            </div>
            <Group gap="xs">
              <ActionIcon
                color="blue"
                variant="subtle"
                onClick={() => setReassignModalOpened(true)}
                title="Reassign role"
              >
                <IconEdit size={18} />
              </ActionIcon>
              <ActionIcon
                color="red"
                variant="subtle"
                onClick={handleRemoveAssignment}
                loading={removeLoading}
                title="Remove from role"
              >
                <IconTrash size={18} />
              </ActionIcon>
            </Group>
          </Group>
        </Card>

        {/* Contact Information */}
        <div>
          <Text fw={500} mb="sm">Contact Information</Text>
          <Stack gap="xs">
            <Group gap="sm">
              <IconMail size={16} color="var(--mantine-color-blue-6)" />
              <Text size="sm">{crew.email}</Text>
            </Group>
            {crew.phone && (
              <Group gap="sm">
                <IconPhone size={16} color="var(--mantine-color-green-6)" />
                <Text size="sm">{crew.phone}</Text>
              </Group>
            )}
          </Stack>
        </div>

        <Divider />

        {/* Role Assignment Information */}
        <div>
          <Text fw={500} mb="sm">Current Assignment</Text>
          <Card withBorder p="sm" bg="gray.0">
            <Group gap="sm" mb="xs">
              <IconBriefcase size={16} color="var(--mantine-color-blue-6)" />
              <Text fw={500}>{role.role_name}</Text>
            </Group>
            <Text size="sm" c="dimmed" mb="xs">
              Department: {role.department_name}
            </Text>
            <Group gap="sm">
              <IconCalendar size={14} color="var(--mantine-color-gray-6)" />
              <Text size="xs" c="dimmed">
                Assigned on {new Date(assignment.assigned_at).toLocaleDateString()}
              </Text>
            </Group>
          </Card>
        </div>

        {/* Warning for inactive/archived crew */}
        {(!crew.status || crew.is_archived) && (
          <Alert
            icon={<IconAlertTriangle size={16} />}
            color="orange"
            variant="light"
          >
            {!crew.status && 'This crew member is currently inactive. '}
            {crew.is_archived && 'This crew member has been archived. '}
            Consider reassigning this role to an active crew member.
          </Alert>
        )}

        {/* Actions */}
        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose}>
            Close
          </Button>
        </Group>
      </Stack>

      {/* Reassignment Modal */}
      {assignment && (
        <RoleAssignmentModal
          role={assignment.role}
          projectId={assignment.project_id}
          opened={reassignModalOpened}
          onClose={() => setReassignModalOpened(false)}
          onSuccess={() => {
            setReassignModalOpened(false);
            onRemoveAssignment?.();
          }}
          currentAssignmentId={assignment.assignment_id}
        />
      )}
    </Modal>
  );
}
