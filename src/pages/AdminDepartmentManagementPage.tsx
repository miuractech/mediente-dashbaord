/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import {
  Title,
  Button,
  Group,
  Tabs,
  Paper,
  Text,
  TextInput,
  ActionIcon,
  Stack,
  Badge,
  Pagination,
  Loader,
  Center,
  Alert,
} from '@mantine/core';
import { IconPlus, IconEdit, IconArchive, IconArchiveOff, IconSearch } from '@tabler/icons-react';
import { useState, useEffect, useCallback } from 'react';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useDebouncedValue } from '@mantine/hooks';
import supabase from '../supabase';
import type { Department } from '../department/department.type';
import { AdminDepartmentFormModal } from '../department/AdminDepartmentFormModal';

const ITEMS_PER_PAGE = 10;

export function AdminDepartmentManagementPage() {
  const [opened, { open, close }] = useDisclosure(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>('active');
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch] = useDebouncedValue(searchQuery, 300);
  const [activePage, setActivePage] = useState(1);
  const [archivedPage, setArchivedPage] = useState(1);
  const [totalActivePages, setTotalActivePages] = useState(0);
  const [totalArchivedPages, setTotalArchivedPages] = useState(0);

  const fetchDepartments = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch active departments with pagination
      const activeQuery = supabase
        .from('departments')
        .select('*', { count: 'exact' })
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .range((activePage - 1) * ITEMS_PER_PAGE, activePage * ITEMS_PER_PAGE - 1);

      if (debouncedSearch) {
        activeQuery.ilike('department_name', `%${debouncedSearch}%`);
      }

      const { data: activeData, count: activeCount, error: activeError } = await activeQuery;

      if (activeError) throw activeError;

      // Fetch archived departments with pagination
      const archivedQuery = supabase
        .from('departments')
        .select('*', { count: 'exact' })
        .eq('is_archived', true)
        .order('created_at', { ascending: false })
        .range((archivedPage - 1) * ITEMS_PER_PAGE, archivedPage * ITEMS_PER_PAGE - 1);

      if (debouncedSearch) {
        archivedQuery.ilike('department_name', `%${debouncedSearch}%`);
      }

      const { data: archivedData, count: archivedCount, error: archivedError } = await archivedQuery;

      if (archivedError) throw archivedError;

      // Combine data for display
      const allDepartments = [...(activeData || []), ...(archivedData || [])];
      setDepartments(allDepartments);
      
      setTotalActivePages(Math.ceil((activeCount || 0) / ITEMS_PER_PAGE));
      setTotalArchivedPages(Math.ceil((archivedCount || 0) / ITEMS_PER_PAGE));
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to fetch departments',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, [activePage, archivedPage, debouncedSearch]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleAddDepartment = () => {
    setEditingDepartment(null);
    open();
  };

  const handleEditDepartment = (department: Department) => {
    setEditingDepartment(department);
    open();
  };

  const handleToggleArchive = async (department: Department) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.email) {
        notifications.show({
          title: 'Error',
          message: 'User not authenticated',
          color: 'red',
        });
        return;
      }

      const { error } = await supabase
        .from('departments')
        .update({
          is_archived: !department.is_archived,
          updated_by: user.email,
        })
        .eq('department_id', department.department_id);

      if (error) throw error;

      notifications.show({
        title: 'Success',
        message: `Department ${department.is_archived ? 'unarchived' : 'archived'} successfully`,
        color: 'green',
      });

      fetchDepartments();
      // @ts-ignore
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to update department',
        color: 'red',
      });
    }
  };

  const handleFormSuccess = () => {
    fetchDepartments();
  };

  const handleTabChange = (value: string | null) => {
    setActiveTab(value);
    // Reset pagination when switching tabs
    if (value === 'active') {
      setActivePage(1);
    } else {
      setArchivedPage(1);
    }
  };

  const activeDepartments = departments.filter(dept => !dept.is_archived);
  const archivedDepartments = departments.filter(dept => dept.is_archived);

  const renderDepartmentCard = (department: Department) => (
    <Paper key={department.department_id} shadow="sm" p="lg" radius="md" withBorder>
      <Group justify="space-between" mb="xs">
        <Text fw={500} size="lg">
          {department.department_name}
        </Text>
        <Badge color={department.is_archived ? 'red' : 'green'} variant="light">
          {department.is_archived ? 'Archived' : 'Active'}
        </Badge>
      </Group>

      {department.description && (
        <Text size="sm" c="dimmed" mb="md">
          {department.description}
        </Text>
      )}

      <Group justify="space-between" mt="md">
        <div>
          <Text size="xs" c="dimmed">
            Created by: {department.created_by}
          </Text>
          <Text size="xs" c="dimmed">
            Created: {new Date(department.created_at).toLocaleDateString()}
          </Text>
        </div>

        <Group gap="xs">
          <ActionIcon
            variant="light"
            color="blue"
            onClick={() => handleEditDepartment(department)}
          >
            <IconEdit size={16} />
          </ActionIcon>
          <ActionIcon
            variant="light"
            color={department.is_archived ? 'green' : 'orange'}
            onClick={() => handleToggleArchive(department)}
          >
            {department.is_archived ? <IconArchiveOff size={16} /> : <IconArchive size={16} />}
          </ActionIcon>
        </Group>
      </Group>
    </Paper>
  );

  if (loading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <div>
      <Group justify="space-between" mb="lg">
        <Title order={2}>Admin Department Management</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={handleAddDepartment}>
          Add Department
        </Button>
      </Group>

      <TextInput
        placeholder="Search departments..."
        leftSection={<IconSearch size={16} />}
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.currentTarget.value)}
        mb="lg"
      />

      <Tabs value={activeTab} onChange={handleTabChange}>
        <Tabs.List>
          <Tabs.Tab value="active">
            Active Departments ({activeDepartments.length})
          </Tabs.Tab>
          <Tabs.Tab value="archived">
            Archived Departments ({archivedDepartments.length})
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="active" pt="md">
          {activeDepartments.length === 0 ? (
            <Alert>
              {debouncedSearch 
                ? 'No active departments found matching your search.'
                : 'No active departments found. Add a new department to get started.'
              }
            </Alert>
          ) : (
            <Stack gap="md">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">

              {activeDepartments.map(renderDepartmentCard)}
                </div>
              {totalActivePages > 1 && (
                <Center mt="md">
                  <Pagination
                    value={activePage}
                    onChange={setActivePage}
                    total={totalActivePages}
                  />
                </Center>
              )}
            </Stack>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="archived" pt="md">
          {archivedDepartments.length === 0 ? (
            <Alert>
              {debouncedSearch 
                ? 'No archived departments found matching your search.'
                : 'No archived departments found.'
              }
            </Alert>
          ) : (
            <Stack gap="md">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {archivedDepartments.map(renderDepartmentCard)}
              </div>
              {totalArchivedPages > 1 && (
                <Center mt="md">
                  <Pagination
                    value={archivedPage}
                    onChange={setArchivedPage}
                    total={totalArchivedPages}
                  />
                </Center>
              )}
            </Stack>
          )}
        </Tabs.Panel>
      </Tabs>

      <AdminDepartmentFormModal
        opened={opened}
        onClose={close}
        department={editingDepartment}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}

export default AdminDepartmentManagementPage