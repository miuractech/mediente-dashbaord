import { useState, useEffect } from 'react';
import { useDebouncedValue } from '@mantine/hooks';
import {
  Drawer,
  Stack,
  Group,
  Text,
  Badge,
  Button,
  Textarea,
  FileInput,
  Card,
  Timeline,
  ActionIcon,
  ScrollArea,
  Alert,
  Progress,
  Checkbox,
  NumberInput,
  TextInput,
  Avatar,
  Modal,
  SimpleGrid,
  Loader,
  Center,
} from '@mantine/core';
import {
  IconX,
  IconFile,
  IconDownload,
  IconTrash,
  IconSend,
  IconUser,
  IconAlertTriangle,
  IconCheck,
  IconFileUpload,
  IconSearch,
  IconPlus,
  IconEdit,
  IconDeviceFloppy,
  IconPlayerPlay,
  IconRestore,
  IconClock,
  IconCalendar,
  IconTarget,
  IconStairs,
  IconHash,
  IconListCheck,
  IconUsers,
  IconPaperclip,
  IconMessage,
  IconInfoCircle,
  IconHourglass,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import type { TaskStatusType } from './project.typs';
import { useUpdateTask, useTask, useUploadTaskFile, useAddTaskComment, useAvailableCrew, useAssignCrewToTask, useRemoveCrewFromTask, useDeleteTaskFile } from './project.hook';

interface TaskDrawerProps {
  taskId: string | null;
  opened: boolean;
  onClose: () => void;
  onTaskUpdate?: () => void;
}

export function TaskDrawer({ taskId, opened, onClose, onTaskUpdate }: TaskDrawerProps) {
  const { task, refetch } = useTask(taskId);
  const { updateTask, loading: updating } = useUpdateTask();
  const { uploadMultipleFiles, loading: uploadingFiles } = useUploadTaskFile();
  const { addComment, loading: submittingComment } = useAddTaskComment();
  const { deleteFile, loading: deletingFile } = useDeleteTaskFile();
  
  const [comment, setComment] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [assignCrewModalOpened, setAssignCrewModalOpened] = useState(false);
  const [crewSearchTerm, setCrewSearchTerm] = useState('');
  const [debouncedCrewSearchTerm] = useDebouncedValue(crewSearchTerm, 300);
  const [selectedCrewId, setSelectedCrewId] = useState<string>('');
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({
    task_name: '',
    task_description: '',
    estimated_days: 0,
  });
  const [deleteConfirmOpened, setDeleteConfirmOpened] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{ id: string; file_url: string; file_name: string } | null>(null);
  
  const { crew: availableCrew, loading: crewLoading } = useAvailableCrew(debouncedCrewSearchTerm);
  const { assignCrew, loading: assigningCrew } = useAssignCrewToTask();
  const { removeCrew, loading: removingCrew } = useRemoveCrewFromTask();

  // Initialize edit data when task changes
  useEffect(() => {
    if (task) {
      setEditData({
        task_name: task.task_name,
        task_description: task.task_description || '',
        estimated_days: task.estimated_days || 0,
      });
    }
  }, [task]);

  if (!task) return null;

  const handleStatusChange = async (newStatus: TaskStatusType) => {
    const success = await updateTask(task.project_task_id, { task_status: newStatus });
    if (success) {
      refetch();
      onTaskUpdate?.();
      notifications.show({
        title: 'Task Updated',
        message: `Task status changed to ${newStatus}`,
        color: 'green',
      });
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim() || !taskId) return;
    
    const result = await addComment(taskId, comment.trim());
    if (result) {
      setComment('');
      refetch();
    }
  };

  const handleFileUpload = async () => {
    if (files.length === 0 || !taskId) return;
    
    const uploadedFiles = await uploadMultipleFiles(files, taskId);
    if (uploadedFiles.length > 0) {
      const updatedAttachments = [...(task.file_attachments || []), ...uploadedFiles];
      const success = await updateTask(task.project_task_id, { file_attachments: updatedAttachments });
      
      if (success) {
        setFiles([]);
        refetch();
      }
    }
  };

  const handleChecklistToggle = async (itemId: string, completed: boolean) => {
    const updatedChecklist = task.checklist_items.map(item =>
      item.id === itemId ? { ...item, completed } : item
    );
    
    const success = await updateTask(task.project_task_id, { checklist_items: updatedChecklist });
    if (success) {
      refetch();
    }
  };

  const handleAssignCrew = async () => {
    if (!selectedCrewId || !taskId) return;
    
    const success = await assignCrew({
      project_task_id: taskId,
      project_role_id: '', // This will be determined by the service
      crew_id: selectedCrewId,
    });
    
    if (success) {
      setSelectedCrewId('');
      setAssignCrewModalOpened(false);
      refetch();
      onTaskUpdate?.();
    }
  };

  const handleRemoveCrew = async (crewId: string) => {
    if (!taskId) return;
    
    const success = await removeCrew(taskId, crewId);
    if (success) {
      refetch();
      onTaskUpdate?.();
    }
  };

  const handleEditToggle = () => {
    if (editMode) {
      // Reset edit data to original values when canceling
      setEditData({
        task_name: task.task_name,
        task_description: task.task_description || '',
        estimated_days: task.estimated_days || 0,
      });
    }
    setEditMode(!editMode);
  };

  const handleSaveEdit = async () => {
    const success = await updateTask(task.project_task_id, {
      task_name: editData.task_name,
      task_description: editData.task_description || undefined,
      estimated_days: editData.estimated_days || undefined,
    });
    
    if (success) {
      setEditMode(false);
      refetch();
      onTaskUpdate?.();
    }
  };

  const handleQuickStatusChange = async (newStatus: TaskStatusType) => {
    const success = await updateTask(task.project_task_id, { task_status: newStatus });
    if (success) {
      refetch();
      onTaskUpdate?.();
    }
  };

  const handleDeleteFile = async () => {
    if (!fileToDelete || !task) return;
    
    const success = await deleteFile(fileToDelete.file_url);
    if (success) {
      const updatedAttachments = task.file_attachments.filter(file => file.id !== fileToDelete.id);
      const updateSuccess = await updateTask(task.project_task_id, { file_attachments: updatedAttachments });
      
      if (updateSuccess) {
        refetch();
        setDeleteConfirmOpened(false);
        setFileToDelete(null);
      }
    }
  };

  const handleDownloadFile = (fileUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const assignedCrewIds = task?.assigned_crew.map(crew => crew.crew_id) || [];
  const unassignedCrew = availableCrew.filter(crew => !assignedCrewIds.includes(crew.id));

  const getStatusColor = (status: TaskStatusType) => {
    switch (status) {
      case 'completed': return 'green';
      case 'ongoing': return 'blue';
      case 'escalated': return 'red';
      case 'pending': return 'orange';
      default: return 'gray';
    }
  };

  const completedChecklistItems = task.checklist_items?.filter(item => item.completed).length || 0;
  const totalChecklistItems = task.checklist_items?.length || 0;
  const checklistProgress = totalChecklistItems > 0 ? (completedChecklistItems / totalChecklistItems) * 100 : 0;

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={
        <Group justify="space-between" w="100%" py="md">
          <Group gap="md">
            <div style={{ 
              padding: '8px', 
              borderRadius: '10px', 
              background: 'var(--mantine-color-primary-1)' 
            }}>
              <IconInfoCircle size={20} color="var(--mantine-color-primary-6)" />
            </div>
            <div>
              <Text fw={700} size="lg" c="dark.8">Task Details</Text>
              <Text size="sm" c="dimmed">Complete task information and actions</Text>
            </div>
          </Group>
          <Group gap="xs">
            {/* Quick Status Actions */}
            {task.task_status === 'pending' && (
              <Button
                size="xs"
                variant="light"
                color="primary"
                leftSection={<IconPlayerPlay size={14} />}
                onClick={() => handleQuickStatusChange('ongoing')}
                style={{ borderRadius: '8px' }}
              >
                Start
              </Button>
            )}
            
            {task.task_status === 'ongoing' && (
              <Button
                size="xs"
                variant="light"
                color="green"
                leftSection={<IconCheck size={14} />}
                onClick={() => handleQuickStatusChange('completed')}
                style={{ borderRadius: '8px' }}
              >
                Complete
              </Button>
            )}
            
            {task.task_status === 'completed' && (
              <Button
                size="xs"
                variant="light"
                color="blue"
                leftSection={<IconRestore size={14} />}
                onClick={() => handleQuickStatusChange('ongoing')}
                style={{ borderRadius: '8px' }}
              >
                Reopen
              </Button>
            )}

            {/* Edit Toggle */}
            <ActionIcon
              variant={editMode ? "filled" : "light"}
              size="lg"
              color={editMode ? "red" : "primary"}
              onClick={handleEditToggle}
              style={{ borderRadius: '10px' }}
            >
              {editMode ? <IconX size={18} /> : <IconEdit size={18} />}
            </ActionIcon>

            {/* Save Button (only in edit mode) */}
            {editMode && (
              <ActionIcon
                variant="filled"
                size="lg"
                color="green"
                onClick={handleSaveEdit}
                loading={updating}
                style={{ borderRadius: '10px' }}
              >
                <IconDeviceFloppy size={18} />
              </ActionIcon>
            )}

          </Group>
        </Group>
      }
      position="right"
      size="lg"
      scrollAreaComponent={ScrollArea.Autosize}
      styles={{
        header: {
          borderBottom: '1px solid var(--mantine-color-gray-2)',
          paddingBottom: '16px',
        },
        body: {
          background: '#fafafa',
          padding: '24px',
        },
      }}
    >
      <Stack gap="xl">
        {/* Task Header */}
        <Card 
          withBorder={false} 
          p="xl" 
          radius="lg"
          style={{ 
            background: 'white',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
            border: '1px solid var(--mantine-color-gray-1)'
          }}
        >
          {editMode ? (
            <Stack gap="lg">
              <TextInput
                label="Task Name"
                value={editData.task_name}
                onChange={(e) => setEditData(prev => ({ ...prev, task_name: e.target.value }))}
                size="md"
                leftSection={<IconTarget size={18} />}
                styles={{
                  input: { borderRadius: '12px', border: '1px solid var(--mantine-color-gray-2)' },
                  label: { fontWeight: 600, color: 'var(--mantine-color-dark-6)' }
                }}
              />
              <Textarea
                label="Description"
                value={editData.task_description}
                onChange={(e) => setEditData(prev => ({ ...prev, task_description: e.target.value }))}
                minRows={3}
                size="md"
                leftSection={<IconMessage size={18} />}
                styles={{
                  input: { borderRadius: '12px', border: '1px solid var(--mantine-color-gray-2)' },
                  label: { fontWeight: 600, color: 'var(--mantine-color-dark-6)' }
                }}
              />
              <NumberInput
                label="Estimated Days"
                value={editData.estimated_days}
                onChange={(value) => setEditData(prev => ({ ...prev, estimated_days: Number(value) || 0 }))}
                min={0}
                step={0.5}
                decimalScale={1}
                size="md"
                leftSection={<IconClock size={18} />}
                styles={{
                  input: { borderRadius: '12px', border: '1px solid var(--mantine-color-gray-2)' },
                  label: { fontWeight: 600, color: 'var(--mantine-color-dark-6)' }
                }}
              />
            </Stack>
          ) : (
            <>
              <Group gap="md" mb="xl">
                <div style={{ 
                  padding: '12px', 
                  borderRadius: '12px', 
                  background: 'var(--mantine-color-primary-1)' 
                }}>
                  <IconTarget size={24} color="var(--mantine-color-primary-6)" />
                </div>
                <div style={{ flex: 1 }}>
                  <Text fw={700} size="xl" c="dark.8" mb="xs">{task.task_name}</Text>
                  <Group gap="sm">
                    <Badge 
                      color={getStatusColor(task.task_status)} 
                      variant="light" 
                      size="md"
                      style={{ 
                        borderRadius: '8px',
                        fontWeight: 600,
                        textTransform: 'capitalize'
                      }}
                    >
                      {task.task_status}
                    </Badge>
                    {task.is_custom && (
                      <Badge variant="outline" color="primary" size="md" style={{ borderRadius: '8px' }}>
                        Custom Task
                      </Badge>
                    )}
                    {task.category && (
                      <Badge variant="outline" size="md" style={{ borderRadius: '8px' }}>
                        {task.category}
                      </Badge>
                    )}
                    {task.is_manually_escalated && (
                      <Badge color="red" variant="light" size="md" style={{ borderRadius: '8px' }}>
                        <Group gap={4}>
                          <IconAlertTriangle size={12} />
                          <span>Escalated</span>
                        </Group>
                      </Badge>
                    )}
                  </Group>
                </div>
              </Group>

              {task.task_description && (
                <div style={{ 
                  padding: '16px', 
                  borderRadius: '12px', 
                  background: 'var(--mantine-color-gray-0)',
                  border: '1px solid var(--mantine-color-gray-1)'
                }}>
                  <Group gap="sm" align="flex-start">
                    <IconMessage size={16} color="var(--mantine-color-primary-6)" style={{ marginTop: 2 }} />
                    <Text size="md" c="dark.7" style={{ flex: 1, lineHeight: 1.6 }}>
                      {task.task_description}
                    </Text>
                  </Group>
                </div>
              )}
            </>
          )}

          {/* Status Change Buttons - only show when not in edit mode */}
          {!editMode && (
            <Group gap="sm" mt="xl">
              {task.task_status === 'pending' && (
                <>
                  <Button
                    size="sm"
                    variant="light"
                    color="primary"
                    leftSection={<IconPlayerPlay size={16} />}
                    onClick={() => handleStatusChange('ongoing')}
                    disabled={updating}
                    style={{ borderRadius: '10px', fontWeight: 500 }}
                  >
                    Start Task
                  </Button>
                  <Button
                    size="sm"
                    variant="light"
                    color="red"
                    leftSection={<IconAlertTriangle size={16} />}
                    onClick={() => handleStatusChange('escalated')}
                    disabled={updating}
                    style={{ borderRadius: '10px', fontWeight: 500 }}
                  >
                    Escalate
                  </Button>
                </>
              )}
              {task.task_status === 'ongoing' && (
                <>
                  <Button
                    size="sm"
                    variant="light"
                    color="green"
                    leftSection={<IconCheck size={16} />}
                    onClick={() => handleStatusChange('completed')}
                    disabled={updating}
                    style={{ borderRadius: '10px', fontWeight: 500 }}
                  >
                    Mark Complete
                  </Button>
                  <Button
                    size="sm"
                    variant="light"
                    color="red"
                    leftSection={<IconAlertTriangle size={16} />}
                    onClick={() => handleStatusChange('escalated')}
                    disabled={updating}
                    style={{ borderRadius: '10px', fontWeight: 500 }}
                  >
                    Escalate
                  </Button>
                </>
              )}
              {task.task_status === 'escalated' && (
                <>
                  <Button
                    size="sm"
                    variant="light"
                    color="primary"
                    leftSection={<IconPlayerPlay size={16} />}
                    onClick={() => handleStatusChange('ongoing')}
                    disabled={updating}
                    style={{ borderRadius: '10px', fontWeight: 500 }}
                  >
                    Resume
                  </Button>
                  <Button
                    size="sm"
                    variant="light"
                    color="green"
                    leftSection={<IconCheck size={16} />}
                    onClick={() => handleStatusChange('completed')}
                    disabled={updating}
                    style={{ borderRadius: '10px', fontWeight: 500 }}
                  >
                    Mark Complete
                  </Button>
                </>
              )}
              {task.task_status === 'completed' && (
                <Button
                  size="sm"
                  variant="light"
                  color="blue"
                  leftSection={<IconRestore size={16} />}
                  onClick={() => handleStatusChange('ongoing')}
                  disabled={updating}
                  style={{ borderRadius: '10px', fontWeight: 500 }}
                >
                  Reopen Task
                </Button>
              )}
            </Group>
          )}
        </Card>

        {/* Task Details */}
        <Card 
          withBorder={false} 
          p="xl" 
          radius="lg"
          style={{ 
            background: 'white',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
            border: '1px solid var(--mantine-color-gray-1)'
          }}
        >
          <Group gap="md" mb="xl">
            <div style={{ 
              padding: '10px', 
              borderRadius: '12px', 
              background: 'var(--mantine-color-blue-1)' 
            }}>
              <IconInfoCircle size={20} color="var(--mantine-color-blue-6)" />
            </div>
            <Text fw={600} size="lg" c="dark.8">Task Information</Text>
          </Group>
          <Stack gap="lg">
            <div style={{ 
              padding: '16px', 
              borderRadius: '12px', 
              background: 'var(--mantine-color-violet-0)',
              border: '1px solid var(--mantine-color-violet-1)'
            }}>
              <Group justify="space-between" align="center">
                <Group gap="sm">
                  <IconHash size={18} color="var(--mantine-color-violet-6)" />
                  <Text size="md" fw={500} c="dark.7">Phase</Text>
                </Group>
                <Badge variant="light" color="violet" size="md" style={{ borderRadius: '8px', fontWeight: 600 }}>
                  Phase {task.phase_order}: {task.phase_name}
                </Badge>
              </Group>
            </div>
            
            <div style={{ 
              padding: '16px', 
              borderRadius: '12px', 
              background: 'var(--mantine-color-indigo-0)',
              border: '1px solid var(--mantine-color-indigo-1)'
            }}>
              <Group justify="space-between" align="center">
                <Group gap="sm">
                  <IconStairs size={18} color="var(--mantine-color-indigo-6)" />
                  <Text size="md" fw={500} c="dark.7">Step</Text>
                </Group>
                <Badge variant="light" color="indigo" size="md" style={{ borderRadius: '8px', fontWeight: 600 }}>
                  Step {task.step_order}: {task.step_name}
                </Badge>
              </Group>
            </div>

            {task.estimated_days && (
              <div style={{ 
                padding: '16px', 
                borderRadius: '12px', 
                background: 'var(--mantine-color-orange-0)',
                border: '1px solid var(--mantine-color-orange-1)'
              }}>
                <Group justify="space-between" align="center">
                  <Group gap="sm">
                    <IconClock size={18} color="var(--mantine-color-orange-6)" />
                    <Text size="md" fw={500} c="dark.7">Estimated Days</Text>
                  </Group>
                  <Text size="md" fw={600} c="orange.7">{task.estimated_days}d</Text>
                </Group>
              </div>
            )}

            <div style={{ 
              padding: '16px', 
              borderRadius: '12px', 
              background: 'var(--mantine-color-teal-0)',
              border: '1px solid var(--mantine-color-teal-1)'
            }}>
              <Group justify="space-between" align="center">
                <Group gap="sm">
                  <IconHourglass size={18} color="var(--mantine-color-teal-6)" />
                  <Text size="md" fw={500} c="dark.7">Actual Days</Text>
                </Group>
                <Text size="md" fw={600} c="teal.7">{task.actual_days}d</Text>
              </Group>
            </div>

            {task.deadline && (
              <div style={{ 
                padding: '16px', 
                borderRadius: '12px', 
                background: 'var(--mantine-color-red-0)',
                border: '1px solid var(--mantine-color-red-1)'
              }}>
                <Group justify="space-between" align="center">
                  <Group gap="sm">
                    <IconCalendar size={18} color="var(--mantine-color-red-6)" />
                    <Text size="md" fw={500} c="dark.7">Deadline</Text>
                  </Group>
                  <Text size="md" fw={600} c="red.7">{new Date(task.deadline).toLocaleDateString()}</Text>
                </Group>
              </div>
            )}

            {task.started_at && (
              <div style={{ 
                padding: '16px', 
                borderRadius: '12px', 
                background: 'var(--mantine-color-green-0)',
                border: '1px solid var(--mantine-color-green-1)'
              }}>
                <Group justify="space-between" align="center">
                  <Group gap="sm">
                    <IconPlayerPlay size={18} color="var(--mantine-color-green-6)" />
                    <Text size="md" fw={500} c="dark.7">Started</Text>
                  </Group>
                  <Text size="md" fw={600} c="green.7">{new Date(task.started_at).toLocaleDateString()}</Text>
                </Group>
              </div>
            )}

            {task.completed_at && (
              <div style={{ 
                padding: '16px', 
                borderRadius: '12px', 
                background: 'var(--mantine-color-green-0)',
                border: '1px solid var(--mantine-color-green-1)'
              }}>
                <Group justify="space-between" align="center">
                  <Group gap="sm">
                    <IconCheck size={18} color="var(--mantine-color-green-6)" />
                    <Text size="md" fw={500} c="dark.7">Completed</Text>
                  </Group>
                  <Text size="md" fw={600} c="green.7">{new Date(task.completed_at).toLocaleDateString()}</Text>
                </Group>
              </div>
            )}
          </Stack>
        </Card>

        {/* Checklist */}
        {task.checklist_items && task.checklist_items.length > 0 && (
          <Card 
            withBorder={false} 
            p="xl" 
            radius="lg"
            style={{ 
              background: 'white',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
              border: '1px solid var(--mantine-color-gray-1)'
            }}
          >
            <Group justify="space-between" mb="xl">
              <Group gap="md">
                <div style={{ 
                  padding: '10px', 
                  borderRadius: '12px', 
                  background: 'var(--mantine-color-green-1)' 
                }}>
                  <IconListCheck size={20} color="var(--mantine-color-green-6)" />
                </div>
                <Text fw={600} size="lg" c="dark.8">Checklist</Text>
              </Group>
              <Badge variant="light" color="green" size="md" style={{ borderRadius: '8px', fontWeight: 600 }}>
                {completedChecklistItems}/{totalChecklistItems} completed
              </Badge>
            </Group>
            
            <Progress 
              value={checklistProgress} 
              mb="xl" 
              size="lg" 
              color="green" 
              style={{ borderRadius: '8px' }}
            />
            
            <Stack gap="md">
              {task.checklist_items
                .sort((a, b) => a.order - b.order)
                .map((item) => (
                  <div key={item.id} style={{ 
                    padding: '12px 16px', 
                    borderRadius: '12px', 
                    background: item.completed ? 'var(--mantine-color-green-0)' : 'var(--mantine-color-gray-0)',
                    border: `1px solid ${item.completed ? 'var(--mantine-color-green-2)' : 'var(--mantine-color-gray-2)'}`
                  }}>
                    <Checkbox
                      label={item.text}
                      checked={item.completed || false}
                      onChange={(event) => handleChecklistToggle(item.id, event.currentTarget.checked)}
                      size="md"
                      styles={{
                        label: { fontWeight: 500, color: 'var(--mantine-color-dark-7)' }
                      }}
                    />
                  </div>
                ))}
            </Stack>
          </Card>
        )}

        {/* Assigned Crew */}
        <Card 
          withBorder={false} 
          p="xl" 
          radius="lg"
          style={{ 
            background: 'white',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
            border: '1px solid var(--mantine-color-gray-1)'
          }}
        >
          <Group justify="space-between" mb="xl">
            <Group gap="md">
              <div style={{ 
                padding: '10px', 
                borderRadius: '12px', 
                background: 'var(--mantine-color-blue-1)' 
              }}>
                <IconUsers size={20} color="var(--mantine-color-blue-6)" />
              </div>
              <Text fw={600} size="lg" c="dark.8">Assigned People</Text>
            </Group>
            <Button
              size="sm"
              variant="light"
              color="primary"
              leftSection={<IconPlus size={16} />}
              onClick={() => setAssignCrewModalOpened(true)}
              style={{ borderRadius: '10px', fontWeight: 500 }}
            >
              Assign
            </Button>
          </Group>
          
          {task?.assigned_crew && task.assigned_crew.length > 0 ? (
            <Stack gap="md">
              {task.assigned_crew.map((crew) => (
                <div key={crew.crew_id} style={{ 
                  padding: '16px', 
                  borderRadius: '12px', 
                  background: 'var(--mantine-color-gray-0)',
                  border: '1px solid var(--mantine-color-gray-2)'
                }}>
                  <Group justify="space-between">
                    <Group gap="md">
                      <Avatar size="lg" radius="xl" color="primary" gradient={{ from: 'primary.4', to: 'primary.6' }}>
                        <IconUser size={24} />
                      </Avatar>
                      <div>
                        <Text size="md" fw={600} c="dark.8">{crew.crew_name}</Text>
                        <Text size="sm" c="dimmed" mb="xs">{crew.crew_email}</Text>
                        <Badge 
                          size="sm" 
                          variant="light" 
                          color="primary"
                          style={{ borderRadius: '6px', fontWeight: 500 }}
                        >
                          {crew.role_name} - {crew.department_name}
                        </Badge>
                      </div>
                    </Group>
                    <ActionIcon
                      size="lg"
                      variant="light"
                      color="red"
                      onClick={() => handleRemoveCrew(crew.crew_id)}
                      loading={removingCrew}
                      disabled={task?.assigned_crew.length === 1}
                      title={task?.assigned_crew.length === 1 ? "Cannot remove the last assigned person" : "Remove from task"}
                      style={{ borderRadius: '10px' }}
                    >
                      <IconTrash size={18} />
                    </ActionIcon>
                  </Group>
                </div>
              ))}
            </Stack>
          ) : (
            <div style={{ 
              padding: '32px', 
              textAlign: 'center',
              borderRadius: '12px',
              background: 'var(--mantine-color-gray-0)',
              border: '1px solid var(--mantine-color-gray-2)'
            }}>
              <IconUsers size={32} color="var(--mantine-color-gray-5)" style={{ marginBottom: '12px' }} />
              <Text size="md" c="dimmed" fw={500}>
                No one assigned to this task
              </Text>
            </div>
          )}
        </Card>

        {/* File Attachments */}
        <Card 
          withBorder={false} 
          p="xl" 
          radius="lg"
          style={{ 
            background: 'white',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
            border: '1px solid var(--mantine-color-gray-1)'
          }}
        >
          <Group gap="md" mb="xl">
            <div style={{ 
              padding: '10px', 
              borderRadius: '12px', 
              background: 'var(--mantine-color-orange-1)' 
            }}>
              <IconPaperclip size={20} color="var(--mantine-color-orange-6)" />
            </div>
            <Text fw={600} size="lg" c="dark.8">File Attachments</Text>
          </Group>
          
          {/* Upload Section */}
          <Stack gap="md" mb="xl">
            <FileInput
              placeholder="Select files to upload"
              multiple
              value={files}
              onChange={setFiles}
              leftSection={<IconFileUpload size={18} />}
              size="md"
              styles={{
                input: { borderRadius: '12px', border: '1px solid var(--mantine-color-gray-2)' }
              }}
            />
            {files.length > 0 && (
              <Button
                size="md"
                color="primary"
                onClick={handleFileUpload}
                loading={uploadingFiles}
                leftSection={<IconFileUpload size={18} />}
                style={{ borderRadius: '10px', fontWeight: 500 }}
              >
                Upload {files.length} file{files.length > 1 ? 's' : ''}
              </Button>
            )}
          </Stack>

          {/* Existing Attachments */}
          {task.file_attachments && task.file_attachments.length > 0 ? (
            <Stack gap="md">
              {task.file_attachments.map((file) => (
                <div key={file.id} style={{ 
                  padding: '16px', 
                  borderRadius: '12px', 
                  background: 'var(--mantine-color-gray-0)',
                  border: '1px solid var(--mantine-color-gray-2)'
                }}>
                  <Group justify="space-between">
                    <Group gap="md">
                      <div style={{ 
                        padding: '10px', 
                        borderRadius: '10px', 
                        background: 'var(--mantine-color-blue-1)' 
                      }}>
                        <IconFile size={20} color="var(--mantine-color-blue-6)" />
                      </div>
                      <div>
                        <Text size="md" fw={600} c="dark.8">{file.file_name}</Text>
                        <Text size="sm" c="dimmed" mb="xs">
                          {(file.file_size / 1024 / 1024).toFixed(2)} MB • {file.file_type?.toUpperCase()}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {new Date(file.uploaded_at).toLocaleString()}
                        </Text>
                      </div>
                    </Group>
                    <Group gap="sm">
                      <ActionIcon 
                        size="lg" 
                        variant="light" 
                        color="blue"
                        onClick={() => handleDownloadFile(file.file_url, file.file_name)}
                        title="Download file"
                        style={{ borderRadius: '10px' }}
                      >
                        <IconDownload size={18} />
                      </ActionIcon>
                      <ActionIcon 
                        size="lg" 
                        variant="light" 
                        color="red"
                        onClick={() => {
                          setFileToDelete({ id: file.id, file_url: file.file_url, file_name: file.file_name });
                          setDeleteConfirmOpened(true);
                        }}
                        loading={deletingFile}
                        title="Delete file"
                        style={{ borderRadius: '10px' }}
                      >
                        <IconTrash size={18} />
                      </ActionIcon>
                    </Group>
                  </Group>
                </div>
              ))}
            </Stack>
          ) : (
            <div style={{ 
              padding: '32px', 
              textAlign: 'center',
              borderRadius: '12px',
              background: 'var(--mantine-color-gray-0)',
              border: '1px solid var(--mantine-color-gray-2)'
            }}>
              <IconPaperclip size={32} color="var(--mantine-color-gray-5)" style={{ marginBottom: '12px' }} />
              <Text size="md" c="dimmed" fw={500}>
                No files attached
              </Text>
            </div>
          )}
        </Card>

        {/* Comments */}
        <Card 
          withBorder={false} 
          p="xl" 
          radius="lg"
          style={{ 
            background: 'white',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
            border: '1px solid var(--mantine-color-gray-1)'
          }}
        >
          <Group gap="md" mb="xl">
            <div style={{ 
              padding: '10px', 
              borderRadius: '12px', 
              background: 'var(--mantine-color-grape-1)' 
            }}>
              <IconMessage size={20} color="var(--mantine-color-grape-6)" />
            </div>
            <Text fw={600} size="lg" c="dark.8">Comments</Text>
          </Group>
          
          {/* Add Comment */}
          <Stack gap="md" mb="xl">
            <Textarea
              placeholder="Add a comment..."
              value={comment}
              onChange={(event) => setComment(event.currentTarget.value)}
              minRows={3}
              size="md"
              leftSection={<IconMessage size={18} />}
              styles={{
                input: { borderRadius: '12px', border: '1px solid var(--mantine-color-gray-2)' }
              }}
            />
            <Button
              size="md"
              color="primary"
              onClick={handleAddComment}
              loading={submittingComment}
              disabled={!comment.trim()}
              leftSection={<IconSend size={18} />}
              style={{ borderRadius: '10px', fontWeight: 500 }}
            >
              Add Comment
            </Button>
          </Stack>

          {/* Comments Timeline */}
          {task.comments && task.comments.length > 0 ? (
            <Timeline 
              active={task.comments.length - 1} 
              bulletSize={32} 
              lineWidth={2}
              color="primary"
            >
              {task.comments.map((comment) => (
                <Timeline.Item
                  key={comment.id}
                  bullet={
                    <div style={{ 
                      padding: '6px', 
                      borderRadius: '50%', 
                      background: 'var(--mantine-color-primary-1)' 
                    }}>
                      <IconUser size={16} color="var(--mantine-color-primary-6)" />
                    </div>
                  }
                  title={
                    <Text fw={600} size="md" c="dark.8">{comment.author}</Text>
                  }
                >
                  <div style={{ 
                    padding: '12px 16px', 
                    borderRadius: '12px', 
                    background: 'var(--mantine-color-gray-0)',
                    border: '1px solid var(--mantine-color-gray-1)',
                    marginTop: '8px'
                  }}>
                    <Text size="md" mb="sm" c="dark.7" style={{ lineHeight: 1.6 }}>
                      {comment.text}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {new Date(comment.created_at).toLocaleString()}
                    </Text>
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
          ) : (
            <div style={{ 
              padding: '32px', 
              textAlign: 'center',
              borderRadius: '12px',
              background: 'var(--mantine-color-gray-0)',
              border: '1px solid var(--mantine-color-gray-2)'
            }}>
              <IconMessage size={32} color="var(--mantine-color-gray-5)" style={{ marginBottom: '12px' }} />
              <Text size="md" c="dimmed" fw={500}>
                No comments yet
              </Text>
            </div>
          )}
        </Card>

        {/* Escalation Info */}
        {task.escalation_reason && (
          <Alert 
            color="red" 
            icon={<IconAlertTriangle size={20} />} 
            p="xl" 
            radius="lg"
            style={{
              border: '1px solid var(--mantine-color-red-2)',
              background: 'var(--mantine-color-red-0)'
            }}
          >
            <Text fw={700} mb="md" size="lg" c="red.8">Escalation Reason</Text>
            <Text size="md" mb="md" c="dark.7" style={{ lineHeight: 1.6 }}>
              {task.escalation_reason}
            </Text>
            {task.escalated_at && (
              <Text size="sm" c="red.6" fw={500}>
                Escalated on {new Date(task.escalated_at).toLocaleString()}
              </Text>
            )}
          </Alert>
        )}
      </Stack>

      {/* Assign Crew Modal */}
      <Modal
        opened={assignCrewModalOpened}
        onClose={() => {
          setAssignCrewModalOpened(false);
          setCrewSearchTerm('');
          setSelectedCrewId('');
        }}
        title={
          <Group gap="md">
            <div style={{ 
              padding: '8px', 
              borderRadius: '10px', 
              background: 'var(--mantine-color-blue-1)' 
            }}>
              <IconUsers size={20} color="var(--mantine-color-blue-6)" />
            </div>
            <Text fw={600} size="lg" c="dark.8">Assign Crew to Task</Text>
          </Group>
        }
        size="lg"
        radius="lg"
        styles={{
          content: { borderRadius: '16px' },
          header: { borderBottom: '1px solid var(--mantine-color-gray-2)', paddingBottom: '16px' },
          body: { padding: '24px' }
        }}
      >
        <Stack gap="lg">
          <TextInput
            placeholder="Search crew members..."
            value={crewSearchTerm}
            onChange={(e) => setCrewSearchTerm(e.target.value)}
            leftSection={<IconSearch size={16} />}
            size="md"
            styles={{
              input: { borderRadius: '12px', border: '1px solid var(--mantine-color-gray-2)' }
            }}
          />
          
          {crewLoading ? (
            <Center h={200}>
              <Loader size="lg" color="primary" />
            </Center>
          ) : unassignedCrew.length === 0 ? (
            <div style={{ 
              padding: '32px', 
              textAlign: 'center',
              borderRadius: '12px',
              background: 'var(--mantine-color-gray-0)',
              border: '1px solid var(--mantine-color-gray-2)'
            }}>
              <IconUsers size={32} color="var(--mantine-color-gray-5)" style={{ marginBottom: '12px' }} />
              <Text c="dimmed" fw={500}>
                {crewSearchTerm ? 'No crew members found matching your search' : 'All available crew members are already assigned'}
              </Text>
            </div>
          ) : (
            <SimpleGrid cols={1} spacing="md" mah={400} style={{ overflowY: 'auto' }}>
              {unassignedCrew.map((crew) => (
                <div
                  key={crew.id}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: `2px solid ${selectedCrewId === crew.id ? 'var(--mantine-color-primary-4)' : 'var(--mantine-color-gray-2)'}`,
                    background: selectedCrewId === crew.id ? 'var(--mantine-color-primary-0)' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => setSelectedCrewId(crew.id)}
                >
                  <Group gap="md">
                    <Avatar
                      src={crew.photo_url}
                      size="md"
                      radius="xl"
                      color="primary"
                    >
                      <IconUser size={20} />
                    </Avatar>
                    <div style={{ flex: 1 }}>
                      <Text size="md" fw={600} c="dark.8">{crew.name}</Text>
                      <Text size="sm" c="dimmed">{crew.email}</Text>
                    </div>
                    {selectedCrewId === crew.id && (
                      <div style={{ 
                        padding: '6px', 
                        borderRadius: '50%', 
                        background: 'var(--mantine-color-primary-6)' 
                      }}>
                        <IconCheck size={16} color="white" />
                      </div>
                    )}
                  </Group>
                </div>
              ))}
            </SimpleGrid>
          )}
          
          <Group justify="flex-end" mt="lg">
            <Button
              variant="subtle"
              onClick={() => {
                setAssignCrewModalOpened(false);
                setCrewSearchTerm('');
                setSelectedCrewId('');
              }}
              style={{ borderRadius: '10px' }}
            >
              Cancel
            </Button>
            <Button
              color="primary"
              onClick={handleAssignCrew}
              disabled={!selectedCrewId}
              loading={assigningCrew}
              style={{ borderRadius: '10px', fontWeight: 500 }}
            >
              Assign
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Delete File Confirmation Modal */}
      <Modal
        opened={deleteConfirmOpened}
        onClose={() => {
          setDeleteConfirmOpened(false);
          setFileToDelete(null);
        }}
        title={
          <Group gap="md">
            <div style={{ 
              padding: '8px', 
              borderRadius: '10px', 
              background: 'var(--mantine-color-red-1)' 
            }}>
              <IconTrash size={20} color="var(--mantine-color-red-6)" />
            </div>
            <Text fw={600} size="lg" c="dark.8">Delete File</Text>
          </Group>
        }
        size="md"
        radius="lg"
        styles={{
          content: { borderRadius: '16px' },
          header: { borderBottom: '1px solid var(--mantine-color-gray-2)', paddingBottom: '16px' },
          body: { padding: '24px' }
        }}
      >
        <Stack gap="lg">
          <div style={{ 
            padding: '16px', 
            borderRadius: '12px', 
            background: 'var(--mantine-color-red-0)',
            border: '1px solid var(--mantine-color-red-2)'
          }}>
            <Text size="md" c="dark.7" style={{ lineHeight: 1.6 }}>
              Are you sure you want to delete <Text component="span" fw={600} c="red.7">"{fileToDelete?.file_name}"</Text>? 
              This action cannot be undone.
            </Text>
          </div>
          
          <Group justify="flex-end" mt="lg">
            <Button
              variant="subtle"
              onClick={() => {
                setDeleteConfirmOpened(false);
                setFileToDelete(null);
              }}
              style={{ borderRadius: '10px' }}
            >
              Cancel
            </Button>
            <Button
              color="red"
              onClick={handleDeleteFile}
              loading={deletingFile}
              style={{ borderRadius: '10px', fontWeight: 500 }}
            >
              Delete File
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Drawer>
  );
}
