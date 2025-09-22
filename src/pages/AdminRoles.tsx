import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Button,
  Table,
  Group,
  ActionIcon,
  Text,
  Select,
  Paper,
  Stack,
  Badge,
  Tooltip,
  Menu,
  rem,
  Tabs,
  TextInput,
  Pagination
} from '@mantine/core';
import { 
  IconPlus, 
  IconEdit, 
  IconUsers, 
  IconDots,
  IconArchive,
  IconRestore,
  IconSearch
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useDisclosure, useDebouncedValue } from '@mantine/hooks';
import type { roleType } from '../roles/roles.type';
import type { Department } from '../department/department.type';
import { roleService } from '../roles/roleService';
import { DepartmentService } from '../department/departmentService';
import { RoleFormModal } from '../roles/RoleFormModal';
import GenericConfirmationDialog from '../components/GenericConfirmationDialog';
import { useAuth } from '../auth/useAuth';

export default function AdminRoles() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<roleType[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<roleType | undefined>();
  const [activeTab, setActiveTab] = useState<string>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch] = useDebouncedValue(searchQuery, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;
  
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [confirmDialogOpened, { open: openConfirmDialog, close: closeConfirmDialog }] = useDisclosure(false);
  const [roleToDelete, setRoleToDelete] = useState<roleType | null>(null);

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    loadRoles();
  }, [selectedDepartment, activeTab, debouncedSearch, currentPage]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [selectedDepartment, activeTab, debouncedSearch]);

  const loadDepartments = async () => {
    try {
      const response = await DepartmentService.getDepartments({ isArchived: false });
      setDepartments(response.data);
    } catch (error) {
      console.error('Error loading departments:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load departments',
        color: 'red'
      });
    }
  };

  const loadRoles = async () => {
    setLoading(true);
    try {
      const filters = {
        is_archived: activeTab === 'archived',
        department_id: selectedDepartment === 'all' ? undefined : selectedDepartment,
        search: debouncedSearch || undefined
      };

      const response = await roleService.getRoles(currentPage, pageSize, filters);
      setRoles(response.data);
      setTotalPages(response.totalPages);
      setTotalCount(response.count);
    } catch (error) {
      console.error('Error loading roles:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load roles',
        color: 'red'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = () => {
    setSelectedRole(undefined);
    openModal();
  };

  const handleEditRole = (role: roleType) => {
    setSelectedRole(role);
    openModal();
  };

  const handleDeleteRole = (role: roleType) => {
    setRoleToDelete(role);
    openConfirmDialog();
  };

  const handleRestoreRole = async (role: roleType) => {
    if (!user) return;

    try {
      await roleService.restoreRole(role.id, user.id);
      notifications.show({
        title: 'Success',
        message: 'Role restored successfully',
        color: 'green'
      });
      loadRoles();
    } catch (error) {
      console.error('Error restoring role:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to restore role',
        color: 'red'
      });
    }
  };

  const confirmDeleteRole = async () => {
    if (!roleToDelete || !user) return;

    try {
      await roleService.archiveRole(roleToDelete.id, user.id);
      notifications.show({
        title: 'Success',
        message: 'Role archived successfully',
        color: 'green'
      });
      loadRoles();
    } catch (error) {
      console.error('Error archiving role:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to archive role',
        color: 'red'
      });
    } finally {
      closeConfirmDialog();
      setRoleToDelete(null);
    }
  };

  const getRoleLevel = (role: roleType, allRoles: roleType[]): number => {
    let level = 0;
    let currentRole = role;
    
    while (currentRole.reports_to) {
      const parentRole = allRoles.find(r => r.id === currentRole.reports_to);
      if (!parentRole) break;
      currentRole = parentRole;
      level++;
    }
    
    return level;
  };

  const getSubordinateCount = (roleId: string): number => {
    return roles.filter(r => r.reports_to === roleId).length;
  };

  const getManagerName = (reportsTo?: string): string => {
    if (!reportsTo) return '-';
    const manager = roles.find(r => r.id === reportsTo);
    return manager ? manager.name : '-';
  };

  // For hierarchy display, we need to build the tree structure
  const buildRoleHierarchy = (rolesList: roleType[]) => {
    const roleMap = new Map<string, roleType>();
    rolesList.forEach(role => {
      roleMap.set(role.id, { ...role, manages: [] });
    });

    roleMap.forEach(role => {
      if (role.reports_to && roleMap.has(role.reports_to)) {
        const manager = roleMap.get(role.reports_to)!;
        if (!manager.manages) manager.manages = [];
        manager.manages.push(role.id);
      }
    });

    return Array.from(roleMap.values());
  };

  const hierarchicalRoles = buildRoleHierarchy(roles);
  
  const sortedRoles = [...hierarchicalRoles].sort((a, b) => {
    const levelA = getRoleLevel(a, hierarchicalRoles);
    const levelB = getRoleLevel(b, hierarchicalRoles);
    if (levelA !== levelB) return levelA - levelB;
    return a.name.localeCompare(b.name);
  });

  const selectedDepartmentName = selectedDepartment === 'all' 
    ? 'All Departments' 
    : departments.find(d => d.department_id === selectedDepartment)?.department_name || '';

  const departmentOptions = [
    { value: 'all', label: 'All Departments' },
    ...departments.map(dept => ({
      value: dept.department_id,
      label: dept.department_name
    }))
  ];

  return (
    <Container size="xl">
      <Stack>
        <Group justify="space-between" align="center">
          <Title order={2}>Department Roles</Title>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={handleCreateRole}
            // disabled={activeTab === 'archived'}
          >
            Add Role
          </Button>
        </Group>

        <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'active')}>
          <Tabs.List>
            <Tabs.Tab value="active">Active Roles</Tabs.Tab>
            <Tabs.Tab value="archived">Archived Roles</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="active" pt="md">
            <Paper p="md" withBorder>
              <Stack gap="md">
                <Group align="end" justify="space-between">
                  <Group align="end">
                    <Select
                      label="Department"
                      placeholder="Select department"
                      value={selectedDepartment}
                      onChange={(value) => setSelectedDepartment(value || 'all')}
                      data={departmentOptions}
                      style={{ minWidth: 200 }}
                    />
                    <TextInput
                      label="Search roles"
                      placeholder="Search by name or description..."
                      leftSection={<IconSearch size={16} />}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.currentTarget.value)}
                      style={{ minWidth: 300 }}
                    />
                  </Group>
                  <Badge variant="light" size="lg">
                    {totalCount} roles in {selectedDepartmentName}
                  </Badge>
                </Group>

              <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Role Name</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Reports To</Table.Th>
                  <Table.Th>
                    <Group gap={4}>
                      <IconUsers size={16} />
                      <Text size="sm">Manages</Text>
                    </Group>
                  </Table.Th>
                  <Table.Th>Level</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {loading ? (
                  <Table.Tr>
                    <Table.Td colSpan={6}>
                      <Text ta="center" c="dimmed">Loading roles...</Text>
                    </Table.Td>
                  </Table.Tr>
                ) : sortedRoles.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={6}>
                      <Text ta="center" c="dimmed">No roles found for this department</Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  sortedRoles.map((role) => {
                    const level = getRoleLevel(role, roles);
                    const subordinateCount = getSubordinateCount(role.id);
                    
                    return (
                      <Table.Tr key={role.id}>
                        <Table.Td>
                          <Group gap={4}>
                            {level > 0 && (
                              <Text c="dimmed" size="sm">
                                {'└─'.repeat(level)}
                              </Text>
                            )}
                            <Text fw={level === 0 ? 600 : 400}>{role.name}</Text>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed" lineClamp={2}>
                            {role.description || '-'}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{getManagerName(role.reports_to)}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge variant="light" size="sm">
                            {subordinateCount}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Badge 
                            variant="outline" 
                            color={level === 0 ? 'blue' : level === 1 ? 'green' : 'gray'}
                            size="sm"
                          >
                            L{level}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Group gap={4}>
                            <Tooltip label="Edit role">
                              <ActionIcon
                                variant="light"
                                color="blue"
                                size="sm"
                                onClick={() => handleEditRole(role)}
                              >
                                <IconEdit size={16} />
                              </ActionIcon>
                            </Tooltip>
                            
                            <Menu position="bottom-end">
                              <Menu.Target>
                                <ActionIcon variant="light" color="gray" size="sm">
                                  <IconDots size={16} />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                <Menu.Item
                                  leftSection={<IconArchive style={{ width: rem(14), height: rem(14) }} />}
                                  color="orange"
                                  onClick={() => handleDeleteRole(role)}
                                >
                                  Archive Role
                                </Menu.Item>
                              </Menu.Dropdown>
                            </Menu>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })
                )}
              </Table.Tbody>
            </Table>

            {totalPages > 1 && (
              <Group justify="center" mt="md">
                <Pagination
                  value={currentPage}
                  onChange={setCurrentPage}
                  total={totalPages}
                  size="sm"
                />
              </Group>
            )}
            </Stack>
            </Paper>
          </Tabs.Panel>

          <Tabs.Panel value="archived" pt="md">
            <Paper p="md" withBorder>
              <Stack gap="md">
                <Group align="end" justify="space-between">
                  <Group align="end">
                    <Select
                      label="Department"
                      placeholder="Select department"
                      value={selectedDepartment}
                      onChange={(value) => setSelectedDepartment(value || 'all')}
                      data={departmentOptions}
                      style={{ minWidth: 200 }}
                    />
                    <TextInput
                      label="Search archived roles"
                      placeholder="Search by name or description..."
                      leftSection={<IconSearch size={16} />}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.currentTarget.value)}
                      style={{ minWidth: 300 }}
                    />
                  </Group>
                  <Badge variant="light" size="lg" color="orange">
                    {totalCount} archived roles in {selectedDepartmentName}
                  </Badge>
                </Group>

              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Role Name</Table.Th>
                    <Table.Th>Description</Table.Th>
                    <Table.Th>Department</Table.Th>
                    <Table.Th>Archived Date</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {loading ? (
                    <Table.Tr>
                      <Table.Td colSpan={5}>
                        <Text ta="center" c="dimmed">Loading archived roles...</Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : sortedRoles.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={5}>
                        <Text ta="center" c="dimmed">No archived roles found</Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    sortedRoles.map((role) => {
                      const department = departments.find(d => d.department_id === role.department_id);
                      
                      return (
                        <Table.Tr key={role.id}>
                          <Table.Td>
                            <Text c="dimmed">{role.name}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" c="dimmed" lineClamp={2}>
                              {role.description || '-'}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{department?.department_name || '-'}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" c="dimmed">
                              {role.updated_at?.toLocaleDateString() || '-'}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Tooltip label="Restore role">
                              <ActionIcon
                                variant="light"
                                color="green"
                                size="sm"
                                onClick={() => handleRestoreRole(role)}
                              >
                                <IconRestore size={16} />
                              </ActionIcon>
                            </Tooltip>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })
                  )}
                </Table.Tbody>
              </Table>

              {totalPages > 1 && (
                <Group justify="center" mt="md">
                  <Pagination
                    value={currentPage}
                    onChange={setCurrentPage}
                    total={totalPages}
                    size="sm"
                  />
                </Group>
              )}
              </Stack>
            </Paper>
          </Tabs.Panel>
        </Tabs>
      </Stack>

      <RoleFormModal
        opened={modalOpened}
        onClose={closeModal}
        role={selectedRole}
        departments={departments}
        availableReports={roles}
        onSuccess={loadRoles}
      />

      <GenericConfirmationDialog
        opened={confirmDialogOpened}
        onCancel={closeConfirmDialog}
        onConfirm={confirmDeleteRole}
        title="Archive Role"
        message={`Are you sure you want to archive the role "${roleToDelete?.name}"? This action will hide the role from active use.`}
        confirmLabel="Archive"
        cancelLabel="Cancel"
        confirmColor="orange"
      />
    </Container>
  );
}
