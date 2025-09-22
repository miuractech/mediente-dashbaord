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
  Loader,
  ActionIcon,
  Tooltip,
  Text
} from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import type { StepTask, PhaseStep, CreateStepTaskRequest, UpdateStepTaskRequest, TaskCategoryType, ChecklistItem, CreatePhaseStepRequest } from './template.type';
import { stepTaskService, phaseStepService } from './projectTemplateService';
import ChecklistManager from './ChecklistManager';
import { SearchableRoleSelect } from './SearchableRoleSelect';

interface TaskFormModalProps {
  opened: boolean;
  onClose: () => void;
  stepId?: string; // Optional for legacy step-level creation
  phaseId?: string; // For phase-level task creation
  templateId: string; // Add templateId for cross-template search
  task?: StepTask;
  parentTaskId?: string; // For creating child tasks
  phaseSteps?: PhaseStep[]; // Available steps for selection when creating from phase level
  onSuccess: () => void;
}

export default function TaskFormModal({ 
  opened, 
  onClose, 
  stepId,
  phaseId,
  templateId,
  task,
  parentTaskId,
  phaseSteps = [],
  onSuccess 
}: TaskFormModalProps) {
  const [formData, setFormData] = useState({
    task_name: '',
    description: '',
    step_id: '', // Added step selection for phase-level creation
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
  
  // New step creation states
  const [showNewStepInput, setShowNewStepInput] = useState(false);
  const [newStepName, setNewStepName] = useState('');
  const [creatingStep, setCreatingStep] = useState(false);
  const [localPhaseSteps, setLocalPhaseSteps] = useState<PhaseStep[]>(phaseSteps);

  const isEditing = !!task;

  // Load available parent tasks with search (debounced)
  useEffect(() => {
    const loadParentTasks = async () => {
      if (!opened) return;
      
      try {
        setLoadingParentTasks(true);
        
        if (phaseId) {
          // Phase-level task creation - optimized for scaling to millions of tasks
          console.log('Searching parent tasks for phase:', phaseId, 'search term:', parentTaskSearch.trim());
          
          // Require minimum 2 characters for search to avoid expensive queries
          if (parentTaskSearch.trim().length >= 2) {
            const searchResults = await stepTaskService.getAvailableParentTasksFromTemplateForPhase(
              templateId,
              phaseId, // Current phase ID for filtering
              task?.task_id, // Exclude current task when editing
              10, // Optimized for millions of tasks - fetch 10 at a time
              parentTaskSearch.trim() // Server-side search
            );
            
            console.log('Found', searchResults.length, 'parent tasks:', searchResults.map(t => `${t.task_name} (${t.phase_name})`));
            setAvailableParentTasks(searchResults);
          } else {
            // Clear results when search term is too short
            setAvailableParentTasks([]);
          }
        } else if (stepId) {
          // Legacy step-level task creation - optimized for scaling
          
          // Only search if we have a search term (to avoid expensive queries with millions of tasks)
          if (parentTaskSearch.trim().length >= 2) {
            // Get tasks from previous steps and phases using optimized search
            const searchResults = await stepTaskService.searchAvailableParentTasks(
              templateId,
              stepId,
              parentTaskSearch.trim(),
              task?.task_id, // Exclude current task when editing
              10 // Optimized for millions of tasks - fetch 10 at a time
            );
            
            setAvailableParentTasks(searchResults);
          } else {
            // For current step tasks, only show if no search term to avoid loading too many
            let currentStepTasks: StepTask[] = [];
            if (!parentTaskSearch.trim()) {
              currentStepTasks = await stepTaskService.getAvailableParentTasks(
                stepId, 
                task?.task_id, // Exclude current task when editing
                10 // Limit to 10 for performance
              );
              
              // Add current step context
              const tasksWithContext = currentStepTasks.map(task => ({ 
                ...task, 
                step_name: undefined, 
                phase_name: undefined 
              }));
              
              setAvailableParentTasks(tasksWithContext);
            } else {
              // Clear results when search term is too short
              setAvailableParentTasks([]);
            }
          }
        }
      } catch (error) {
        console.error('Error loading parent tasks:', error);
        setAvailableParentTasks([]);
      } finally {
        setLoadingParentTasks(false);
      }
    };

    // Debounce the search for better performance with millions of tasks
    const debounceTimer = setTimeout(loadParentTasks, 300);
    return () => clearTimeout(debounceTimer);
  }, [opened, stepId, phaseId, templateId, task?.task_id, parentTaskSearch]);


  useEffect(() => {
    if (task) {
      setFormData({
        task_name: task.task_name,
        description: task.description || '',
        step_id: task.step_id,
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
        step_id: stepId || (localPhaseSteps.length > 0 ? localPhaseSteps[0].step_id : ''), // Default to first step for phase-level creation
        estimated_hours: undefined,
        assigned_role_id: undefined,
        parent_task_id: parentTaskId || undefined,
        category: undefined,
        checklist_items: []
      });
    }
    
    // Update local phase steps when phaseSteps prop changes
    setLocalPhaseSteps(phaseSteps);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task, parentTaskId, stepId, phaseSteps]);

  // Handle creating a new step
  const handleCreateNewStep = async () => {
    if (!newStepName.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Step name is required',
        color: 'red'
      });
      return;
    }

    if (!phaseId) {
      notifications.show({
        title: 'Error',
        message: 'Phase ID is required to create a new step',
        color: 'red'
      });
      return;
    }

    setCreatingStep(true);

    try {
      const createStepData: CreatePhaseStepRequest = {
        phase_id: phaseId,
        step_name: newStepName.trim(),
        description: `Created during task creation`
      };

      const newStep = await phaseStepService.create(createStepData);
      
      // Add the new step to the local phaseSteps array and sort by step_order
      const updatedPhaseSteps = [...localPhaseSteps, newStep].sort((a, b) => a.step_order - b.step_order);
      setLocalPhaseSteps(updatedPhaseSteps);
      
      // Update formData to select the newly created step
      setFormData(prev => ({
        ...prev,
        step_id: newStep.step_id
      }));

      // Reset new step creation state
      setNewStepName('');
      setShowNewStepInput(false);

      notifications.show({
        title: 'Success',
        message: 'New step created successfully',
        color: 'green'
      });

      // Trigger onSuccess to refresh the parent component's step list
      if (onSuccess) {
        onSuccess();
      }

    } catch (error) {
      console.error('Error creating step:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to create new step',
        color: 'red'
      });
    } finally {
      setCreatingStep(false);
    }
  };

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

    // Validate step selection for phase-level creation
    if (phaseId && !formData.step_id) {
      notifications.show({
        title: 'Error',
        message: 'Step selection is required',
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
          step_id: formData.step_id || stepId!, // Use selected step or legacy stepId
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
    
    // Add step and phase info for cross-phase/step tasks
    if (parentTask.step_name && parentTask.phase_name) {
      label = `${parentTask.task_name} (${parentTask.phase_name} → ${parentTask.step_name})`;
    } else if (parentTask.step_name) {
      // Current step task with step info but no phase (shouldn't happen but just in case)
      label = `${parentTask.task_name} (Current Step)`;
    } else if (!parentTask.step_name && !parentTask.phase_name) {
      // Current step task without additional info
      label = `${parentTask.task_name} (Current Step)`;
    }
    
    return {
      value: parentTask.task_id,
      label
    };
  });

  // Create step options for Select component
  const stepOptions = localPhaseSteps.map(step => ({
    value: step.step_id,
    label: `${step.step_order}. ${step.step_name}`
  }));

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

          {/* Step Selection - only show for phase-level task creation */}
          {phaseId && (
            <Stack gap="sm">
              <Group align="flex-end" gap="sm">
                <Select
                  label="Step"
                  placeholder="Select a step for this task"
                  value={formData.step_id || null}
                  onChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    step_id: value || ''
                  }))}
                  data={stepOptions}
                  required
                  description="Choose which step this task belongs to"
                  style={{ flex: 1 }}
                />
                <Tooltip label="Create new step">
                  <ActionIcon 
                    size="lg" 
                    variant="light" 
                    color="blue"
                    onClick={() => setShowNewStepInput(!showNewStepInput)}
                  >
                    <IconPlus size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
              
              {showNewStepInput && (
                <Group align="flex-end" gap="sm">
                  <TextInput
                    label="New Step Name"
                    placeholder="Enter new step name"
                    value={newStepName}
                    onChange={(e) => setNewStepName(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    onClick={handleCreateNewStep}
                    loading={creatingStep}
                    disabled={!newStepName.trim()}
                    color="green"
                  >
                    Create Step
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowNewStepInput(false);
                      setNewStepName('');
                    }}
                  >
                    Cancel
                  </Button>
                </Group>
              )}
            </Stack>
          )}



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

          <Stack gap="xs">
            <Select
              label="Parent Task"
              placeholder={parentTaskSearch.trim().length >= 2 ? "Search results (top 10)..." : "Type at least 2 characters to search..."}
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
              description={phaseId 
                ? "Search for a parent task from current and previous phases. Type at least 2 characters to start searching." 
                : "Search for a parent task from current step or previous phases. Type at least 2 characters to start searching."}
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
            
            {availableParentTasks.length > 0 && parentTaskSearch.trim().length >= 2 && (
              <Text size="xs" c="dimmed">
                Found {availableParentTasks.length} tasks matching "{parentTaskSearch.trim()}" (showing top 10 results)
              </Text>
            )}
            
            {parentTaskSearch.trim().length >= 1 && parentTaskSearch.trim().length < 2 && (
              <Text size="xs" c="orange">
                Type at least 2 characters to search through millions of tasks efficiently
              </Text>
            )}
            
            {!parentTaskSearch.trim() && availableParentTasks.length > 0 && !phaseId && (
              <Text size="xs" c="dimmed">
                Showing {availableParentTasks.length} current step tasks (max 10). Search to find tasks from other phases.
              </Text>
            )}
          </Stack>

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
