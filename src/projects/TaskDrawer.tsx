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
  Tooltip,
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
  IconFlag,
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
        <Group justify="space-between" w="100%" py="xs">
          <Group gap="sm">
            <IconInfoCircle size={20} color="var(--mantine-color-blue-6)" />
            <Text fw={600} size="lg">Task Details</Text>
          </Group>
          <Group gap="sm">
            {/* Quick Status Actions */}
            {task.task_status === 'pending' && (
              <Tooltip label="Start Task">
                <ActionIcon
                  variant="light"
                  size="md"
                  color="blue"
                  onClick={() => handleQuickStatusChange('ongoing')}
                >
                  <IconPlayerPlay size={16} />
                </ActionIcon>
              </Tooltip>
            )}
            
            {task.task_status === 'ongoing' && (
              <>
                <Tooltip label="Complete Task">
                  <ActionIcon
                    variant="light"
                    size="md"
                    color="green"
                    onClick={() => handleQuickStatusChange('completed')}
                  >
                    <IconCheck size={16} />
                  </ActionIcon>
                </Tooltip>
              </>
            )}
            
            {task.task_status === 'completed' && (
              <Tooltip label="Reopen Task">
                <ActionIcon
                  variant="light"
                  size="md"
                  color="blue"
                  onClick={() => handleQuickStatusChange('ongoing')}
                >
                  <IconRestore size={16} />
                </ActionIcon>
              </Tooltip>
            )}

            {/* Edit Toggle */}
            <Tooltip label={editMode ? "Cancel Edit" : "Edit Task"}>
              <ActionIcon
                variant={editMode ? "filled" : "light"}
                size="md"
                color={editMode ? "red" : "blue"}
                onClick={handleEditToggle}
              >
                {editMode ? <IconX size={16} /> : <IconEdit size={16} />}
              </ActionIcon>
            </Tooltip>

            {/* Save Button (only in edit mode) */}
            {editMode && (
              <Tooltip label="Save Changes">
                <ActionIcon
                  variant="filled"
                  size="md"
                  color="green"
                  onClick={handleSaveEdit}
                  loading={updating}
                >
                  <IconDeviceFloppy size={16} />
                </ActionIcon>
              </Tooltip>
            )}

          </Group>
        </Group>
      }
      position="right"
      size="lg"
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <Stack gap="xl">
        {/* Task Header */}
        <Card withBorder p="xl" radius="md">
          {editMode ? (
            <Stack gap="lg">
              <TextInput
                label="Task Name"
                value={editData.task_name}
                onChange={(e) => setEditData(prev => ({ ...prev, task_name: e.target.value }))}
                size="md"
                leftSection={<IconTarget size={18} />}
              />
              <Textarea
                label="Description"
                value={editData.task_description}
                onChange={(e) => setEditData(prev => ({ ...prev, task_description: e.target.value }))}
                minRows={3}
                size="md"
                leftSection={<IconMessage size={18} />}
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
              />
            </Stack>
          ) : (
            <>
              <Group gap="sm" mb="lg">
                <IconTarget size={20} color="var(--mantine-color-blue-6)" />
                <Text fw={700} size="xl">{task.task_name}</Text>
              </Group>
              
              <Group gap="sm" mb="lg">
                <Badge 
                  color={getStatusColor(task.task_status)} 
                  variant="light" 
                  size="lg"
                  leftSection={<IconFlag size={14} />}
                >
                  {task.task_status.toUpperCase()}
                </Badge>
                {task.is_custom && (
                  <Badge variant="outline" color="blue" size="md">
                    Custom Task
                  </Badge>
                )}
                {task.category && (
                  <Badge variant="outline" size="md">
                    {task.category}
                  </Badge>
                )}
                {task.is_manually_escalated && (
                  <Badge color="red" variant="light" size="md" leftSection={<IconAlertTriangle size={14} />}>
                    Escalated
                  </Badge>
                )}
              </Group>

              {task.task_description && (
                <Group gap="sm" align="flex-start" mb="lg">
                  <IconMessage size={18} color="var(--mantine-color-dimmed)" style={{ marginTop: 2 }} />
                  <Text size="md" c="dimmed" style={{ flex: 1 }}>
                    {task.task_description}
                  </Text>
                </Group>
              )}
            </>
          )}

          {/* Status Change Buttons - only show when not in edit mode */}
          {!editMode && (
            <Group gap="xs" mt="md">
              {task.task_status === 'pending' && (
                <>
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<IconPlayerPlay size={14} />}
                    onClick={() => handleStatusChange('ongoing')}
                    disabled={updating}
                  >
                    Start
                  </Button>
                  <Button
                    size="xs"
                    variant="light"
                    color="red"
                    leftSection={<IconAlertTriangle size={14} />}
                    onClick={() => handleStatusChange('escalated')}
                    disabled={updating}
                  >
                    Escalate
                  </Button>
                </>
              )}
              {task.task_status === 'ongoing' && (
                <>
                  <Button
                    size="xs"
                    variant="light"
                    color="green"
                    leftSection={<IconCheck size={14} />}
                    onClick={() => handleStatusChange('completed')}
                    disabled={updating}
                  >
                    Complete
                  </Button>
                  <Button
                    size="xs"
                    variant="light"
                    color="red"
                    leftSection={<IconAlertTriangle size={14} />}
                    onClick={() => handleStatusChange('escalated')}
                    disabled={updating}
                  >
                    Escalate
                  </Button>
                </>
              )}
              {task.task_status === 'escalated' && (
                <>
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<IconPlayerPlay size={14} />}
                    onClick={() => handleStatusChange('ongoing')}
                    disabled={updating}
                  >
                    Resume
                  </Button>
                  <Button
                    size="xs"
                    variant="light"
                    color="green"
                    leftSection={<IconCheck size={14} />}
                    onClick={() => handleStatusChange('completed')}
                    disabled={updating}
                  >
                    Complete
                  </Button>
                </>
              )}
              {task.task_status === 'completed' && (
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<IconRestore size={14} />}
                  onClick={() => handleStatusChange('ongoing')}
                  disabled={updating}
                >
                  Reopen
                </Button>
              )}
            </Group>
          )}
        </Card>

        {/* Task Details */}
        <Card withBorder p="xl" radius="md">
          <Group gap="sm" mb="lg">
            <IconInfoCircle size={20} color="var(--mantine-color-blue-6)" />
            <Text fw={600} size="lg">Task Information</Text>
          </Group>
          <Stack gap="lg">
            <Group justify="space-between" align="center">
              <Group gap="sm">
                <IconHash size={18} color="var(--mantine-color-violet-6)" />
                <Text size="md" c="dimmed">Phase</Text>
              </Group>
              <Badge variant="light" color="violet" size="lg">
                Phase {task.phase_order}: {task.phase_name}
              </Badge>
            </Group>
            <Group justify="space-between" align="center">
              <Group gap="sm">
                <IconStairs size={18} color="var(--mantine-color-indigo-6)" />
                <Text size="md" c="dimmed">Step</Text>
              </Group>
              <Badge variant="light" color="indigo" size="lg">
                Step {task.step_order}: {task.step_name}
              </Badge>
            </Group>
            {task.estimated_days && (
              <Group justify="space-between" align="center">
                <Group gap="sm">
                  <IconClock size={18} color="var(--mantine-color-orange-6)" />
                  <Text size="md" c="dimmed">Estimated Days</Text>
                </Group>
                <Text size="md" fw={500}>{task.estimated_days}d</Text>
              </Group>
            )}
            <Group justify="space-between" align="center">
              <Group gap="sm">
                <IconHourglass size={18} color="var(--mantine-color-teal-6)" />
                <Text size="md" c="dimmed">Actual Days</Text>
              </Group>
              <Text size="md" fw={500}>{task.actual_days}d</Text>
            </Group>
            {task.deadline && (
              <Group justify="space-between" align="center">
                <Group gap="sm">
                  <IconCalendar size={18} color="var(--mantine-color-red-6)" />
                  <Text size="md" c="dimmed">Deadline</Text>
                </Group>
                <Text size="md" fw={500}>{new Date(task.deadline).toLocaleDateString()}</Text>
              </Group>
            )}
            {task.started_at && (
              <Group justify="space-between" align="center">
                <Group gap="sm">
                  <IconPlayerPlay size={18} color="var(--mantine-color-green-6)" />
                  <Text size="md" c="dimmed">Started</Text>
                </Group>
                <Text size="md" fw={500}>{new Date(task.started_at).toLocaleDateString()}</Text>
              </Group>
            )}
            {task.completed_at && (
              <Group justify="space-between" align="center">
                <Group gap="sm">
                  <IconCheck size={18} color="var(--mantine-color-green-6)" />
                  <Text size="md" c="dimmed">Completed</Text>
                </Group>
                <Text size="md" fw={500}>{new Date(task.completed_at).toLocaleDateString()}</Text>
              </Group>
            )}
          </Stack>
        </Card>

        {/* Checklist */}
        {task.checklist_items && task.checklist_items.length > 0 && (
          <Card withBorder p="xl" radius="md">
            <Group justify="space-between" mb="lg">
              <Group gap="sm">
                <IconListCheck size={20} color="var(--mantine-color-green-6)" />
                <Text fw={600} size="lg">Checklist</Text>
              </Group>
              <Badge variant="light" color="green" size="lg">
                {completedChecklistItems}/{totalChecklistItems} completed
              </Badge>
            </Group>
            
            <Progress value={checklistProgress} mb="lg" size="md" color="green" />
            
            <Stack gap="md">
              {task.checklist_items
                .sort((a, b) => a.order - b.order)
                .map((item) => (
                  <Checkbox
                    key={item.id}
                    label={item.text}
                    checked={item.completed || false}
                    onChange={(event) => handleChecklistToggle(item.id, event.currentTarget.checked)}
                    size="md"
                  />
                ))}
            </Stack>
          </Card>
        )}

        {/* Assigned Crew */}
        <Card withBorder p="xl" radius="md">
          <Group justify="space-between" mb="lg">
            <Group gap="sm">
              <IconUsers size={20} color="var(--mantine-color-blue-6)" />
              <Text fw={600} size="lg">Assigned People</Text>
            </Group>
            <Button
              size="sm"
              variant="light"
              leftSection={<IconPlus size={16} />}
              onClick={() => setAssignCrewModalOpened(true)}
            >
              Assign
            </Button>
          </Group>
          
          {task?.assigned_crew && task.assigned_crew.length > 0 ? (
            <Stack gap="md">
                  {task.assigned_crew.map((crew) => (
                <Group key={crew.crew_id} justify="space-between" p="md" bg="gray.0" style={{ borderRadius: 8 }}>
                  <Group gap="md">
                    <Avatar size="md" radius="xl">
                      <IconUser size={20} />
                    </Avatar>
                    <div>
                      <Text size="md" fw={500}>{crew.crew_name}</Text>
                      <Text size="sm" c="dimmed">{crew.crew_email}</Text>
                      <Badge size="sm" variant="outline" mt="xs">
                        {crew.role_name} - {crew.department_name}
                      </Badge>
                    </div>
                  </Group>
                  <ActionIcon
                    size="md"
                    variant="subtle"
                    color="red"
                    onClick={() => handleRemoveCrew(crew.crew_id)}
                    loading={removingCrew}
                    disabled={task?.assigned_crew.length === 1}
                    title={task?.assigned_crew.length === 1 ? "Cannot remove the last assigned person" : "Remove from task"}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              ))}
            </Stack>
          ) : (
            <Text size="md" c="dimmed" ta="center" py="xl">
              No one assigned to this task
            </Text>
          )}
        </Card>

        {/* File Attachments */}
        <Card withBorder p="xl" radius="md">
          <Group gap="sm" mb="lg">
            <IconPaperclip size={20} color="var(--mantine-color-orange-6)" />
            <Text fw={600} size="lg">File Attachments</Text>
          </Group>
          
          {/* Upload Section */}
          <Stack gap="md" mb="lg">
            <FileInput
              placeholder="Select files to upload"
              multiple
              value={files}
              onChange={setFiles}
              leftSection={<IconFileUpload size={18} />}
              size="md"
            />
            {files.length > 0 && (
              <Button
                size="md"
                onClick={handleFileUpload}
                loading={uploadingFiles}
                leftSection={<IconFileUpload size={18} />}
              >
                Upload {files.length} file{files.length > 1 ? 's' : ''}
              </Button>
            )}
          </Stack>

          {/* Existing Attachments */}
          {task.file_attachments && task.file_attachments.length > 0 ? (
            <Stack gap="md">
              {task.file_attachments.map((file) => (
                <Group key={file.id} justify="space-between" p="md" bg="gray.0" style={{ borderRadius: 8 }}>
                  <Group gap="md">
                    <IconFile size={20} color="var(--mantine-color-blue-6)" />
                    <div>
                      <Text size="md" fw={500}>{file.file_name}</Text>
                      <Text size="sm" c="dimmed">
                        {(file.file_size / 1024 / 1024).toFixed(2)} MB • {file.file_type?.toUpperCase()}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {new Date(file.uploaded_at).toLocaleString()}
                      </Text>
                    </div>
                  </Group>
                  <Group gap="sm">
                    <ActionIcon 
                      size="md" 
                      variant="subtle" 
                      color="blue"
                      onClick={() => handleDownloadFile(file.file_url, file.file_name)}
                      title="Download file"
                    >
                      <IconDownload size={16} />
                    </ActionIcon>
                    <ActionIcon 
                      size="md" 
                      variant="subtle" 
                      color="red"
                      onClick={() => {
                        setFileToDelete({ id: file.id, file_url: file.file_url, file_name: file.file_name });
                        setDeleteConfirmOpened(true);
                      }}
                      loading={deletingFile}
                      title="Delete file"
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Group>
              ))}
            </Stack>
          ) : (
            <Text size="md" c="dimmed" ta="center" py="xl">
              No files attached
            </Text>
          )}
        </Card>

        {/* Comments */}
        <Card withBorder p="xl" radius="md">
          <Group gap="sm" mb="lg">
            <IconMessage size={20} color="var(--mantine-color-grape-6)" />
            <Text fw={600} size="lg">Comments</Text>
          </Group>
          
          {/* Add Comment */}
          <Stack gap="md" mb="lg">
            <Textarea
              placeholder="Add a comment..."
              value={comment}
              onChange={(event) => setComment(event.currentTarget.value)}
              minRows={3}
              size="md"
              leftSection={<IconMessage size={18} />}
            />
            <Button
              size="md"
              onClick={handleAddComment}
              loading={submittingComment}
              disabled={!comment.trim()}
              leftSection={<IconSend size={18} />}
            >
              Add Comment
            </Button>
          </Stack>

          {/* Comments Timeline */}
          {task.comments && task.comments.length > 0 ? (
            <Timeline active={task.comments.length - 1} bulletSize={24} lineWidth={2}>
              {task.comments.map((comment) => (
                <Timeline.Item
                  key={comment.id}
                  bullet={<IconUser size={16} />}
                  title={
                    <Text fw={500} size="md">{comment.author}</Text>
                  }
                >
                  <Text size="md" mb="sm">
                    {comment.text}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {new Date(comment.created_at).toLocaleString()}
                  </Text>
                </Timeline.Item>
              ))}
            </Timeline>
          ) : (
            <Text size="md" c="dimmed" ta="center" py="xl">
              No comments yet
            </Text>
          )}
        </Card>

        {/* Escalation Info */}
        {task.escalation_reason && (
          <Alert color="red" icon={<IconAlertTriangle size={20} />} p="xl" radius="md">
            <Text fw={600} mb="md" size="lg">Escalation Reason</Text>
            <Text size="md" mb="md">{task.escalation_reason}</Text>
            {task.escalated_at && (
              <Text size="sm" c="dimmed">
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
        title="Assign Crew to Task"
        size="lg"
      >
        <Stack gap="md">
          <TextInput
            placeholder="Search crew members..."
            value={crewSearchTerm}
            onChange={(e) => setCrewSearchTerm(e.target.value)}
            leftSection={<IconSearch size={16} />}
          />
          
          {crewLoading ? (
            <Center h={200}>
              <Loader size="sm" />
            </Center>
          ) : unassignedCrew.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl">
              {crewSearchTerm ? 'No crew members found matching your search' : 'All available crew members are already assigned'}
            </Text>
          ) : (
            <SimpleGrid cols={1} spacing="xs" mah={400} style={{ overflowY: 'auto' }}>
              {unassignedCrew.map((crew) => (
                <Card
                  key={crew.id}
                  withBorder
                  p="sm"
                  style={{
                    cursor: 'pointer',
                    backgroundColor: selectedCrewId === crew.id ? 'var(--mantine-color-blue-0)' : undefined,
                  }}
                  onClick={() => setSelectedCrewId(crew.id)}
                >
                  <Group gap="sm">
                    <Avatar
                      src={crew.photo_url}
                      size="sm"
                      radius="xl"
                    >
                      <IconUser size={16} />
                    </Avatar>
                    <div style={{ flex: 1 }}>
                      <Text size="sm" fw={500}>{crew.name}</Text>
                      <Text size="xs" c="dimmed">{crew.email}</Text>
                    </div>
                    {selectedCrewId === crew.id && (
                      <IconCheck size={16} color="var(--mantine-color-blue-6)" />
                    )}
                  </Group>
                </Card>
              ))}
            </SimpleGrid>
          )}
          
          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => {
                setAssignCrewModalOpened(false);
                setCrewSearchTerm('');
                setSelectedCrewId('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignCrew}
              disabled={!selectedCrewId}
              loading={assigningCrew}
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
        title="Delete File"
        size="md"
      >
        <Stack gap="md">
          <Text>
            Are you sure you want to delete "{fileToDelete?.file_name}"? This action cannot be undone.
          </Text>
          
          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => {
                setDeleteConfirmOpened(false);
                setFileToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              color="red"
              onClick={handleDeleteFile}
              loading={deletingFile}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Drawer>
  );
}
