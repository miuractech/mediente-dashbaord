import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Table,
  ActionIcon,
  Badge,
  Text,
  Menu,
} from '@mantine/core';
import {
  IconEdit,
  IconTrash,
  IconEye,
  IconGripVertical,
  IconPlus,
  IconDots,
  IconCopy,
} from '@tabler/icons-react';
import type { TemplatePhase, PhaseStep, StepTask, TaskCategoryType } from './template.type';
import { InlineRoleAssignment } from './InlineRoleAssignment';
import { useState, useEffect } from 'react';
import supabase from '../supabase';

// Generic sortable item component
interface SortableItemProps {
  id: string;
  children: React.ReactNode;
}

function SortableItem({ id, children }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition, // Disable transition during drag for smoother experience
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1000 : 'auto',
    position: isDragging ? 'relative' : 'static',
  } as const;

  return (
    <Table.Tr 
      ref={setNodeRef} 
      style={style} 
      {...attributes}
      data-dragging={isDragging}
    >
      <Table.Td>
        <ActionIcon
          variant="subtle"
          color="gray"
          {...listeners}
          style={{ 
            cursor: isDragging ? 'grabbing' : 'grab',
            opacity: isDragging ? 0.7 : 1 
          }}
          title="Drag to reorder"
        >
          <IconGripVertical size={16} />
        </ActionIcon>
      </Table.Td>
      {children}
    </Table.Tr>
  );
}

// Draggable Phases List
interface DraggablePhasesListProps {
  phases: TemplatePhase[];
  onReorder: (phases: TemplatePhase[]) => void;
  onEdit: (phase: TemplatePhase) => void;
  onDelete: (phase: TemplatePhase) => void;
  onView: (phase: TemplatePhase) => void;
}

export function DraggablePhasesList({
  phases,
  onReorder,
  onEdit,
  onDelete,
  onView,
}: DraggablePhasesListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = phases.findIndex((phase) => phase.phase_id === active.id);
      const newIndex = phases.findIndex((phase) => phase.phase_id === over.id);

      const newPhases = arrayMove(phases, oldIndex, newIndex);
      // Update the phase_order for each phase
      const reorderedPhases = newPhases.map((phase, index) => ({
        ...phase,
        phase_order: index + 1,
      }));
      
      onReorder(reorderedPhases);
    }
  };

  return (
    <div style={{ overflowX: 'auto', width: '100%' }}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <Table style={{ minWidth: '800px' }}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ minWidth: '50px', width: '50px' }}></Table.Th>
              <Table.Th style={{ minWidth: '80px', width: '80px' }}>Order</Table.Th>
              <Table.Th style={{ minWidth: '200px', width: '200px' }}>Name</Table.Th>
              <Table.Th style={{ minWidth: '300px' }}>Description</Table.Th>
              <Table.Th style={{ minWidth: '150px', width: '150px', position: 'sticky', right: 0, backgroundColor: 'white', zIndex: 1, borderLeft: '1px solid #dee2e6' }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
        <Table.Tbody>
          <SortableContext
            items={phases.map(p => p.phase_id)}
            strategy={verticalListSortingStrategy}
          >
            {phases.map((phase) => (
              <SortableItem key={phase.phase_id} id={phase.phase_id}>
                <Table.Td 
                  style={{ cursor: 'pointer' }}
                  onClick={() => onView(phase)}
                >
                  <Badge variant="light">{phase.phase_order}</Badge>
                </Table.Td>
                <Table.Td 
                  style={{ cursor: 'pointer' }}
                  onClick={() => onView(phase)}
                >
                  <Text fw={500}>{phase.phase_name}</Text>
                </Table.Td>
                <Table.Td 
                  style={{ cursor: 'pointer' }}
                  onClick={() => onView(phase)}
                >
                  <Text size="sm" c="dimmed" lineClamp={2}>
                    {phase.description || 'No description'}
                  </Text>
                </Table.Td>
                <Table.Td onClick={(e) => e.stopPropagation()} style={{ position: 'sticky', right: 0, backgroundColor: 'white', zIndex: 1, borderLeft: '1px solid #dee2e6' }}>
                  <Menu shadow="md" width={200}>
                    <Menu.Target>
                      <ActionIcon variant="subtle" color="gray">
                        <IconDots size={16} />
                      </ActionIcon>
                    </Menu.Target>

                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={<IconEye size={14} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          onView(phase);
                        }}
                      >
                        View Tasks
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconEdit size={14} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(phase);
                        }}
                      >
                        Edit Phase
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Item
                        leftSection={<IconTrash size={14} />}
                        color="red"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(phase);
                        }}
                      >
                        Delete Phase
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Table.Td>
              </SortableItem>
            ))}
          </SortableContext>
        </Table.Tbody>
        </Table>
      </DndContext>
    </div>
  );
}

// Draggable Steps List
interface DraggableStepsListProps {
  steps: PhaseStep[];
  onReorder: (steps: PhaseStep[]) => void;
  onEdit: (step: PhaseStep) => void;
  onDelete: (step: PhaseStep) => void;
  onView: (step: PhaseStep) => void;
  onCopy?: (step: PhaseStep) => void;
}

export function DraggableStepsList({
  steps,
  onReorder,
  onEdit,
  onDelete,
  onView,
  onCopy,
}: DraggableStepsListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = steps.findIndex((step) => step.step_id === active.id);
      const newIndex = steps.findIndex((step) => step.step_id === over.id);

      const newSteps = arrayMove(steps, oldIndex, newIndex);
      // Update the step_order for each step
      const reorderedSteps = newSteps.map((step, index) => ({
        ...step,
        step_order: index + 1,
      }));
      
      onReorder(reorderedSteps);
    }
  };

  return (
    <div style={{ overflowX: 'auto', width: '100%' }}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <Table style={{ minWidth: '800px' }}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ minWidth: '50px', width: '50px' }}></Table.Th>
              <Table.Th style={{ minWidth: '80px', width: '80px' }}>Order</Table.Th>
              <Table.Th style={{ minWidth: '200px', width: '200px' }}>Name</Table.Th>
              <Table.Th style={{ minWidth: '300px' }}>Description</Table.Th>
              <Table.Th style={{ minWidth: '150px', width: '150px', position: 'sticky', right: 0, backgroundColor: 'white', zIndex: 1, borderLeft: '1px solid #dee2e6' }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
        <Table.Tbody>
          <SortableContext
            items={steps.map(s => s.step_id)}
            strategy={verticalListSortingStrategy}
          >
            {steps.map((step) => (
              <SortableItem key={step.step_id} id={step.step_id}>
                <Table.Td 
                  style={{ cursor: 'pointer' }}
                  onClick={() => onView(step)}
                >
                  <Badge variant="light">{step.step_order}</Badge>
                </Table.Td>
                <Table.Td 
                  style={{ cursor: 'pointer' }}
                  onClick={() => onView(step)}
                >
                  <Text fw={500}>{step.step_name}</Text>
                </Table.Td>
                <Table.Td 
                  style={{ cursor: 'pointer' }}
                  onClick={() => onView(step)}
                >
                  <Text size="sm" c="dimmed" lineClamp={2}>
                    {step.description || 'No description'}
                  </Text>
                </Table.Td>
                <Table.Td onClick={(e) => e.stopPropagation()} style={{ position: 'sticky', right: 0, backgroundColor: 'white', zIndex: 1, borderLeft: '1px solid #dee2e6' }}>
                  <Menu shadow="md" width={200}>
                    <Menu.Target>
                      <ActionIcon variant="subtle" color="gray">
                        <IconDots size={16} />
                      </ActionIcon>
                    </Menu.Target>

                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={<IconEye size={14} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          onView(step);
                        }}
                      >
                        View Tasks
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconEdit size={14} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(step);
                        }}
                      >
                        Edit Step
                      </Menu.Item>
                      {onCopy && (
                        <Menu.Item
                          leftSection={<IconCopy size={14} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            onCopy(step);
                          }}
                        >
                          Copy Step
                        </Menu.Item>
                      )}
                      <Menu.Divider />
                      <Menu.Item
                        leftSection={<IconTrash size={14} />}
                        color="red"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(step);
                        }}
                      >
                        Delete Step
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Table.Td>
              </SortableItem>
            ))}
          </SortableContext>
        </Table.Tbody>
        </Table>
      </DndContext>
    </div>
  );
}

// Draggable Tasks List
interface DraggableTasksListProps {
  tasks: StepTask[];
  onReorder: (tasks: StepTask[]) => void;
  onEdit: (task: StepTask) => void;
  onDelete: (task: StepTask) => void;
  onCreateChild: (parentTaskId: string) => void;
  onCopyTasks?: () => void;
  getRoleName: (roleId?: string) => string;
  templateId: string; // Add templateId to fetch cross-step parent info
  onRoleUpdate?: (taskId: string, roleId: string | null) => void;
}

// Draggable Phase Tasks List (tasks from all steps in a phase)
interface DraggablePhaseTasksListProps {
  tasks: (StepTask & { step_name: string; step_order: number })[];
  onReorder: (tasks: (StepTask & { step_name: string; step_order: number })[]) => void;
  onEdit: (task: StepTask) => void;
  onDelete: (task: StepTask) => void;
  onCreateChild: (parentTaskId: string) => void;
  onCopyTasks?: () => void;
  getRoleName: (roleId?: string) => string;
  templateId: string;
  onRoleUpdate?: (taskId: string, roleId: string | null) => void;
}


export function DraggablePhaseTasksList({
  tasks,
  onReorder,
  onEdit,
  onDelete,
  onCreateChild,
  onCopyTasks,
  getRoleName,
  templateId,
  onRoleUpdate,
}: DraggablePhaseTasksListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [crossTemplateParents, setCrossTemplateParents] = useState(new Map());
  const [loadingParentInfo, setLoadingParentInfo] = useState(false);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = tasks.findIndex((task) => task.task_id === active.id);
      const newIndex = tasks.findIndex((task) => task.task_id === over.id);

      const newTasks = arrayMove(tasks, oldIndex, newIndex);
      onReorder(newTasks);
    }
  };

  // Load cross-template parent task information
  useEffect(() => {
    const parentIds = tasks
      .filter(task => task.parent_task_id)
      .map(task => task.parent_task_id!)
      .filter(id => !tasks.some(t => t.task_id === id)); // Only external parents

    if (parentIds.length === 0) {
      setCrossTemplateParents(new Map());
      return;
    }

    const loadCrossTemplateParents = async () => {
      try {
        setLoadingParentInfo(true);
        
        const { data, error } = await supabase
          .from('step_tasks')
          .select(`
            task_id,
            task_name,
            phase_steps!inner(
              step_name,
              template_phases!inner(
                phase_name,
                template_id
              )
            )
          `)
          .eq('phase_steps.template_phases.template_id', templateId)
          .eq('is_archived', false)
          .in('task_id', parentIds);

        if (error) {
          console.error('Error loading cross-template parent info:', error);
          return;
        }

        const parentMap = new Map();
        
        if (data) {
          data.forEach(task => {
            const phaseSteps = task.phase_steps as unknown as { 
              step_name: string;
              template_phases: { phase_name: string }[] 
            }[];
            
            parentMap.set(task.task_id, {
              task_name: task.task_name,
              step_name: phaseSteps[0]?.step_name || '',
              phase_name: phaseSteps[0]?.template_phases[0]?.phase_name || ''
            });
          });
        }
        
        setCrossTemplateParents(parentMap);
      } catch (error) {
        console.error('Error loading cross-template parent info:', error);
      } finally {
        setLoadingParentInfo(false);
      }
    };

    loadCrossTemplateParents();
  }, [tasks, templateId]);

  // Get parent task name for display
  const getParentTaskName = (parentTaskId?: string) => {
    if (!parentTaskId) return null;
    
    // Check if parent is in current phase tasks
    const parentTask = tasks.find(t => t.task_id === parentTaskId);
    if (parentTask) {
      return parentTask.task_name;
    }
    
    // Check if parent is from cross-template
    const crossTemplateParent = crossTemplateParents.get(parentTaskId);
    if (crossTemplateParent) {
      return `${crossTemplateParent.task_name} (${crossTemplateParent.phase_name} → ${crossTemplateParent.step_name})`;
    }
    
    // Show loading state only if we're actually loading
    if (loadingParentInfo) {
      return 'Loading...';
    }
    
    return 'Unknown Parent';
  };

  // Get category display info
  const getCategoryInfo = (category?: TaskCategoryType) => {
    if (!category) return { label: '-', color: 'gray' };
    
    switch (category) {
      case 'monitor':
        return { label: 'Monitor', color: 'blue' };
      case 'coordinate':
        return { label: 'Coordinate', color: 'orange' };
      case 'execute':
        return { label: 'Execute', color: 'green' };
      default:
        return { label: '-', color: 'gray' };
    }
  };

  return (
    <div style={{ overflowX: 'auto', width: '100%' }}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <Table striped highlightOnHover style={{ minWidth: '1500px' }}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ minWidth: '50px', width: '50px' }}></Table.Th>
              <Table.Th style={{ minWidth: '80px', width: '80px' }}>Order</Table.Th>
              <Table.Th style={{ minWidth: '250px', width: '250px' }}>Task Name</Table.Th>
              <Table.Th style={{ minWidth: '180px', width: '180px' }}>Step</Table.Th>
              <Table.Th style={{ minWidth: '200px', width: '200px' }}>Parent Task</Table.Th>
              <Table.Th style={{ minWidth: '120px', width: '120px' }}>Category</Table.Th>
              <Table.Th style={{ minWidth: '100px', width: '100px' }}>Checklist</Table.Th>
              <Table.Th style={{ minWidth: '80px', width: '80px' }}>Days</Table.Th>
              <Table.Th style={{ minWidth: '150px', width: '150px' }}>Assigned To</Table.Th>
              <Table.Th style={{ minWidth: '300px' }}>Description</Table.Th>
              <Table.Th style={{ minWidth: '120px', width: '120px', position: 'sticky', right: 0, backgroundColor: 'white', zIndex: 1, borderLeft: '1px solid #dee2e6' }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
        <Table.Tbody>
          <SortableContext
            items={tasks.map(t => t.task_id)}
            strategy={verticalListSortingStrategy}
          >
            {tasks.map((task) => (
              <SortableItem key={task.task_id} id={task.task_id}>
                <Table.Td>
                  <Text fw={500} size="sm">{task.task_order}</Text>
                </Table.Td>
                <Table.Td>
                  <Text fw={500} size="sm" style={{ wordWrap: 'break-word', whiteSpace: 'normal' }}>
                    {task.task_name}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" style={{ wordWrap: 'break-word', whiteSpace: 'normal' }}>
                    {task.step_name}
                  </Text>
                </Table.Td>
                <Table.Td>
                  {task.parent_task_id ? (
                    <Text size="sm" c="blue" style={{ wordWrap: 'break-word', whiteSpace: 'normal' }}>
                      {getParentTaskName(task.parent_task_id)}
                    </Text>
                  ) : (
                    <Text size="sm" c="dimmed">-</Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <Badge 
                    variant="light" 
                    color={getCategoryInfo(task.category).color}
                    size="sm"
                  >
                    {getCategoryInfo(task.category).label}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  {task.checklist_items && task.checklist_items.length > 0 ? (
                    <Badge 
                      variant="outline" 
                      color="blue" 
                      size="sm"
                    >
                      {task.checklist_items.length} items
                    </Badge>
                  ) : (
                    <Text size="sm" c="dimmed">-</Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <Text size="sm">
                    {task.estimated_days ? `${task.estimated_days}d` : '-'}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <InlineRoleAssignment
                    task={task}
                    currentRoleName={getRoleName(task.assigned_role_id)}
                    onRoleUpdate={onRoleUpdate || (() => {})}
                    size="sm"
                  />
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed" style={{ wordWrap: 'break-word', whiteSpace: 'normal' }}>
                    {task.description || 'No description'}
                  </Text>
                </Table.Td>
                <Table.Td style={{ position: 'sticky', right: 0, backgroundColor: 'white', zIndex: 1, borderLeft: '1px solid #dee2e6' }}>
                  <Menu shadow="md" width={200}>
                    <Menu.Target>
                      <ActionIcon variant="subtle" color="gray" size="sm">
                        <IconDots size={14} />
                      </ActionIcon>
                    </Menu.Target>

                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={<IconEdit size={12} />}
                        onClick={() => onEdit(task)}
                      >
                        Edit Task
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconPlus size={12} />}
                        onClick={() => onCreateChild(task.task_id)}
                      >
                        Create Child Task
                      </Menu.Item>
                      {onCopyTasks && (
                        <Menu.Item
                          leftSection={<IconCopy size={12} />}
                          onClick={onCopyTasks}
                        >
                          Copy All Tasks
                        </Menu.Item>
                      )}
                      <Menu.Divider />
                      <Menu.Item
                        leftSection={<IconTrash size={12} />}
                        color="red"
                        onClick={() => onDelete(task)}
                      >
                        Delete Task
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Table.Td>
              </SortableItem>
            ))}
          </SortableContext>
        </Table.Tbody>
        </Table>
      </DndContext>
    </div>
  );
}

export function DraggableTasksList({
  tasks,
  onReorder,
  onEdit,
  onDelete,
  onCreateChild,
  onCopyTasks,
  getRoleName,
  templateId,
  onRoleUpdate,
}: DraggableTasksListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = tasks.findIndex((task) => task.task_id === active.id);
      const newIndex = tasks.findIndex((task) => task.task_id === over.id);

      const newTasks = arrayMove(tasks, oldIndex, newIndex);
      // Update the task_order for each task
      const reorderedTasks = newTasks.map((task, index) => ({
        ...task,
        task_order: index + 1,
      }));
      
      onReorder(reorderedTasks);
    }
  };

  // State to store cross-template parent task info
  const [crossTemplateParents, setCrossTemplateParents] = useState<Map<string, { task_name: string; step_name: string; phase_name: string }>>(new Map());
  const [loadingParentInfo, setLoadingParentInfo] = useState(false);

  // Load cross-template parent task information (optimized)
  useEffect(() => {
    const loadCrossTemplateParents = async () => {
      const parentIds = tasks
        .map(task => task.parent_task_id)
        .filter((id): id is string => !!id && !tasks.some(t => t.task_id === id)); // Only IDs not in current tasks

      if (parentIds.length === 0) {
        setCrossTemplateParents(new Map());
        return;
      }

      setLoadingParentInfo(true);
      try {
        // Get parent tasks by ID (limited query, only what we need)
        const { data, error } = await supabase
          .from('step_tasks')
          .select(`
            task_id,
            task_name,
            phase_steps!inner(
              step_name,
              step_order,
              phase_id,
              template_phases!inner(
                phase_name,
                phase_order,
                template_id
              )
            )
          `)
          .eq('phase_steps.template_phases.template_id', templateId)
          .eq('is_archived', false)
          .in('task_id', parentIds);

        if (error) {
          console.error('Error loading cross-template parent info:', error);
          return;
        }

        const parentMap = new Map();
        
        if (data) {
          data.forEach(task => {
            // Type assertion for Supabase nested relations
            const phaseSteps = task.phase_steps as unknown as { 
              step_name: string;
              template_phases: { phase_name: string }[] 
            }[];
            
            parentMap.set(task.task_id, {
              task_name: task.task_name,
              step_name: phaseSteps[0]?.step_name || '',
              phase_name: phaseSteps[0]?.template_phases[0]?.phase_name || ''
            });
          });
        }
        
        setCrossTemplateParents(parentMap);
      } catch (error) {
        console.error('Error loading cross-template parent info:', error);
      } finally {
        setLoadingParentInfo(false);
      }
    };

    loadCrossTemplateParents();
  }, [tasks, templateId]);

  // Get parent task name for display
  const getParentTaskName = (parentTaskId?: string) => {
    if (!parentTaskId) return null;
    
    // Check if parent is in current step tasks
    const parentTask = tasks.find(t => t.task_id === parentTaskId);
    if (parentTask) {
      return parentTask.task_name;
    }
    
    // Check if parent is from cross-template
    const crossTemplateParent = crossTemplateParents.get(parentTaskId);
    if (crossTemplateParent) {
      return `${crossTemplateParent.task_name} (${crossTemplateParent.phase_name} → ${crossTemplateParent.step_name})`;
    }
    
    // Show loading state only if we're actually loading
    if (loadingParentInfo) {
      return 'Loading...';
    }
    
    return 'Unknown Parent';
  };

  // Get category display info
  const getCategoryInfo = (category?: TaskCategoryType) => {
    if (!category) return { label: '-', color: 'gray' };
    
    switch (category) {
      case 'monitor':
        return { label: 'Monitor', color: 'blue' };
      case 'coordinate':
        return { label: 'Coordinate', color: 'orange' };
      case 'execute':
        return { label: 'Execute', color: 'green' };
      default:
        return { label: '-', color: 'gray' };
    }
  };

  return (
    <div style={{ overflowX: 'auto', width: '100%' }}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <Table striped highlightOnHover style={{ minWidth: '1300px' }}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ minWidth: '50px', width: '50px' }}></Table.Th>
              <Table.Th style={{ minWidth: '80px', width: '80px' }}>Order</Table.Th>
              <Table.Th style={{ minWidth: '300px', width: '300px' }}>Task Name</Table.Th>
              <Table.Th style={{ minWidth: '120px', width: '120px' }}>Category</Table.Th>
              <Table.Th style={{ minWidth: '100px', width: '100px' }}>Checklist</Table.Th>
              <Table.Th style={{ minWidth: '80px', width: '80px' }}>Days</Table.Th>
              <Table.Th style={{ minWidth: '150px', width: '150px' }}>Assigned To</Table.Th>
              <Table.Th style={{ minWidth: '350px' }}>Description</Table.Th>
              <Table.Th style={{ minWidth: '120px', width: '120px', position: 'sticky', right: 0, backgroundColor: 'white', zIndex: 1, borderLeft: '1px solid #dee2e6' }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
        <Table.Tbody>
          <SortableContext
            items={tasks.map(t => t.task_id)}
            strategy={verticalListSortingStrategy}
          >
            {tasks.map((task) => (
                             <SortableItem key={task.task_id} id={task.task_id}>
                 <Table.Td>
                   <Text fw={500} size="sm">{task.task_order}</Text>
                 </Table.Td>
                 <Table.Td>
                   <Text fw={500} size="sm" style={{ wordWrap: 'break-word', whiteSpace: 'normal' }}>
                     {task.task_name}
                   </Text>
                   {task.parent_task_id && (
                     <Text size="xs" c="dimmed" mt={2} style={{ wordWrap: 'break-word', whiteSpace: 'normal' }}>
                       Parent: {getParentTaskName(task.parent_task_id)}
                     </Text>
                   )}
                 </Table.Td>
                 <Table.Td>
                   <Badge 
                     variant="light" 
                     color={getCategoryInfo(task.category).color}
                     size="sm"
                   >
                     {getCategoryInfo(task.category).label}
                   </Badge>
                 </Table.Td>
                 <Table.Td>
                   {task.checklist_items && task.checklist_items.length > 0 ? (
                     <Badge 
                       variant="outline" 
                       color="blue" 
                       size="sm"
                     >
                       {task.checklist_items.length} items
                     </Badge>
                   ) : (
                     <Text size="sm" c="dimmed">-</Text>
                   )}
                 </Table.Td>
                 <Table.Td>
                   <Text size="sm">
                     {task.estimated_days ? `${task.estimated_days}d` : '-'}
                   </Text>
                 </Table.Td>
                 <Table.Td>
                   <InlineRoleAssignment
                     task={task}
                     currentRoleName={getRoleName(task.assigned_role_id)}
                     onRoleUpdate={onRoleUpdate || (() => {})}
                     size="sm"
                   />
                 </Table.Td>
                 <Table.Td>
                   <Text size="sm" c="dimmed" style={{ wordWrap: 'break-word', whiteSpace: 'normal' }}>
                     {task.description || 'No description'}
                   </Text>
                 </Table.Td>
                <Table.Td style={{ position: 'sticky', right: 0, backgroundColor: 'white', zIndex: 1, borderLeft: '1px solid #dee2e6' }}>
                  <Menu shadow="md" width={200}>
                    <Menu.Target>
                      <ActionIcon variant="subtle" color="gray" size="sm">
                        <IconDots size={14} />
                      </ActionIcon>
                    </Menu.Target>

                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={<IconEdit size={12} />}
                        onClick={() => onEdit(task)}
                      >
                        Edit Task
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconPlus size={12} />}
                        onClick={() => onCreateChild(task.task_id)}
                      >
                        Create Child Task
                      </Menu.Item>
                      {onCopyTasks && (
                        <Menu.Item
                          leftSection={<IconCopy size={12} />}
                          onClick={onCopyTasks}
                        >
                          Copy All Tasks
                        </Menu.Item>
                      )}
                      <Menu.Divider />
                      <Menu.Item
                        leftSection={<IconTrash size={12} />}
                        color="red"
                        onClick={() => onDelete(task)}
                      >
                        Delete Task
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Table.Td>
              </SortableItem>
            ))}
          </SortableContext>
        </Table.Tbody>
        </Table>
      </DndContext>
    </div>
  );
}
