import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Title,
  Button,
  Table,
  Group,
  ActionIcon,
  Text,
  Card,
  Stack,
  Breadcrumbs,
  Anchor,
  Loader,
  Center,
  Tabs,
  Pagination,
  Menu
} from '@mantine/core';
import { 
  IconPlus, 
  IconEdit, 
  IconTrash, 
  IconEye,
  IconHome,
  IconCopy,
  IconDots
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import type { 
  ProjectTemplate, 
  TemplatePhase, 
  PhaseStep, 
  StepTask,
  TemplateRole,
  TemplateRoleUsage
} from '../template/template.type';
import { 
  projectTemplateService, 
  templatePhaseService, 
  phaseStepService, 
  stepTaskService,
  templateRoleUsageService
} from '../template/projectTemplateService';
import { templateRoleService } from '../template/projectTemplateService';
import TemplateFormModal from '../template/TemplateFormModal';
import PhaseFormModal from '../template/PhaseFormModal';
import StepFormModal from '../template/StepFormModal';
import TaskFormModal from '../template/TaskFormModal';  
import GenericConfirmationDialog from '../components/GenericConfirmationDialog';
import DuplicateTemplateModal from '../template/DuplicateTemplateModal';
import { CopyTasksModal } from '../template/CopyTasksModal';
import { CopyStepModal } from '../template/CopyStepModal';
import { DraggablePhasesList, DraggableStepsList, DraggableTasksList } from '../template/DraggableTemplateList';

interface PathSegment {
  type: 'template' | 'phase' | 'step';
  id: string;
  name: string;
}

export default function TemplatesPage() {
  const { templateId, phaseId, stepId } = useParams<{
    templateId?: string;
    phaseId?: string;
    stepId?: string;
  }>();
  const navigate = useNavigate();
  
  // Path represents the current navigation: [] = templates, [template] = phases, [template, phase] = steps, [template, phase, step] = tasks
  const [path, setPath] = useState<PathSegment[]>([]);
  
  // Data states
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [phases, setPhases] = useState<TemplatePhase[]>([]);
  const [steps, setSteps] = useState<PhaseStep[]>([]);
  const [tasks, setTasks] = useState<StepTask[]>([]);
  const [roles, setRoles] = useState<TemplateRole[]>([]);
  const [templateRoles, setTemplateRoles] = useState<TemplateRoleUsage[]>([]);
  
  // Pagination states for roles
  const [rolesPage, setRolesPage] = useState(1);
  const rolesPerPage = 10;
  
  // Loading states
  const [loading, setLoading] = useState(false);
  
  // Modal states
  const [templateModalOpened, { open: openTemplateModal, close: closeTemplateModal }] = useDisclosure(false);
  const [phaseModalOpened, { open: openPhaseModal, close: closePhaseModal }] = useDisclosure(false);
  const [stepModalOpened, { open: openStepModal, close: closeStepModal }] = useDisclosure(false);
  const [taskModalOpened, { open: openTaskModal, close: closeTaskModal }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [duplicateModalOpened, { open: openDuplicateModal, close: closeDuplicateModal }] = useDisclosure(false);
  const [copyTasksModalOpened, { open: openCopyTasksModal, close: closeCopyTasksModal }] = useDisclosure(false);
  const [copyStepModalOpened, { open: openCopyStepModal, close: closeCopyStepModal }] = useDisclosure(false);
  
  // Edit states
  const [editingTemplate, setEditingTemplate] = useState<ProjectTemplate | undefined>();
  const [editingPhase, setEditingPhase] = useState<TemplatePhase | undefined>();
  const [editingStep, setEditingStep] = useState<PhaseStep | undefined>();
  const [editingTask, setEditingTask] = useState<StepTask | undefined>();
  const [parentTaskId, setParentTaskId] = useState<string | undefined>();
  const [itemToDelete, setItemToDelete] = useState<{ type: 'templates' | 'phases' | 'steps' | 'tasks'; id: string; name: string } | null>(null);
  const [templateToDuplicate, setTemplateToDuplicate] = useState<ProjectTemplate | null>(null);
  const [stepToCopy, setStepToCopy] = useState<PhaseStep | null>(null);
  const [tasksToCopy, setTasksToCopy] = useState<{ stepId: string; stepName: string } | null>(null);

  // Initialize path from URL parameters
  const initializePathFromUrl = useCallback(async () => {
    const newPath: PathSegment[] = [];
    
    if (templateId) {
      try {
        const template = await projectTemplateService.getById(templateId);
        if (template) {
          newPath.push({ type: 'template', id: template.template_id, name: template.template_name });
        }
      } catch (error) {
        console.error('Error loading template:', error);
        navigate('/admin/templates');
        return;
      }
    }
    
    if (phaseId && newPath.length === 1) {
      try {
        const phase = await templatePhaseService.getById(phaseId);
        if (phase) {
          newPath.push({ type: 'phase', id: phase.phase_id, name: phase.phase_name });
        }
      } catch (error) {
        console.error('Error loading phase:', error);
        navigate(`/admin/templates/${templateId}`);
        return;
      }
    }
    
    if (stepId && newPath.length === 2) {
      try {
        const step = await phaseStepService.getById(stepId);
        if (step) {
          newPath.push({ type: 'step', id: step.step_id, name: step.step_name });
        }
      } catch (error) {
        console.error('Error loading step:', error);
        navigate(`/admin/templates/${templateId}/${phaseId}`);
        return;
      }
    }
    
    setPath(newPath);
  }, [templateId, phaseId, stepId, navigate]);

  // Initialize path on mount or URL change
  useEffect(() => {
    initializePathFromUrl();
  }, [initializePathFromUrl]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load roles if not already loaded
      if (roles.length === 0) {
        try {
          const rolesData = await templateRoleService.getRolesForTemplates();
          setRoles(rolesData);
        } catch (error) {
          console.error('Error loading roles:', error);
        }
      }

      // Determine current view based on path length
      if (path.length === 0) {
        // Templates view
        const templatesData = await projectTemplateService.getAll();
        setTemplates(templatesData);
      } else if (path.length === 1) {
        // Phases view
        const templateId = path[0].id;
        const [phasesData, templateRolesData] = await Promise.all([
          templatePhaseService.getByTemplateId(templateId),
          templateRoleUsageService.getTemplateRoles(templateId)
        ]);
        setPhases(phasesData);
        setTemplateRoles(templateRolesData);
        setRolesPage(1); // Reset pagination when switching templates
      } else if (path.length === 2) {
        // Steps view
        const phaseId = path[1].id;
        const stepsData = await phaseStepService.getByPhaseId(phaseId);
        setSteps(stepsData);
      } else if (path.length === 3) {
        // Tasks view
        const stepId = path[2].id;
        const tasksData = await stepTaskService.getByStepId(stepId);
        setTasks(tasksData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load data',
        color: 'red'
      });
    } finally {
      setLoading(false);
    }
  }, [path, roles.length]);

  // Load data based on current view level
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Navigation functions that update URL
  const navigateToPhases = (template: ProjectTemplate) => {
    navigate(`/admin/templates/${template.template_id}`);
  };

  const navigateToSteps = (phase: TemplatePhase) => {
    if (path.length === 1) {
      const templateId = path[0].id;
      navigate(`/admin/templates/${templateId}/${phase.phase_id}`);
    }
  };

  const navigateToTasks = (step: PhaseStep) => {
    if (path.length === 2) {
      const templateId = path[0].id;
      const phaseId = path[1].id;
      navigate(`/admin/templates/${templateId}/${phaseId}/${step.step_id}`);
    }
  };

  const navigateToBreadcrumb = (index: number) => {
    if (index === -1) {
      // Navigate to templates
      navigate('/admin/templates');
    } else {
      // Navigate to specific path level
      const targetPath = path.slice(0, index + 1);
      let url = '/admin/templates';
      
      targetPath.forEach((segment) => {
        url += `/${segment.id}`;
      });
      
      navigate(url);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEdit = (item: any) => {
    if (path.length === 0) {
      // Templates view
      setEditingTemplate(item as ProjectTemplate);
      openTemplateModal();
    } else if (path.length === 1) {
      // Phases view
      setEditingPhase(item as TemplatePhase);
      openPhaseModal();
    } else if (path.length === 2) {
      // Steps view
      setEditingStep(item as PhaseStep);
      openStepModal();
    } else if (path.length === 3) {
      // Tasks view
      setEditingTask(item as StepTask);
      openTaskModal();
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDelete = (item: any) => {
    let type: 'templates' | 'phases' | 'steps' | 'tasks', id: string, name: string;
    
    if (path.length === 0) {
      // Templates view
      type = 'templates';
      id = item.template_id;
      name = item.template_name;
    } else if (path.length === 1) {
      // Phases view
      type = 'phases';
      id = item.phase_id;
      name = item.phase_name;
    } else if (path.length === 2) {
      // Steps view
      type = 'steps';
      id = item.step_id;
      name = item.step_name;
    } else if (path.length === 3) {
      // Tasks view
      type = 'tasks';
      id = item.task_id;
      name = item.task_name;
    } else {
      return;
    }
    
    setItemToDelete({ type, id, name });
    openDeleteModal();
  };

  // Copy handlers
  const handleCopyStep = (step: PhaseStep) => {
    setStepToCopy(step);
    openCopyStepModal();
  };

  const handleCopyTasks = () => {
    if (path.length === 3) {
      const currentStep = path[2];
      setTasksToCopy({ 
        stepId: currentStep.id, 
        stepName: currentStep.name 
      });
      openCopyTasksModal();
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      switch (itemToDelete.type) {
        case 'templates':
          await projectTemplateService.delete(itemToDelete.id);
          break;
        case 'phases':
          await templatePhaseService.delete(itemToDelete.id);
          break;
        case 'steps':
          await phaseStepService.delete(itemToDelete.id);
          break;
        case 'tasks':
          await stepTaskService.delete(itemToDelete.id);
          break;
      }
      
      notifications.show({
        title: 'Success',
        message: `${itemToDelete.name} deleted successfully`,
        color: 'green'
      });
      
      loadData();
    } catch (error) {
      console.error('Error deleting item:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to delete item',
        color: 'red'
      });
    }
    
    closeDeleteModal();
    setItemToDelete(null);
  };

  // Helper function to get role name by ID
  const getRoleName = (roleId?: string) => {
    if (!roleId) return 'Unassigned';
    const role = roles.find(r => r.role_id === roleId);
    return role ? `${role.role_name}` : 'Unknown Role';
  };

  // Reorder handlers with optimistic updates
  const handleReorderPhases = async (reorderedPhases: TemplatePhase[]) => {
    if (path.length !== 1) return;
    
    const templateId = path[0].id;
    const originalPhases = [...phases]; // Store original order for rollback
    
    // Immediate UI update (optimistic)
    setPhases(reorderedPhases);
    
    try {
      const phaseOrders = reorderedPhases.map(phase => ({
        phase_id: phase.phase_id,
        phase_order: phase.phase_order
      }));

      await templatePhaseService.reorder(templateId, phaseOrders);
      
      // Success notification (optional, can be removed for less noise)
      notifications.show({
        title: 'Success',
        message: 'Phases reordered successfully',
        color: 'green',
        autoClose: 2000
      });
    } catch (error) {
      console.error('Error reordering phases:', error);
      
      // Rollback to original order on error
      setPhases(originalPhases);
      
      notifications.show({
        title: 'Error',
        message: 'Failed to reorder phases. Order has been restored.',
        color: 'red'
      });
    }
  };

  const handleReorderSteps = async (reorderedSteps: PhaseStep[]) => {
    if (path.length !== 2) return;
    
    const phaseId = path[1].id;
    const originalSteps = [...steps]; // Store original order for rollback
    
    // Immediate UI update (optimistic)
    setSteps(reorderedSteps);
    
    try {
      const stepOrders = reorderedSteps.map(step => ({
        step_id: step.step_id,
        step_order: step.step_order
      }));

      await phaseStepService.reorder(phaseId, stepOrders);
      
      // Success notification (optional, can be removed for less noise)
      notifications.show({
        title: 'Success',
        message: 'Steps reordered successfully',
        color: 'green',
        autoClose: 2000
      });
    } catch (error) {
      console.error('Error reordering steps:', error);
      
      // Rollback to original order on error
      setSteps(originalSteps);
      
      notifications.show({
        title: 'Error',
        message: 'Failed to reorder steps. Order has been restored.',
        color: 'red'
      });
    }
  };

  const handleReorderTasks = async (reorderedTasks: StepTask[]) => {
    if (path.length !== 3) return;
    
    const stepId = path[2].id;
    const originalTasks = [...tasks]; // Store original order for rollback
    
    // Immediate UI update (optimistic)
    setTasks(reorderedTasks);
    
    try {
      const taskOrders = reorderedTasks.map(task => ({
        task_id: task.task_id,
        task_order: task.task_order
      }));

      await stepTaskService.reorder(stepId, taskOrders);
      
      // Success notification (optional, can be removed for less noise)
      notifications.show({
        title: 'Success',
        message: 'Tasks reordered successfully',
        color: 'green',
        autoClose: 2000
      });
    } catch (error) {
      console.error('Error reordering tasks:', error);
      
      // Rollback to original order on error
      setTasks(originalTasks);
      
      notifications.show({
        title: 'Error',
        message: 'Failed to reorder tasks. Order has been restored.',
        color: 'red'
      });
    }
  };

  const handleModalClose = () => {
    setEditingTemplate(undefined);
    setEditingPhase(undefined);
    setEditingStep(undefined);
    setEditingTask(undefined);
    setParentTaskId(undefined);
    setTemplateToDuplicate(null);
    setStepToCopy(null);
    setTasksToCopy(null);
    closeTemplateModal();
    closePhaseModal();
    closeStepModal();
    closeTaskModal();
    closeDuplicateModal();
    closeCopyTasksModal();
    closeCopyStepModal();
  };

  const handleDuplicate = (template: ProjectTemplate) => {
    setTemplateToDuplicate(template);
    openDuplicateModal();
  };

  const handleCreateChildTask = (parentTaskId: string) => {
    setParentTaskId(parentTaskId);
    setEditingTask(undefined);
    openTaskModal();
  };

  const getCurrentParentId = () => {
    if (path.length === 1) {
      // Phases view - need template ID
      return path[0].id;
    } else if (path.length === 2) {
      // Steps view - need phase ID
      return path[1].id;
    } else if (path.length === 3) {
      // Tasks view - need step ID
      return path[2].id;
    }
    return '';
  };

  const renderBreadcrumbs = () => (
    <Breadcrumbs>
      <Anchor onClick={() => navigateToBreadcrumb(-1)}>
        <Group gap="xs">
          <IconHome size={16} />
          <Text>Templates</Text>
        </Group>
      </Anchor>
      {path.map((segment, index) => (
        <Anchor key={segment.id} onClick={() => navigateToBreadcrumb(index)}>
          {segment.name}
        </Anchor>
      ))}
    </Breadcrumbs>
  );

  const renderTemplates = () => (
    <Card>
      <Stack>
        <Group justify="space-between">
          <Title order={2}>Project Templates</Title>
          <Button leftSection={<IconPlus size={16} />} onClick={openTemplateModal}>
            Create Template
          </Button>
        </Group>
        
        {loading ? (
          <Center p="xl">
            <Loader />
          </Center>
        ) : templates.length === 0 ? (
          <Center p="xl">
            <Text c="dimmed">No templates found</Text>
          </Center>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Description</Table.Th>
                <Table.Th>Created</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {templates.map((template) => (
                <Table.Tr 
                  key={template.template_id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigateToPhases(template)}
                >
                  <Table.Td>
                    <Text fw={500}>{template.template_name}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed" lineClamp={2}>
                      {template.description || 'No description'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {new Date(template.created_at).toLocaleDateString()}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Menu shadow="md" width={200}>
                      <Menu.Target>
                        <ActionIcon 
                          variant="light"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <IconDots size={16} />
                        </ActionIcon>
                      </Menu.Target>

                      <Menu.Dropdown>
                        <Menu.Item 
                          leftSection={<IconEye size={14} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigateToPhases(template);
                          }}
                        >
                          View Phases
                        </Menu.Item>
                        <Menu.Item 
                          leftSection={<IconEdit size={14} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(template);
                          }}
                        >
                          Edit Template
                        </Menu.Item>
                        <Menu.Item 
                          leftSection={<IconCopy size={14} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicate(template);
                          }}
                        >
                          Duplicate Template
                        </Menu.Item>
                        <Menu.Divider />
                        <Menu.Item 
                          leftSection={<IconTrash size={14} />}
                          color="red"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(template);
                          }}
                        >
                          Delete Template
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    </Card>
  );

  const renderPhases = () => {
    // Calculate pagination for roles
    const startIndex = (rolesPage - 1) * rolesPerPage;
    const endIndex = startIndex + rolesPerPage;
    const paginatedRoles = templateRoles.slice(startIndex, endIndex);
    const totalPages = Math.ceil(templateRoles.length / rolesPerPage);

    return (
      <Card>
        <Tabs defaultValue="phases">
          <Tabs.List>
            <Tabs.Tab value="phases">Phases ({phases.length})</Tabs.Tab>
            <Tabs.Tab value="roles">Roles ({templateRoles.length})</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="phases" pt="md">
            <Stack>
              <Group justify="space-between">
                <Title order={3}>Template Phases</Title>
                <Button leftSection={<IconPlus size={16} />} onClick={openPhaseModal}>
                  Create Phase
                </Button>
              </Group>
              
              {loading ? (
                <Center p="xl">
                  <Loader />
                </Center>
              ) : phases.length === 0 ? (
                <Center p="xl">
                  <Text c="dimmed">No phases found</Text>
                </Center>
              ) : (
                <DraggablePhasesList
                  phases={phases}
                  onReorder={handleReorderPhases}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onView={(phase) => navigateToSteps(phase)}
                />
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="roles" pt="md">
            <Stack>
              <Title order={3}>Template Roles</Title>
              
              {loading ? (
                <Center p="xl">
                  <Loader />
                </Center>
              ) : templateRoles.length === 0 ? (
                <Center p="xl">
                  <Text c="dimmed">No roles assigned in this template</Text>
                </Center>
              ) : (
                <Stack>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Role Name</Table.Th>
                        <Table.Th>Department</Table.Th>
                        <Table.Th>Tasks Count</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {paginatedRoles.map((templateRole) => (
                        <Table.Tr key={templateRole.template_role_id}>
                          <Table.Td>
                            <Text fw={500}>{templateRole.role_name}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" c="dimmed">
                              {templateRole.department_name || 'Unknown'}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{templateRole.role_usage_count}</Text>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                  
                  {totalPages > 1 && (
                    <Group justify="center">
                      <Pagination
                        value={rolesPage}
                        onChange={setRolesPage}
                        total={totalPages}
                        size="sm"
                      />
                    </Group>
                  )}
                </Stack>
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Card>
    );
  };

  const renderSteps = () => (
    <Card>
      <Stack>
        <Group justify="space-between">
          <Title order={2}>Steps</Title>
          <Button leftSection={<IconPlus size={16} />} onClick={openStepModal}>
            Create Step
          </Button>
        </Group>
        
        {loading ? (
          <Center p="xl">
            <Loader />
          </Center>
        ) : steps.length === 0 ? (
          <Center p="xl">
            <Text c="dimmed">No steps found</Text>
          </Center>
        ) : (
          <DraggableStepsList
            steps={steps}
            onReorder={handleReorderSteps}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={(step) => navigateToTasks(step)}
            onCopy={handleCopyStep}
          />
        )}
      </Stack>
    </Card>
  );

  const renderTasks = () => (
    <Card>
      <Stack>
        <Group justify="space-between">
          <Title order={2}>Tasks</Title>
          <Button leftSection={<IconPlus size={16} />} onClick={openTaskModal}>
            Create Task
          </Button>
        </Group>
        
        {loading ? (
          <Center p="xl">
            <Loader />
          </Center>
        ) : tasks.length === 0 ? (
          <Center p="xl">
            <Text c="dimmed">No tasks found</Text>
          </Center>
        ) : (
          <DraggableTasksList
            tasks={tasks}
            onReorder={handleReorderTasks}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onCreateChild={handleCreateChildTask}
            onCopyTasks={handleCopyTasks}
            getRoleName={getRoleName}
            templateId={path.length > 0 ? path[0].id : ''}
          />
        )}
      </Stack>
    </Card>
  );

  return (
    <Container size="xl" p="md">
      <Stack>
        {path.length > 0 && renderBreadcrumbs()}
        
        {path.length === 0 && renderTemplates()}
        {path.length === 1 && renderPhases()}
        {path.length === 2 && renderSteps()}
        {path.length === 3 && renderTasks()}

        {/* Modals */}
        <TemplateFormModal
          opened={templateModalOpened}
          onClose={handleModalClose}
          template={editingTemplate}
          onSuccess={loadData}
        />

        <PhaseFormModal
          opened={phaseModalOpened}
          onClose={handleModalClose}
          templateId={getCurrentParentId()}
          phase={editingPhase}
          onSuccess={loadData}
        />

        <StepFormModal
          opened={stepModalOpened}
          onClose={handleModalClose}
          phaseId={getCurrentParentId()}
          step={editingStep}
          onSuccess={loadData}
        />

        <TaskFormModal
          opened={taskModalOpened}
          onClose={handleModalClose}
          stepId={getCurrentParentId()}
          templateId={path.length > 0 ? path[0].id : ''}
          task={editingTask}
          parentTaskId={parentTaskId}
          onSuccess={loadData}
        />

        <DuplicateTemplateModal
          opened={duplicateModalOpened}
          onClose={handleModalClose}
          template={templateToDuplicate}
          onSuccess={loadData}
        />

        <CopyTasksModal
          opened={copyTasksModalOpened}
          onClose={handleModalClose}
          sourceStepId={tasksToCopy?.stepId || ''}
          sourceStepName={tasksToCopy?.stepName || ''}
          templateId={path.length > 0 ? path[0].id : ''}
          onSuccess={loadData}
        />

        <CopyStepModal
          opened={copyStepModalOpened}
          onClose={handleModalClose}
          sourceStepId={stepToCopy?.step_id || ''}
          sourceStepName={stepToCopy?.step_name || ''}
          templateId={path.length > 0 ? path[0].id : ''}
          currentPhaseId={path.length > 1 ? path[1].id : ''}
          onSuccess={loadData}
        />

        <GenericConfirmationDialog
          opened={deleteModalOpened}
          onCancel={closeDeleteModal}
          onConfirm={confirmDelete}
          title="Delete Item"
          message={`Are you sure you want to delete "${itemToDelete?.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          confirmColor="red"
        />
      </Stack>
    </Container>
  );
}