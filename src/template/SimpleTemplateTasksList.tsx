import React, { useState, useEffect } from 'react';
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
  IconGripVertical,
  IconPlus,
  IconDots,
  IconCopy,
  IconUnlink,
} from '@tabler/icons-react';
import type { StepTask, TaskCategoryType } from './template.type';
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
    transition: isDragging ? 'none' : transition,
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

// Interface for simple template tasks list (all tasks sorted by order)
interface SimpleTemplateTasksListProps {
  tasks: (StepTask & { step_name: string; step_order: number; phase_name: string; phase_order: number })[];
  onReorder: (tasks: (StepTask & { step_name: string; step_order: number; phase_name: string; phase_order: number })[]) => void;
  onEdit: (task: StepTask) => void;
  onDelete: (task: StepTask) => void;
  onCreateChild: (parentTaskId: string) => void;
  onUnlinkParent: (task: StepTask) => void;
  onCopyTasks?: () => void;
  getRoleName: (roleId?: string) => string;
  templateId: string;
}

// Simple template tasks list component - all tasks in order without grouping
export function SimpleTemplateTasksList({
  tasks,
  onReorder,
  onEdit,
  onDelete,
  onCreateChild,
  onUnlinkParent,
  onCopyTasks,
  getRoleName,
  templateId,
}: SimpleTemplateTasksListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [crossTemplateParents, setCrossTemplateParents] = useState(new Map());
  const [loadingParentInfo, setLoadingParentInfo] = useState(false);

  // Validate drag-drop constraint: task cannot be placed above its parent
  const validateMove = (activeId: string, overId: string): boolean => {
    const activeTask = tasks.find(t => t.task_id === activeId);
    const overTask = tasks.find(t => t.task_id === overId);
    
    if (!activeTask || !overTask) return true;
    
    // If active task has a parent, ensure it's not being moved above its parent
    if (activeTask.parent_task_id) {
      const parentIndex = tasks.findIndex(t => t.task_id === activeTask.parent_task_id);
      const overIndex = tasks.findIndex(t => t.task_id === overId);
      
      if (parentIndex !== -1 && overIndex <= parentIndex) {
        return false; // Cannot place child above parent
      }
    }
    
    return true;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      // Validate the move
      if (!validateMove(active.id as string, over.id as string)) {
        return;
      }

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
    
    // Check if parent is in current template tasks
    const parentTask = tasks.find(t => t.task_id === parentTaskId);
    if (parentTask) {
      return `${parentTask.task_name}`;
    }
    
    // Check if parent is from cross-template
    const crossTemplateParent = crossTemplateParents.get(parentTaskId);
    if (crossTemplateParent) {
      return `${crossTemplateParent.task_name}`;
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

  // Sort tasks by task_order only
  const sortedTasks = [...tasks].sort((a, b) => a.task_order - b.task_order);

  return (
    <div style={{ overflowX: 'auto', width: '100%' }}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <Table striped highlightOnHover style={{ minWidth: '1600px' }}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ minWidth: '50px', width: '50px' }}></Table.Th>
              <Table.Th style={{ minWidth: '80px', width: '80px' }}>Order</Table.Th>
              <Table.Th style={{ minWidth: '250px', width: '250px' }}>Task Name</Table.Th>
              <Table.Th style={{ minWidth: '180px', width: '180px' }}>Phase</Table.Th>
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
              items={sortedTasks.map(t => t.task_id)}
              strategy={verticalListSortingStrategy}
            >
              {sortedTasks.map((task) => (
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
                      {task.phase_name}
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
                    <Badge 
                      variant="light" 
                      color={task.assigned_role_id ? 'blue' : 'gray'}
                      size="sm"
                    >
                      {getRoleName(task.assigned_role_id)}
                    </Badge>
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
                        {task.parent_task_id && (
                          <Menu.Item
                            leftSection={<IconUnlink size={12} />}
                            onClick={() => onUnlinkParent(task)}
                            color="orange"
                          >
                            Unlink Parent Task
                          </Menu.Item>
                        )}
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
