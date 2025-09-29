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
import type { StepTask, PhaseStep, TemplatePhase, CreateStepTaskRequest, UpdateStepTaskRequest, TaskCategoryType, ChecklistItem, CreatePhaseStepRequest, CreateTemplatePhaseRequest } from './template.type';
import { stepTaskService, phaseStepService, templatePhaseService } from './projectTemplateService';
import ChecklistManager from './ChecklistManager';
import { SearchableRoleSelect } from './SearchableRoleSelect';
import supabase from '../supabase';

interface TaskFormModalProps {
  opened: boolean;
  onClose: () => void;
  stepId?: string; // Optional for legacy step-level creation
  phaseId?: string; // For phase-level task creation
  templateId: string; // Add templateId for cross-template search
  task?: StepTask;
  parentTaskId?: string; // For creating child tasks
  phaseSteps?: PhaseStep[]; // Available steps for selection when creating from phase level
  templatePhases?: TemplatePhase[]; // Available phases for template-level task creation
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
  templatePhases = [],
  onSuccess 
}: TaskFormModalProps) {
  const [formData, setFormData] = useState({
    task_name: '',
    description: '',
    phase_id: '', // Added phase selection for template-level creation
    step_id: '', // Added step selection for phase-level creation
    estimated_days: undefined as number | undefined,
    assigned_role_id: undefined as string | undefined,
    parent_task_id: undefined as string | undefined,
    category: undefined as TaskCategoryType | undefined,
    checklist_items: [] as ChecklistItem[]
  });
  const [loading, setLoading] = useState(false);
  const [availableParentTasks, setAvailableParentTasks] = useState<(StepTask & { step_name?: string; phase_name?: string })[]>([]);
  const [loadingParentTasks, setLoadingParentTasks] = useState(false);
  const [parentTaskSearch, setParentTaskSearch] = useState('');
  
  // New phase creation states
  const [showNewPhaseInput, setShowNewPhaseInput] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState('');
  const [creatingPhase, setCreatingPhase] = useState(false);
  const [localTemplatePhases, setLocalTemplatePhases] = useState<TemplatePhase[]>(templatePhases);
  
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
        
        // Always allow template-wide parent task search regardless of context
        
        
        // For editing tasks with existing parent, show the parent even without search
        // For new tasks or searching, require minimum 2 characters
        if (parentTaskSearch.trim().length >= 2 || (isEditing && task?.parent_task_id && availableParentTasks.length === 0)) {
          
          
          // Use template-wide search as the primary method (works in all contexts)
          
          const searchResults = await stepTaskService.searchTemplateWideTasks(
            templateId,
            parentTaskSearch.trim(),
            task?.task_id,
            10
          );
          
          
          
          setAvailableParentTasks(searchResults);
        } else if (!isEditing || !task?.parent_task_id) {
          
          // Clear results when search term is too short (but keep existing parent for editing)
          setAvailableParentTasks([]);
        }
      } catch (error) {
        console.error('❌ Error loading parent tasks:', error);
        setAvailableParentTasks([]);
      } finally {
        setLoadingParentTasks(false);
        
      }
    };

    // Debounce the search for better performance with millions of tasks
    const debounceTimer = setTimeout(loadParentTasks, 300);
    return () => clearTimeout(debounceTimer);
  }, [opened, stepId, phaseId, templateId, task?.task_id, task?.parent_task_id, parentTaskSearch, isEditing, availableParentTasks.length]);

  // Load steps when phase is selected (for template-level task creation)
  useEffect(() => {
    const loadPhaseSteps = async () => {
      if (!formData.phase_id || phaseId) return; // Skip if we already have phase context
      
      try {
        const steps = await phaseStepService.getByPhaseId(formData.phase_id);
        setLocalPhaseSteps(steps);
        
        // Auto-select first step if available
        if (steps.length > 0 && !formData.step_id) {
          setFormData(prev => ({
            ...prev,
            step_id: steps[0].step_id
          }));
        }
      } catch (error) {
        console.error('Error loading phase steps:', error);
        setLocalPhaseSteps([]);
      }
    };

    loadPhaseSteps();
  }, [formData.phase_id, formData.step_id, phaseId]);

  // Load phase information when editing a task by step_id
  useEffect(() => {
    const loadPhaseFromStep = async () => {
      if (!task || !task.step_id || phaseId) return; // Skip if we already have phase context or not editing
      
      
      
      try {
        // Get the step to find its phase_id
        const step = await phaseStepService.getById(task.step_id);
        
        
        if (step && step.phase_id) {
          
          setFormData(prev => ({
            ...prev,
            phase_id: step.phase_id
          }));

          // Load all phases to populate the dropdown
          const allPhases = await templatePhaseService.getByTemplateId(templateId);
          
          setLocalTemplatePhases(allPhases);

          // Load steps for the phase
          const stepsInPhase = await phaseStepService.getByPhaseId(step.phase_id);
          
          setLocalPhaseSteps(stepsInPhase);
        }
      } catch (error) {
        console.error('❌ Error loading phase from step:', error);
      }
    };

    loadPhaseFromStep();
  }, [task, phaseId, templateId]);

  // Load current parent task info when editing
  useEffect(() => {
    const loadCurrentParentTask = async () => {
      if (!task?.parent_task_id || !opened) return;
      
      
      
      try {
        // Search for the current parent task to populate the dropdown
        const parentResults = await stepTaskService.searchTemplateWideTasks(
          templateId,
          '', // Empty search to get the parent task by ID
          task.task_id,
          50 // Larger limit to ensure we find the parent
        );
        
        // Find the specific parent task
        const parentTask = parentResults.find(t => t.task_id === task.parent_task_id);
        
        if (parentTask) {
          
          setAvailableParentTasks([parentTask]);
          setParentTaskSearch(parentTask.task_name); // Set search term to parent task name
        } else {
          
          // Fallback: direct query for the parent task
          const { data, error } = await supabase
            .from('step_tasks')
            .select(`
              *,
              phase_steps!inner(
                step_name,
                step_order,
                template_phases!inner(
                  phase_name,
                  phase_order,
                  template_id
                )
              )
            `)
            .eq('task_id', task.parent_task_id)
            .eq('is_archived', false)
            .single();
            
          if (data && !error) {
            const formattedParent = {
              ...data,
              step_name: data.phase_steps.step_name,
              step_order: data.phase_steps.step_order,
              phase_name: data.phase_steps.template_phases.phase_name,
              phase_order: data.phase_steps.template_phases.phase_order,
            };
            setAvailableParentTasks([formattedParent]);
            setParentTaskSearch(formattedParent.task_name);
            
          }
        }
      } catch (error) {
        console.error('❌ [TaskFormModal] Error loading current parent task:', error);
      }
    };

    loadCurrentParentTask();
  }, [task?.parent_task_id, task?.task_id, templateId, opened]);

  useEffect(() => {
    if (task) {
      
      
      setFormData({
        task_name: task.task_name,
        description: task.description || '',
        phase_id: phaseId || '', // Set current phase if available - will be updated by loadPhaseFromStep
        step_id: task.step_id,
        estimated_days: task.estimated_days || undefined,
        assigned_role_id: task.assigned_role_id || undefined,
        parent_task_id: task.parent_task_id || undefined,
        category: task.category || undefined,
        checklist_items: task.checklist_items || []
      });
      
      
    } else {
      setFormData({
        task_name: '',
        description: '',
        phase_id: phaseId || (localTemplatePhases.length > 0 ? localTemplatePhases[0].phase_id : ''), // Default to current phase or first available
        step_id: stepId || (localPhaseSteps.length > 0 ? localPhaseSteps[0].step_id : ''), // Default to first step for phase-level creation
        estimated_days: undefined,
        assigned_role_id: undefined,
        parent_task_id: parentTaskId || undefined,
        category: undefined,
        checklist_items: []
      });
      
      // Clear parent task search when creating new task
      setParentTaskSearch('');
      setAvailableParentTasks([]);
    }
    
    // Update local states when props change
    setLocalPhaseSteps(phaseSteps);
    setLocalTemplatePhases(templatePhases);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task, parentTaskId, stepId, phaseId, phaseSteps, templatePhases]);

  // Handle creating a new phase
  const handleCreateNewPhase = async () => {
    if (!newPhaseName.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Phase name is required',
        color: 'red'
      });
      return;
    }

    setCreatingPhase(true);

    try {
      const createPhaseData: CreateTemplatePhaseRequest = {
        template_id: templateId,
        phase_name: newPhaseName.trim(),
        description: `Created during task creation`
      };

      const newPhase = await templatePhaseService.create(createPhaseData);
      
      // Add the new phase to the local templatePhases array and sort by phase_order
      const updatedTemplatePhases = [...localTemplatePhases, newPhase].sort((a, b) => a.phase_order - b.phase_order);
      setLocalTemplatePhases(updatedTemplatePhases);
      
      // Update formData to select the newly created phase
      setFormData(prev => ({
        ...prev,
        phase_id: newPhase.phase_id,
        step_id: '' // Reset step selection since new phase has no steps yet
      }));

      // Clear local steps since new phase has no steps
      setLocalPhaseSteps([]);

      // Reset new phase creation state
      setNewPhaseName('');
      setShowNewPhaseInput(false);

      notifications.show({
        title: 'Success',
        message: 'New phase created successfully',
        color: 'green'
      });

      

      // Don't call onSuccess here - wait until the task is actually created
      // The parent will be refreshed when the task is created and this modal closes

    } catch (error) {
      console.error('Error creating phase:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to create new phase',
        color: 'red'
      });
    } finally {
      setCreatingPhase(false);
    }
  };

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

    const currentPhaseId = phaseId || formData.phase_id;
    if (!currentPhaseId) {
      notifications.show({
        title: 'Error',
        message: 'Phase selection is required to create a new step',
        color: 'red'
      });
      return;
    }

    setCreatingStep(true);

    try {
      const createStepData: CreatePhaseStepRequest = {
        phase_id: currentPhaseId,
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

      

      // Don't call onSuccess here - wait until the task is actually created
      // The parent will be refreshed when the task is created and this modal closes

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

    // Validate phase and step selection for template-level creation
    if (!phaseId && !stepId && !formData.phase_id) {
      notifications.show({
        title: 'Error',
        message: 'Phase selection is required',
        color: 'red'
      });
      return;
    }

    if (!stepId && !formData.step_id) {
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
          step_id: formData.step_id || undefined, // Allow updating the step
          estimated_days: formData.estimated_days || undefined,
          assigned_role_id: formData.assigned_role_id || undefined,
          parent_task_id: formData.parent_task_id === null ? null : formData.parent_task_id || undefined,
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
        const finalStepId = formData.step_id || stepId!;
        
        
        const createData: CreateStepTaskRequest = {
          step_id: finalStepId, // Use selected step or legacy stepId
          task_name: formData.task_name.trim(),
          description: formData.description.trim() || undefined,
          estimated_days: formData.estimated_days || undefined,
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

  // Create phase options for Select component
  const phaseOptions = localTemplatePhases.map(phase => ({
    value: phase.phase_id,
    label: `${phase.phase_order}. ${phase.phase_name}`
  }));

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

          {/* Phase Selection - only show for template-level task creation */}
          {!phaseId && !stepId && (
            <Stack gap="sm">
              <Group align="flex-end" gap="sm">
                <Select
                  label="Phase"
                  placeholder="Select a phase for this task"
                  value={formData.phase_id || null}
                  onChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    phase_id: value || '',
                    step_id: '' // Reset step when phase changes
                  }))}
                  data={phaseOptions}
                  required
                  description="Choose which phase this task belongs to"
                  style={{ flex: 1 }}
                />
                <Tooltip label="Create new phase">
                  <ActionIcon 
                    size="lg" 
                    variant="light" 
                    color="blue"
                    onClick={() => setShowNewPhaseInput(!showNewPhaseInput)}
                  >
                    <IconPlus size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
              
              {showNewPhaseInput && (
                <Group align="flex-end" gap="sm">
                  <TextInput
                    label="New Phase Name"
                    placeholder="Enter new phase name"
                    value={newPhaseName}
                    onChange={(e) => setNewPhaseName(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    onClick={handleCreateNewPhase}
                    loading={creatingPhase}
                    disabled={!newPhaseName.trim()}
                    color="green"
                  >
                    Create Phase
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowNewPhaseInput(false);
                      setNewPhaseName('');
                    }}
                  >
                    Cancel
                  </Button>
                </Group>
              )}
            </Stack>
          )}

          {/* Step Selection - show for phase-level or template-level task creation */}
          {(phaseId || (!stepId && formData.phase_id)) && (
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
            label="Estimated Days"
            placeholder="Enter estimated days (optional)"
            value={formData.estimated_days}
            // @ts-ignore
            onChange={(value) => setFormData(prev => ({ 
              ...prev, 
              estimated_days: value || undefined
            }))}
            min={0}
            decimalScale={1}
          />

          <Stack gap="xs">
            <Select
              label="Parent Task"
              placeholder={
                isEditing && formData.parent_task_id && availableParentTasks.length > 0 
                  ? "Current parent task shown"
                  : parentTaskSearch.trim().length >= 2 
                    ? "Search results (top 10)..." 
                    : "Type at least 2 characters to search..."
              }
              value={formData.parent_task_id || null}
              onChange={(value) => {
                
                setFormData(prev => ({ 
                  ...prev, 
                  parent_task_id: value || undefined
                }));
                
                // If cleared, reset search but keep available tasks for re-selection
                if (value === null) {
                  setParentTaskSearch('');
                }
              }}
              data={parentTaskOptions}
              searchable
              clearable
              onSearchChange={(value) => {
                
                setParentTaskSearch(value);
              }}
              searchValue={parentTaskSearch}
              description="Search for a parent task from anywhere in this template. Click the X to remove parent dependency."
              limit={10}
              nothingFoundMessage={
                loadingParentTasks 
                  ? "Searching..." 
                  : parentTaskSearch.trim().length >= 2
                    ? "No matching tasks found. Try different search terms." 
                    : isEditing && formData.parent_task_id
                      ? "Current parent task is shown above"
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
                Type at least 2 characters to search across all tasks in this template efficiently
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
