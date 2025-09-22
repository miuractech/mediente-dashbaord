import { useState, useEffect } from 'react';
import {
  Modal,
  Stack,
  Group,
  Text,
  Button,
  TextInput,
  Textarea,
  NumberInput,
  Select,
  MultiSelect,
  Divider,
  Card,
  Badge,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { 
  IconEdit, 
  IconUsers, 
  IconChecklist, 
  IconClock,
  IconCalendar,
  IconTag,
  IconFileText,
} from '@tabler/icons-react';
import type { 
  ProjectTaskWithAssignments, 
  UpdateTaskInput, 
  TaskStatusType,
} from './project.typs';
import type { ChecklistItem, TaskCategoryType } from '../template/template.type';
import { useUpdateTask, useAvailableCrew, useAssignCrewToTask, useRemoveCrewFromTask } from './project.hook';
import ChecklistManager from '../template/ChecklistManager';

interface TaskEditModalProps {
  opened: boolean;
  onClose: () => void;
  task: ProjectTaskWithAssignments | null;
  onSuccess?: () => void;
}

const taskCategories: { value: TaskCategoryType; label: string }[] = [
  { value: 'monitor', label: 'Monitor' },
  { value: 'coordinate', label: 'Coordinate' },
  { value: 'execute', label: 'Execute' },
];

const taskStatuses: { value: TaskStatusType; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
  { value: 'escalated', label: 'Escalated' },
];

export function TaskEditModal({ 
  opened, 
  onClose, 
  task,
  onSuccess 
}: TaskEditModalProps) {
  const [formData, setFormData] = useState<UpdateTaskInput>({});
  const [selectedCrewIds, setSelectedCrewIds] = useState<string[]>([]);
  const [deadline, setDeadline] = useState<Date | null>(null);

  const { updateTask, loading } = useUpdateTask();
  const { crew: availableCrew, loading: crewLoading } = useAvailableCrew();
  const { assignCrew, loading: assigningCrew } = useAssignCrewToTask();
  const { removeCrew, loading: removingCrew } = useRemoveCrewFromTask();

  // Initialize form when task changes
  useEffect(() => {
    if (task && opened) {
      setFormData({
        task_name: task.task_name,
        task_description: task.task_description || '',
        estimated_hours: task.estimated_hours || undefined,
        actual_hours: task.actual_hours,
        category: task.category || undefined,
        task_status: task.task_status,
        escalation_reason: task.escalation_reason || '',
        checklist_items: task.checklist_items || [],
      });
      setSelectedCrewIds(task.assigned_crew.map(crew => crew.crew_id));
      setDeadline(task.deadline ? new Date(task.deadline) : null);
    }
  }, [task, opened]);

  const handleSubmit = async () => {
    if (!task || !formData.task_name?.trim()) {
      notifications.show({
        title: 'Validation Error',
        message: 'Task name is required',
        color: 'red',
      });
      return;
    }

    const updateData: UpdateTaskInput = {
      ...formData,
      task_name: formData.task_name?.trim(),
      task_description: formData.task_description?.trim() || undefined,
    };

    // Add deadline if changed
    if (deadline !== (task.deadline ? new Date(task.deadline) : null)) {
      updateData.completed_at = deadline?.toISOString() || null;
    }

    const success = await updateTask(task.project_task_id, updateData);

    if (success) {
      // Handle crew assignment changes
      const currentCrewIds = task.assigned_crew.map(crew => crew.crew_id);
      const crewToAdd = selectedCrewIds.filter(id => !currentCrewIds.includes(id));
      const crewToRemove = currentCrewIds.filter(id => !selectedCrewIds.includes(id));

      try {
        // Add new crew members
        if (crewToAdd.length > 0) {
          const assignmentPromises = crewToAdd.map(crewId =>
            assignCrew({
              project_task_id: task.project_task_id,
              crew_id: crewId,
              project_role_id: 'auto',
            })
          );
          await Promise.all(assignmentPromises);
        }

        // Remove crew members
        if (crewToRemove.length > 0 && selectedCrewIds.length > 0) {
          const removePromises = crewToRemove.map(crewId =>
            removeCrew(task.project_task_id, crewId)
          );
          await Promise.all(removePromises);
        }
      } catch {
        notifications.show({
          title: 'Warning',
          message: 'Task updated but some crew assignment changes failed',
          color: 'yellow',
        });
      }

      onSuccess?.();
      onClose();
    }
  };

  const handleClose = () => {
    setFormData({});
    setSelectedCrewIds([]);
    setDeadline(null);
    onClose();
  };

  const handleChecklistChange = (items: ChecklistItem[]) => {
    setFormData(prev => ({ ...prev, checklist_items: items }));
  };

  // Convert crew data for MultiSelect
  const crewOptions = availableCrew.map(crew => ({
    value: crew.id,
    label: `${crew.name} (${crew.email})`,
  }));

  if (!task) return null;

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="sm">
          <IconEdit size={20} />
          <Text fw={600}>Edit Task</Text>
        </Group>
      }
      size="lg"
      centered
    >
      <Stack gap="md">
        {/* Task Status and Category */}
        <Group grow>
          <Select
            label="Status"
            leftSection={<IconTag size={16} />}
            value={formData.task_status || ''}
            onChange={(value) => setFormData(prev => ({ 
              ...prev, 
              task_status: value as TaskStatusType 
            }))}
            data={taskStatuses}
            required
          />
          
          <Select
            label="Category"
            leftSection={<IconTag size={16} />}
            value={formData.category || ''}
            onChange={(value) => setFormData(prev => ({ 
              ...prev, 
              category: value as TaskCategoryType | undefined 
            }))}
            data={taskCategories}
            clearable
          />
        </Group>

        {/* Task Name */}
        <TextInput
          label="Task Name"
          leftSection={<IconFileText size={16} />}
          placeholder="Enter task name"
          value={formData.task_name || ''}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            task_name: e.target.value 
          }))}
          required
        />

        {/* Task Description */}
        <Textarea
          label="Description"
          leftSection={<IconFileText size={16} />}
          placeholder="Enter task description"
          value={formData.task_description || ''}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            task_description: e.target.value 
          }))}
          minRows={3}
          maxRows={6}
        />

        {/* Hours and Deadline */}
        <Group grow>
          <NumberInput
            label="Estimated Hours"
            leftSection={<IconClock size={16} />}
            placeholder="Enter estimated hours"
            value={formData.estimated_hours}
            onChange={(value) => setFormData(prev => ({ 
              ...prev, 
              estimated_hours: value as number | undefined 
            }))}
            min={0}
            step={0.5}
            decimalScale={1}
          />
          
          <NumberInput
            label="Actual Hours"
            leftSection={<IconClock size={16} />}
            placeholder="Enter actual hours"
            value={formData.actual_hours}
            onChange={(value) => setFormData(prev => ({ 
              ...prev, 
              actual_hours: value as number | undefined 
            }))}
            min={0}
            step={0.5}
          />
        </Group>

        {/* Deadline */}
        <DateTimePicker
          label="Deadline"
          leftSection={<IconCalendar size={16} />}
          placeholder="Select deadline"
          value={deadline}
          onChange={(value) => setDeadline(value as Date | null)}
          clearable
        />

        {/* Escalation Reason (only if escalated) */}
        {formData.task_status === 'escalated' && (
          <Textarea
            label="Escalation Reason"
            placeholder="Enter reason for escalation"
            value={formData.escalation_reason || ''}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              escalation_reason: e.target.value 
            }))}
            minRows={2}
            maxRows={4}
          />
        )}

        <Divider />

        {/* Current Assignment Info */}
        {task.assigned_crew.length > 0 && (
          <Card withBorder p="sm">
            <Text size="sm" fw={500} mb="xs">Currently Assigned:</Text>
            <Group gap="xs">
              {task.assigned_crew.map((crew) => (
                <Badge key={crew.crew_id} variant="light" size="sm">
                  {crew.crew_name}
                </Badge>
              ))}
            </Group>
          </Card>
        )}

        {/* Crew Assignment */}
        <Card withBorder p="md">
          <Stack gap="sm">
            <Group gap="xs">
              <IconUsers size={16} />
              <Text fw={500}>Assign Crew Members</Text>
            </Group>
            
            <MultiSelect
              placeholder="Select crew members to assign"
              value={selectedCrewIds}
              onChange={setSelectedCrewIds}
              data={crewOptions}
              searchable
              clearable
              disabled={crewLoading}
              maxDropdownHeight={200}
            />
          </Stack>
        </Card>

        {/* Checklist */}
        <Card withBorder p="md">
          <Stack gap="sm">
            <Group gap="xs">
              <IconChecklist size={16} />
              <Text fw={500}>Task Checklist</Text>
            </Group>
            
            <ChecklistManager
              items={formData.checklist_items || []}
              onChange={handleChecklistChange}
            />
          </Stack>
        </Card>

        <Group justify="flex-end" mt="xl">
          <Button
            variant="subtle"
            onClick={handleClose}
            disabled={loading || assigningCrew || removingCrew}
          >
            Cancel
          </Button>
          <Button
            leftSection={<IconEdit size={16} />}
            onClick={handleSubmit}
            loading={loading || assigningCrew || removingCrew}
            disabled={!formData.task_name?.trim()}
          >
            Update Task
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
