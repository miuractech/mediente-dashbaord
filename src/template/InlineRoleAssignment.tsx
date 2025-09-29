import { useState, useEffect, memo, useCallback } from 'react';
import {
  Badge,
  Modal,
  Button,
  Text,
  ActionIcon,
  Group,
  Stack,
  Alert,
  Loader
} from '@mantine/core';
import { IconEdit, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { SearchableRoleSelect } from './SearchableRoleSelect';
import { stepTaskService } from './projectTemplateService';
import type { StepTask } from './template.type';

interface InlineRoleAssignmentProps {
  task: StepTask;
  currentRoleName: string;
  onRoleUpdate: (taskId: string, roleId: string | null) => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

function InlineRoleAssignmentComponent({
  task,
  currentRoleName,
  onRoleUpdate,
  size = 'sm',
  disabled = false
}: InlineRoleAssignmentProps) {
  const [modalOpened, setModalOpened] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(task.assigned_role_id || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (modalOpened) {
      setSelectedRoleId(task.assigned_role_id || null);
      setError(null);
      setHasUnsavedChanges(false);
    }
  }, [modalOpened, task.assigned_role_id]);

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(selectedRoleId !== task.assigned_role_id);
  }, [selectedRoleId, task.assigned_role_id]);

  const handleSave = useCallback(async () => {
    if (!hasUnsavedChanges) {
      setModalOpened(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Update the task with new role assignment
      await stepTaskService.update(task.task_id, {
        assigned_role_id: selectedRoleId || undefined
      });

      // Optimistically update the parent component
      onRoleUpdate(task.task_id, selectedRoleId);
      
      setModalOpened(false);
    } catch (err) {
      console.error('Error updating task role:', err);
      setError(err instanceof Error ? err.message : 'Failed to update role assignment');
    } finally {
      setIsLoading(false);
    }
  }, [hasUnsavedChanges, selectedRoleId, task.task_id, onRoleUpdate]);

  const handleCancel = useCallback(() => {
    if (hasUnsavedChanges) {
      // Show confirmation or just reset
      setSelectedRoleId(task.assigned_role_id || null);
    }
    setModalOpened(false);
  }, [hasUnsavedChanges, task.assigned_role_id]);

  const getBadgeColor = () => {
    if (task.assigned_role_id) {
      return 'blue';
    }
    return 'gray';
  };

  const getBadgeText = () => {
    if (task.assigned_role_id) {
      return currentRoleName;
    }
    return 'Unassigned';
  };

  return (
    <>
      <Group gap="xs" wrap="nowrap">
        <Badge
          variant="light"
          color={getBadgeColor()}
          size={size}
          style={{ 
            cursor: disabled ? 'default' : 'pointer',
            opacity: disabled ? 0.6 : 1,
            maxWidth: '120px'
          }}
          onClick={() => !disabled && setModalOpened(true)}
          title={disabled ? 'Role assignment disabled' : 'Click to change role assignment'}
        >
          <Text size="xs" truncate>
            {getBadgeText()}
          </Text>
        </Badge>
        
        {!disabled && (
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            onClick={() => setModalOpened(true)}
            title="Edit role assignment"
          >
            <IconEdit size={12} />
          </ActionIcon>
        )}
      </Group>

      <Modal
        opened={modalOpened}
        onClose={handleCancel}
        title={
          <Group gap="xs">
            <Text fw={600}>Assign Role to Task</Text>
            {hasUnsavedChanges && (
              <Badge variant="dot" color="orange" size="sm">
                Unsaved changes
              </Badge>
            )}
          </Group>
        }
        size="md"
        centered
        closeOnClickOutside={!hasUnsavedChanges}
        closeOnEscape={!hasUnsavedChanges}
      >
        <Stack gap="md">
          <Stack gap="xs">
            <Text size="sm" fw={500}>Task</Text>
            <Text size="sm" c="dimmed" style={{ 
              background: '#f8f9fa', 
              padding: '8px 12px', 
              borderRadius: '4px',
              border: '1px solid #e9ecef'
            }}>
              {task.task_name}
            </Text>
          </Stack>

          {error && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              color="red"
              variant="light"
              onClose={() => setError(null)}
              withCloseButton
            >
              {error}
            </Alert>
          )}

          <SearchableRoleSelect
            value={selectedRoleId || undefined}
            onChange={setSelectedRoleId}
            label="Assigned Role"
            placeholder="Search and select a role..."
            description="Type to search for roles across all departments"
            clearable
            disabled={isLoading}
          />

          <Group justify="flex-end" gap="sm">
            <Button
              variant="subtle"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            
            <Button
              leftSection={
                isLoading ? <Loader size={16} /> : 
                hasUnsavedChanges ? <IconCheck size={16} /> : undefined
              }
              onClick={handleSave}
              disabled={isLoading}
              color={hasUnsavedChanges ? 'blue' : 'gray'}
              variant={hasUnsavedChanges ? 'filled' : 'light'}
            >
              {isLoading ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Close'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const InlineRoleAssignment = memo(InlineRoleAssignmentComponent);
