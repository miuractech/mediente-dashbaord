import { useState, useEffect } from 'react';
import { useDebouncedValue } from '@mantine/hooks';
import { useParams, useNavigate } from 'react-router-dom';
import {
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
  Alert,
  Progress,
  Checkbox,
  TextInput,
  Avatar,
  Modal,
  SimpleGrid,
  Loader,
  Center,
  Breadcrumbs,
  Anchor,
  Container,
  NumberInput,
  Tooltip,
} from '@mantine/core';
import {
  IconArrowLeft,
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
  IconX,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import type { TaskStatusType } from '../projects/project.typs';
import { useUpdateTask, useTask, useUploadTaskFile, useAddTaskComment, useAvailableCrew, useProject, useAssignCrewToTask, useRemoveCrewFromTask } from '../projects/project.hook';

export default function TaskDetailPage() {
  const { projectId, taskId } = useParams<{ projectId: string; taskId: string }>();
  const navigate = useNavigate();
  
  const { project } = useProject(projectId || null);
  const { task, loading, refetch } = useTask(taskId || null);
  const { updateTask, loading: updating } = useUpdateTask();
  const { uploadMultipleFiles, loading: uploadingFiles } = useUploadTaskFile();
  const { addComment, loading: submittingComment } = useAddTaskComment();
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

  if (loading || !task) {
    return (
      <Container size="lg" p="md">
        <Center h="50vh">
          <Loader size="lg" />
        </Center>
      </Container>
    );
  }

  const handleStatusChange = async (newStatus: TaskStatusType) => {
    const success = await updateTask(task.project_task_id, { task_status: newStatus });
    if (success) {
      refetch();
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
    }
  };

  const handleRemoveCrew = async (crewId: string) => {
    if (!taskId) return;
    
    const success = await removeCrew(taskId, crewId);
    if (success) {
      refetch();
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
    }
  };

  const handleQuickStatusChange = async (newStatus: TaskStatusType) => {
    const success = await updateTask(task.project_task_id, { task_status: newStatus });
    if (success) {
      refetch();
    }
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

  const breadcrumbItems = [
    { title: 'Projects', href: '/admin/projects' },
    { title: project?.project_name || 'Project', href: `/admin/projects/${projectId}` },
    { title: task.task_name, href: null },
  ].map((item, index) => (
    item.href ? (
      <Anchor key={index} onClick={() => navigate(item.href)}>
        {item.title}
      </Anchor>
    ) : (
      <Text key={index}>{item.title}</Text>
    )
  ));

  return (
    <Container size="lg" p="md">
      <Stack gap="md">
        {/* Breadcrumbs */}
        <Breadcrumbs>{breadcrumbItems}</Breadcrumbs>

        {/* Header */}
        <Group justify="space-between">
          <div style={{ flex: 1 }}>
            {editMode ? (
              <Stack gap="sm">
                <TextInput
                  value={editData.task_name}
                  onChange={(e) => setEditData(prev => ({ ...prev, task_name: e.target.value }))}
                  size="lg"
                  fw={700}
                  variant="filled"
                />
                <Textarea
                  value={editData.task_description}
                  onChange={(e) => setEditData(prev => ({ ...prev, task_description: e.target.value }))}
                  placeholder="Task description..."
                  minRows={2}
                  variant="filled"
                />
                <NumberInput
                  label="Estimated Days"
                  value={editData.estimated_days}
                  onChange={(value: string | number) => setEditData(prev => ({ ...prev, estimated_days: Number(value) || 0 }))}
                  min={0}
                  step={0.5}
                  decimalScale={1}
                  size="sm"
                />
              </Stack>
            ) : (
              <>
                <Text size="xl" fw={700}>{task.task_name}</Text>
                <Group gap="xs" mt="xs">
                  <Badge color={getStatusColor(task.task_status)} variant="light">
                    {task.task_status}
                  </Badge>
                  {task.is_custom && (
                    <Badge variant="outline" color="blue">Custom</Badge>
                  )}
                  {task.category && (
                    <Badge variant="outline">{task.category}</Badge>
                  )}
                  {task.is_manually_escalated && (
                    <Badge color="red" variant="light">Escalated</Badge>
                  )}
                </Group>
              </>
            )}
          </div>
          
          <Group gap="xs">
            {/* Quick Status Actions */}
            {!editMode && (
              <>
                {task.task_status === 'pending' && (
                  <Tooltip label="Start Task">
                    <ActionIcon
                      variant="light"
                      size="lg"
                      color="blue"
                      onClick={() => handleQuickStatusChange('ongoing')}
                    >
                      <IconPlayerPlay size={18} />
                    </ActionIcon>
                  </Tooltip>
                )}
                
                {task.task_status === 'ongoing' && (
                  <>
                    <Tooltip label="Complete Task">
                      <ActionIcon
                        variant="light"
                        size="lg"
                        color="green"
                        onClick={() => handleQuickStatusChange('completed')}
                      >
                        <IconCheck size={18} />
                      </ActionIcon>
                    </Tooltip>
                  </>
                )}
                
                {task.task_status === 'completed' && (
                  <Tooltip label="Reopen Task">
                    <ActionIcon
                      variant="light"
                      size="lg"
                      color="blue"
                      onClick={() => handleQuickStatusChange('ongoing')}
                    >
                      <IconRestore size={18} />
                    </ActionIcon>
                  </Tooltip>
                )}
              </>
            )}

            {/* Edit Controls */}
            {editMode ? (
              <>
                <Button
                  variant="light"
                  color="red"
                  leftSection={<IconX size={16} />}
                  onClick={handleEditToggle}
                >
                  Cancel
                </Button>
                <Button
                  variant="filled"
                  color="green"
                  leftSection={<IconDeviceFloppy size={16} />}
                  onClick={handleSaveEdit}
                  loading={updating}
                >
                  Save Changes
                </Button>
              </>
            ) : (
              <Button
                variant="light"
                leftSection={<IconEdit size={16} />}
                onClick={handleEditToggle}
              >
                Edit Task
              </Button>
            )}
            
            <Button
              variant="subtle"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate(`/admin/projects/${projectId}`)}
            >
              Back to Project
            </Button>
          </Group>
        </Group>

        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
          {/* Left Column */}
          <Stack gap="md">
            {/* Task Details */}
            <Card withBorder p="md">
              <Text fw={500} mb="sm">Task Information</Text>
              
              {!editMode && task.task_description && (
                <Text size="sm" c="dimmed" mb="md">
                  {task.task_description}
                </Text>
              )}

              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Phase:</Text>
                  <Badge variant="outline">
                    Phase {task.phase_order}: {task.phase_name}
                  </Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Step:</Text>
                  <Badge variant="outline">
                    Step {task.step_order}: {task.step_name}
                  </Badge>
                </Group>
                {task.estimated_days && (
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Estimated Days:</Text>
                    <Text size="sm">{task.estimated_days}d</Text>
                  </Group>
                )}
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Actual Days:</Text>
                  <Text size="sm">{task.actual_days}d</Text>
                </Group>
                {task.deadline && (
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Deadline:</Text>
                    <Text size="sm">{new Date(task.deadline).toLocaleDateString()}</Text>
                  </Group>
                )}
                {task.started_at && (
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Started:</Text>
                    <Text size="sm">{new Date(task.started_at).toLocaleDateString()}</Text>
                  </Group>
                )}
                {task.completed_at && (
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Completed:</Text>
                    <Text size="sm">{new Date(task.completed_at).toLocaleDateString()}</Text>
                  </Group>
                )}
              </Stack>

              {/* Status Change Buttons - only show when not in edit mode */}
              {!editMode && (
                <Group gap="xs" mt="md">
                  {task.task_status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        variant="light"
                        leftSection={<IconPlayerPlay size={14} />}
                        onClick={() => handleStatusChange('ongoing')}
                        disabled={updating}
                      >
                        Start
                      </Button>
                      <Button
                        size="sm"
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
                        size="sm"
                        variant="light"
                        color="green"
                        leftSection={<IconCheck size={14} />}
                        onClick={() => handleStatusChange('completed')}
                        disabled={updating}
                      >
                        Complete
                      </Button>
                      <Button
                        size="sm"
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
                        size="sm"
                        variant="light"
                        leftSection={<IconPlayerPlay size={14} />}
                        onClick={() => handleStatusChange('ongoing')}
                        disabled={updating}
                      >
                        Resume
                      </Button>
                      <Button
                        size="sm"
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
                      size="sm"
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

            {/* Assigned Crew */}
            <Card withBorder p="md">
              <Group justify="space-between" mb="sm">
                <Text fw={500}>Assigned People</Text>
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<IconPlus size={14} />}
                  onClick={() => setAssignCrewModalOpened(true)}
                >
                  Assign
                </Button>
              </Group>
              
              {task?.assigned_crew && task.assigned_crew.length > 0 ? (
                <Stack gap="xs">
                  {task.assigned_crew.map((crew) => (
                    <Group key={crew.crew_id} justify="space-between" p="xs" bg="gray.0" style={{ borderRadius: 4 }}>
                      <Group gap="sm">
                        <Avatar size="sm" radius="xl">
                          <IconUser size={16} />
                        </Avatar>
                        <div>
                          <Text size="sm" fw={500}>{crew.crew_name}</Text>
                          <Text size="xs" c="dimmed">{crew.crew_email}</Text>
                          <Badge size="xs" variant="outline">
                            {crew.role_name} - {crew.department_name}
                          </Badge>
                        </div>
                      </Group>
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        color="red"
                        onClick={() => handleRemoveCrew(crew.crew_id)}
                        loading={removingCrew}
                        disabled={task?.assigned_crew.length === 1}
                        title={task?.assigned_crew.length === 1 ? "Cannot remove the last assigned person" : "Remove from task"}
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Group>
                  ))}
                </Stack>
              ) : (
                <Text size="sm" c="dimmed" ta="center" py="md">
                  No one assigned to this task
                </Text>
              )}
            </Card>

            {/* Checklist */}
            {task.checklist_items && task.checklist_items.length > 0 && (
              <Card withBorder p="md">
                <Group justify="space-between" mb="sm">
                  <Text fw={500}>Checklist</Text>
                  <Text size="sm" c="dimmed">
                    {completedChecklistItems}/{totalChecklistItems} completed
                  </Text>
                </Group>
                
                <Progress value={checklistProgress} mb="sm" />
                
                <Stack gap="xs">
                  {task.checklist_items
                    .sort((a, b) => a.order - b.order)
                    .map((item) => (
                      <Checkbox
                        key={item.id}
                        label={item.text}
                        checked={item.completed || false}
                        onChange={(event) => handleChecklistToggle(item.id, event.currentTarget.checked)}
                      />
                    ))}
                </Stack>
              </Card>
            )}
          </Stack>

          {/* Right Column */}
          <Stack gap="md">
            {/* File Attachments */}
            <Card withBorder p="md">
              <Text fw={500} mb="sm">File Attachments</Text>
              
              {/* Upload Section */}
              <Stack gap="sm" mb="md">
                <FileInput
                  placeholder="Select files to upload"
                  multiple
                  value={files}
                  onChange={setFiles}
                  leftSection={<IconFileUpload size={16} />}
                />
                {files.length > 0 && (
                  <Button
                    size="sm"
                    onClick={handleFileUpload}
                    loading={uploadingFiles}
                    leftSection={<IconFileUpload size={16} />}
                  >
                    Upload {files.length} file{files.length > 1 ? 's' : ''}
                  </Button>
                )}
              </Stack>

              {/* Existing Attachments */}
              {task.file_attachments && task.file_attachments.length > 0 ? (
                <Stack gap="xs">
                  {task.file_attachments.map((file, index) => (
                    <Group key={index} justify="space-between" p="xs" bg="gray.0" style={{ borderRadius: 4 }}>
                      <Group gap="xs">
                        <IconFile size={16} />
                        <div>
                          <Text size="sm">{file.file_name}</Text>
                          <Text size="xs" c="dimmed">
                            {(file.file_size / 1024 / 1024).toFixed(2)} MB
                          </Text>
                        </div>
                      </Group>
                      <Group gap="xs">
                        <ActionIcon size="sm" variant="subtle">
                          <IconDownload size={14} />
                        </ActionIcon>
                        <ActionIcon size="sm" variant="subtle" color="red">
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Group>
                    </Group>
                  ))}
                </Stack>
              ) : (
                <Text size="sm" c="dimmed" ta="center" py="md">
                  No files attached
                </Text>
              )}
            </Card>

            {/* Comments */}
            <Card withBorder p="md">
              <Text fw={500} mb="sm">Comments</Text>
              
              {/* Add Comment */}
              <Stack gap="sm" mb="md">
                <Textarea
                  placeholder="Add a comment..."
                  value={comment}
                  onChange={(event) => setComment(event.currentTarget.value)}
                  minRows={3}
                />
                <Button
                  size="sm"
                  onClick={handleAddComment}
                  loading={submittingComment}
                  disabled={!comment.trim()}
                  leftSection={<IconSend size={16} />}
                >
                  Add Comment
                </Button>
              </Stack>

              {/* Comments Timeline */}
              {task.comments && task.comments.length > 0 ? (
                <Timeline active={task.comments.length - 1}>
                  {task.comments.map((comment) => (
                    <Timeline.Item
                      key={comment.id}
                      bullet={<IconUser size={16} />}
                      title={comment.author}
                    >
                      <Text size="sm" mb="xs">
                        {comment.text}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {new Date(comment.created_at).toLocaleString()}
                      </Text>
                    </Timeline.Item>
                  ))}
                </Timeline>
              ) : (
                <Text size="sm" c="dimmed" ta="center" py="md">
                  No comments yet
                </Text>
              )}
            </Card>

            {/* Escalation Info */}
            {task.escalation_reason && (
              <Alert color="red" icon={<IconAlertTriangle size={16} />}>
                <Text fw={500} mb="xs">Escalation Reason</Text>
                <Text size="sm">{task.escalation_reason}</Text>
                {task.escalated_at && (
                  <Text size="xs" c="dimmed" mt="xs">
                    Escalated on {new Date(task.escalated_at).toLocaleString()}
                  </Text>
                )}
              </Alert>
            )}
          </Stack>
        </SimpleGrid>

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
      </Stack>
    </Container>
  );
}
