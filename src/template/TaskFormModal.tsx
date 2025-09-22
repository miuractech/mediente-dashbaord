/* eslint-disable @typescript-eslint/ban-ts-comment */
import React, { useState, useEffect } from 'react';
import {
  Modal,
  TextInput,
  Textarea,
  Button,
  Group,
  Stack,
  Title,
  NumberInput,
  Select,
  Loader
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import type { StepTask, CreateStepTaskRequest, UpdateStepTaskRequest, TaskCategoryType, ChecklistItem } from './template.type';
import { stepTaskService } from './projectTemplateService';
import ChecklistManager from './ChecklistManager';
import { SearchableRoleSelect } from './SearchableRoleSelect';

interface TaskFormModalProps {
  opened: boolean;
  onClose: () => void;
  stepId: string;
  templateId: string; // Add templateId for cross-template search
  task?: StepTask;
  parentTaskId?: string; // For creating child tasks
  onSuccess: () => void;
}

export default function TaskFormModal({ 
  opened, 
  onClose, 
  stepId,
  templateId,
  task,
  parentTaskId,
  onSuccess 
}: TaskFormModalProps) {
  const [formData, setFormData] = useState({
    task_name: '',
    description: '',
    estimated_hours: undefined as number | undefined,
    assigned_role_id: undefined as string | undefined,
    parent_task_id: undefined as string | undefined,
    category: undefined as TaskCategoryType | undefined,
    checklist_items: [] as ChecklistItem[]
  });
  const [loading, setLoading] = useState(false);
  const [availableParentTasks, setAvailableParentTasks] = useState<(StepTask & { step_name?: string; phase_name?: string })[]>([]);
  const [loadingParentTasks, setLoadingParentTasks] = useState(false);
  const [parentTaskSearch, setParentTaskSearch] = useState('');

  const isEditing = !!task;

  // Load available parent tasks with search (debounced)
  useEffect(() => {
    const loadParentTasks = async () => {
      if (!opened) return;
      
      try {
        setLoadingParentTasks(true);
        
        // Get tasks from current step (only if no search term to avoid too many results)
        let currentStepTasks: StepTask[] = [];
        if (!parentTaskSearch.trim()) {
          currentStepTasks = await stepTaskService.getAvailableParentTasks(
            stepId, 
            task?.task_id // Exclude current task when editing
          );
        }
        
        // Get tasks from previous steps and phases using new search method
        const previousTasks = await stepTaskService.searchAvailableParentTasks(
          templateId,
          stepId,
          parentTaskSearch.trim(),
          task?.task_id, // Exclude current task when editing
          30 // Limit results for performance
        );
        
        // Combine both lists
        const allParentTasks = [
          // Current step tasks (no additional info needed)
          ...currentStepTasks.map(task => ({ ...task, step_name: undefined, phase_name: undefined })),
          // Previous step/phase tasks (with step and phase info)
          ...previousTasks
        ];
        
        setAvailableParentTasks(allParentTasks);
      } catch (error) {
        console.error('Error loading parent tasks:', error);
        setAvailableParentTasks([]);
      } finally {
        setLoadingParentTasks(false);
      }
    };

    // Debounce the search
    const debounceTimer = setTimeout(loadParentTasks, 300);
    return () => clearTimeout(debounceTimer);
  }, [opened, stepId, templateId, task?.task_id, parentTaskSearch]);


  useEffect(() => {
    if (task) {
      setFormData({
        task_name: task.task_name,
        description: task.description || '',
        estimated_hours: task.estimated_hours || undefined,
        assigned_role_id: task.assigned_role_id || undefined,
        parent_task_id: task.parent_task_id || undefined,
        category: task.category || undefined,
        checklist_items: task.checklist_items || []
      });
    } else {
      setFormData({
        task_name: '',
        description: '',
        estimated_hours: undefined,
        assigned_role_id: undefined,
        parent_task_id: parentTaskId || undefined,
        category: undefined,
        checklist_items: []
      });
    }
  }, [task, parentTaskId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.task_name.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Task name is required',
        color: 'red'
      });
      return;
    }

    setLoading(true);

    try {
      if (isEditing && task) {
        const updateData: UpdateStepTaskRequest = {
          task_name: formData.task_name.trim(),
          description: formData.description.trim() || undefined,
          estimated_hours: formData.estimated_hours || undefined,
          assigned_role_id: formData.assigned_role_id || undefined,
          parent_task_id: formData.parent_task_id || undefined,
          category: formData.category || undefined,
          checklist_items: formData.checklist_items
        };
        
        await stepTaskService.update(task.task_id, updateData);
        notifications.show({
          title: 'Success',
          message: 'Task updated successfully',
          color: 'green'
        });
      } else {
        const createData: CreateStepTaskRequest = {
          step_id: stepId,
          task_name: formData.task_name.trim(),
          description: formData.description.trim() || undefined,
          estimated_hours: formData.estimated_hours || undefined,
          assigned_role_id: formData.assigned_role_id || undefined,
          parent_task_id: formData.parent_task_id || undefined,
          category: formData.category || undefined,
          checklist_items: formData.checklist_items
        };
        
        await stepTaskService.create(createData);
        notifications.show({
          title: 'Success',
          message: 'Task created successfully',
          color: 'green'
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving task:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to save task',
        color: 'red'
      });
    } finally {
      setLoading(false);
    }
  };


  // Create parent task options for Select component
  const parentTaskOptions = availableParentTasks.map(parentTask => {
    let label = parentTask.task_name;
    
    // Add step and phase info for cross-template tasks
    if (parentTask.step_name && parentTask.phase_name) {
      label = `${parentTask.task_name} (${parentTask.phase_name} → ${parentTask.step_name})`;
    }
    
    return {
      value: parentTask.task_id,
      label
    };
  });

  // Task category options
  const categoryOptions = [
    { value: 'monitor', label: 'Monitor - Oversight and tracking tasks' },
    { value: 'coordinate', label: 'Coordinate - Management and communication tasks' },
    { value: 'execute', label: 'Execute - Action and implementation tasks' }
  ];

  return (
    <Modal 
      opened={opened} 
      onClose={onClose}
      title={
        <Title order={3}>
          {isEditing ? 'Edit Task' : 'Create New Task'}
        </Title>
      }
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <Stack>
          <TextInput
            label="Task Name"
            placeholder="Enter task name"
            value={formData.task_name}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              task_name: e.target.value 
            }))}
            required
            maxLength={200}
          />

          <Textarea
            label="Description"
            placeholder="Enter task description (optional)"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              description: e.target.value 
            }))}
            minRows={3}
            maxRows={6}
            maxLength={1000}
          />



          <NumberInput
            label="Estimated Hours"
            placeholder="Enter estimated hours (optional)"
            value={formData.estimated_hours}
            // @ts-ignore
            onChange={(value) => setFormData(prev => ({ 
              ...prev, 
              estimated_hours: value || undefined
            }))}
            min={0}
            decimalScale={1}
          />

          <Select
            label="Parent Task"
            placeholder="Search for a parent task (optional)"
            value={formData.parent_task_id || null}
            onChange={(value) => setFormData(prev => ({ 
              ...prev, 
              parent_task_id: value || undefined
            }))}
            data={parentTaskOptions}
            searchable
            clearable
            onSearchChange={setParentTaskSearch}
            searchValue={parentTaskSearch}
            description="Make this task a child of another task from previous steps/phases"
            limit={30}
            nothingFoundMessage={loadingParentTasks ? "Searching..." : parentTaskSearch.trim() ? "No matching tasks found" : "Start typing to search for parent tasks"}
            rightSection={loadingParentTasks ? <Loader size="xs" /> : undefined}
          />

          <Select
            label="Category"
            placeholder="Select task category (optional)"
            value={formData.category || null}
            onChange={(value) => setFormData(prev => ({ 
              ...prev, 
              category: value as TaskCategoryType || undefined
            }))}
            data={categoryOptions}
            clearable
            description="Categorize the type of task"
          />

          <SearchableRoleSelect
            label="Assigned Role"
            placeholder="Search and select a role (optional)"
            value={formData.assigned_role_id || null}
            onChange={(value: string | null) => setFormData(prev => ({ 
              ...prev, 
              assigned_role_id: value || undefined
            }))}
            description="Assign this task to a specific role/department"
            clearable
          />

          <ChecklistManager
            items={formData.checklist_items}
            onChange={(items) => setFormData(prev => ({ 
              ...prev, 
              checklist_items: items 
            }))}
          />

          <Group justify="flex-end">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
