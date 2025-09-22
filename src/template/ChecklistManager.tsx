import React, { useState } from 'react';
import {
  Button,
  Group,
  TextInput,
  ActionIcon,
  Text,
  Stack,
  Paper,
  Divider
} from '@mantine/core';
import {
  IconPlus,
  IconTrash,
  IconGripVertical,
} from '@tabler/icons-react';
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
import type { ChecklistItem } from './template.type';

interface ChecklistManagerProps {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
  readonly?: boolean;
}

interface SortableChecklistItemProps {
  item: ChecklistItem;
  onUpdate: (id: string, updates: Partial<ChecklistItem>) => void;
  onDelete: (id: string) => void;
  readonly?: boolean;
}

function SortableChecklistItem({ item, onUpdate, onDelete, readonly }: SortableChecklistItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      p="xs"
      withBorder
      shadow="xs"
    >
      <Group gap="xs">
        {!readonly && (
          <ActionIcon
            variant="subtle"
            size="sm"
            {...attributes}
            {...listeners}
            style={{ cursor: 'grab' }}
          >
            <IconGripVertical size={14} />
          </ActionIcon>
        )}
        
        <Text size="sm" c="dimmed" style={{ minWidth: '20px', textAlign: 'center' }}>
          {item.order}
        </Text>
        
        <TextInput
          value={item.text}
          onChange={(event) => onUpdate(item.id, { text: event.currentTarget.value })}
          placeholder="Checklist item text"
          variant="unstyled"
          style={{ flex: 1 }}
          readOnly={readonly}
        />
        
        {!readonly && (
          <ActionIcon
            variant="subtle"
            color="red"
            size="sm"
            onClick={() => onDelete(item.id)}
          >
            <IconTrash size={14} />
          </ActionIcon>
        )}
      </Group>
    </Paper>
  );
}

export default function ChecklistManager({ items, onChange, readonly = false }: ChecklistManagerProps) {
  const [newItemText, setNewItemText] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const reorderedItems = arrayMove(items, oldIndex, newIndex);
      
      // Update order values
      const updatedItems = reorderedItems.map((item, index) => ({
        ...item,
        order: index + 1,
      }));
      
      onChange(updatedItems);
    }
  };

  const addItem = () => {
    if (newItemText.trim()) {
      const newItem: ChecklistItem = {
        id: crypto.randomUUID(),
        text: newItemText.trim(),
        order: items.length + 1,
      };
      
      onChange([...items, newItem]);
      setNewItemText('');
    }
  };

  const updateItem = (id: string, updates: Partial<ChecklistItem>) => {
    const updatedItems = items.map(item =>
      item.id === id ? { ...item, ...updates } : item
    );
    onChange(updatedItems);
  };

  const deleteItem = (id: string) => {
    const filteredItems = items.filter(item => item.id !== id);
    // Reorder remaining items
    const reorderedItems = filteredItems.map((item, index) => ({
      ...item,
      order: index + 1,
    }));
    onChange(reorderedItems);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      addItem();
    }
  };

  // Sort items by order
  const sortedItems = [...items].sort((a, b) => a.order - b.order);

  const totalCount = items.length;

  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <Text size="sm" fw={500}>
          Checklist ({totalCount} items)
        </Text>
      </Group>

      {!readonly && (
        <Group gap="xs">
          <TextInput
            value={newItemText}
            onChange={(event) => setNewItemText(event.currentTarget.value)}
            placeholder="Add checklist item..."
            onKeyPress={handleKeyPress}
            style={{ flex: 1 }}
          />
          <Button
            size="sm"
            leftSection={<IconPlus size={14} />}
            onClick={addItem}
            disabled={!newItemText.trim()}
          >
            Add
          </Button>
        </Group>
      )}

      {sortedItems.length > 0 && (
        <>
          <Divider />
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedItems.map(item => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <Stack gap="xs">
                {sortedItems.map((item) => (
                  <SortableChecklistItem
                    key={item.id}
                    item={item}
                    onUpdate={updateItem}
                    onDelete={deleteItem}
                    readonly={readonly}
                  />
                ))}
              </Stack>
            </SortableContext>
          </DndContext>
        </>
      )}

      {sortedItems.length === 0 && !readonly && (
        <Text size="sm" c="dimmed" ta="center" py="md">
          No checklist items yet. Add one above.
        </Text>
      )}
    </Stack>
  );
}
