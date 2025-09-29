import { useState, useEffect } from 'react';
import {
  Drawer,
  Stack,
  Group,
  Text,
  Button,
  TextInput,
  Textarea,
  NumberInput,
  Select,
  Title,
  MultiSelect,
  Divider,
  Card,
  Loader,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconX, IconUsers, IconChecklist } from '@tabler/icons-react';
import type { CreateCustomTaskInput, TaskCategoryType, CrewMember, AssignTaskCrewInput, ProjectTaskWithAssignments } from './project.typs';
import type { ChecklistItem } from '../template/template.type';
import { useCreateCustomTask, useAvailableCrew, useAssignCrewToTask } from './project.hook';
import { projectService } from './project.service';
import ChecklistManager from '../template/ChecklistManager';

interface CustomTaskFormDrawerProps {
  opened: boolean;
  onClose: () => void;
  projectId: string;
  onSuccess?: () => void;
}

const taskCategories: { value: TaskCategoryType; label: string }[] = [
  { value: 'monitor', label: 'Monitor' },
  { value: 'coordinate', label: 'Coordinate' },
  { value: 'execute', label: 'Execute' },
];

export function CustomTaskFormDrawer({ 
  opened, 
  onClose, 
  projectId,
  onSuccess 
}: CustomTaskFormDrawerProps) {
  const [formData, setFormData] = useState<CreateCustomTaskInput>({
    task_name: '',
    task_description: '',
    estimated_days: undefined,
    category: undefined,
    parent_task_id: undefined,
    checklist_items: [],
  });
  const [selectedCrewIds, setSelectedCrewIds] = useState<string[]>([]);
  const [parentTaskSearch, setParentTaskSearch] = useState('');
  const [availableParentTasks, setAvailableParentTasks] = useState<ProjectTaskWithAssignments[]>([]);
  const [loadingParentTasks, setLoadingParentTasks] = useState(false);

  const { createCustomTask, loading } = useCreateCustomTask();
  const { crew: availableCrew, loading: crewLoading } = useAvailableCrew();
  const { assignCrew, loading: assigningCrew } = useAssignCrewToTask();

  // Reset form when drawer opens
  useEffect(() => {
    if (opened) {
      setFormData({
        task_name: '',
        task_description: '',
        estimated_days: undefined,
        category: undefined,
        parent_task_id: undefined,
        checklist_items: [],
      });
      setSelectedCrewIds([]);
      setParentTaskSearch('');
      setAvailableParentTasks([]);
    }
  }, [opened]);

  // Load available parent tasks with search
  useEffect(() => {
    const loadParentTasks = async () => {
      if (!opened) return;
      
      
      
      try {
        setLoadingParentTasks(true);
        
        // Require minimum 2 characters for search to avoid expensive queries
        if (parentTaskSearch.trim().length >= 2) {
          
          
          const filters = {
            project_id: projectId,
            search: parentTaskSearch.trim(),
            is_archived: false,
          };
          
          
          
          // Get all project tasks
          const availableTasks = await projectService.getProjectTasks(filters);
          
          
          // Limit to 10 results for performance
          const limitedTasks = availableTasks.slice(0, 10);
          
          
          setAvailableParentTasks(limitedTasks);
        } else {
          
          // Clear results when search term is too short
          setAvailableParentTasks([]);
        }
      } catch (error) {
        console.error('❌ [CustomTaskFormDrawer] Error loading parent tasks:', error);
        setAvailableParentTasks([]);
      } finally {
        setLoadingParentTasks(false);
        
      }
    };

    // Debounce the search for better performance
    const debounceTimer = setTimeout(loadParentTasks, 300);
    return () => clearTimeout(debounceTimer);
  }, [opened, projectId, parentTaskSearch]);

  const handleSubmit = async () => {
    if (!formData.task_name.trim()) {
      notifications.show({
        title: 'Validation Error',
        message: 'Task name is required',
        color: 'red',
      });
      return;
    }

    const task = await createCustomTask(projectId, {
      ...formData,
      task_name: formData.task_name.trim(),
      task_description: formData.task_description?.trim() || undefined,
    });

    if (task) {
      // Assign selected crew members to the task
      if (selectedCrewIds.length > 0) {
        const assignmentPromises = selectedCrewIds.map(crewId =>
          assignCrew({
            project_task_id: task.project_task_id,
            crew_id: crewId,
            project_role_id: 'auto', // Will be handled automatically by the service
          })
        );

        try {
          await Promise.all(assignmentPromises);
        } catch (error) {
          // Task was created successfully, but crew assignment failed
          // We still consider this a success since the task exists
          notifications.show({
            title: 'Warning',
            message: 'Task created but some crew assignments failed. You can assign crew members later.',
            color: 'yellow',
          });
        }
      }

      onSuccess?.();
      onClose();
    }
  };

  const handleClose = () => {
    setFormData({
      task_name: '',
      task_description: '',
      estimated_days: undefined,
      category: undefined,
      parent_task_id: undefined,
      checklist_items: [],
    });
    setSelectedCrewIds([]);
    setParentTaskSearch('');
    setAvailableParentTasks([]);
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

  // Convert parent tasks for Select
  const parentTaskOptions = availableParentTasks.map(task => ({
    value: task.project_task_id,
    label: `${task.task_name} (${task.phase_name} - ${task.step_name})`,
  }));

  return (
    <Drawer
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="sm">
          <Title order={4}>Create Custom Task</Title>
        </Group>
      }
      position="right"
      size="lg"
      padding="md"
    >
      <Stack gap="md">
        <TextInput
          label="Task Name"
          placeholder="Enter task name"
          value={formData.task_name}
          onChange={(e) => setFormData(prev => ({ ...prev, task_name: e.target.value }))}
          required
          data-autofocus
        />

        <Textarea
          label="Description"
          placeholder="Enter task description (optional)"
          value={formData.task_description || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, task_description: e.target.value }))}
          minRows={3}
          maxRows={6}
        />

        <NumberInput
          label="Estimated Days"
          placeholder="Enter estimated days"
          value={formData.estimated_days}
          onChange={(value) => setFormData(prev => ({ ...prev, estimated_days: value || undefined }))}
          min={0}
          step={0.5}
          precision={1}
        />

        <Select
          label="Category"
          placeholder="Select task category (optional)"
          value={formData.category || ''}
          onChange={(value) => setFormData(prev => ({ ...prev, category: value as TaskCategoryType || undefined }))}
          data={taskCategories}
          searchable
          clearable
        />

        {/* Parent Task */}
        <Select
          label="Parent Task"
          placeholder={parentTaskSearch.trim().length >= 2 ? "Search results (top 10)..." : "Type at least 2 characters to search..."}
          value={formData.parent_task_id || ''}
          onChange={(value) => setFormData(prev => ({ 
            ...prev, 
            parent_task_id: value || undefined
          }))}
          data={parentTaskOptions}
          searchable
          clearable
          onSearchChange={setParentTaskSearch}
          searchValue={parentTaskSearch}
          description="Search for a parent task. Type at least 2 characters to start searching."
          limit={10}
          nothingFoundMessage={
            loadingParentTasks 
              ? "Searching..." 
              : parentTaskSearch.trim().length >= 2
                ? "No matching tasks found. Try different search terms." 
                : "Type at least 2 characters to search for parent tasks"
          }
          rightSection={loadingParentTasks ? <Loader size="xs" /> : undefined}
          maxDropdownHeight={400}
        />

        <Divider />

        {/* Crew Assignment */}
        <Card withBorder p="md">
          <Stack gap="sm">
            <Group gap="xs">
              <IconUsers size={16} />
              <Text fw={500}>Assign Crew Members</Text>
            </Group>
            
            <MultiSelect
              placeholder="Select crew members to assign (optional)"
              value={selectedCrewIds}
              onChange={setSelectedCrewIds}
              data={crewOptions}
              searchable
              clearable
              loading={crewLoading}
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
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={loading || assigningCrew}
            disabled={!formData.task_name.trim()}
          >
            Create Task
          </Button>
        </Group>
      </Stack>
    </Drawer>
  );
}
