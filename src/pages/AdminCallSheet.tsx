import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container,
  Title,
  Text,
  Group,
  Button,
  Stack,
  Paper,
  Badge,
  Tabs,
  Grid,
  Card,
  ActionIcon,
  Menu,
  Modal,
  Alert,
  Loader,
  Center,
  Pagination,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconPlus,
  IconFileText,
  IconEye,
  IconEdit,
  IconTrash,
  IconDownload,
  IconClipboardList,
  IconCalendar,
  IconClock,
  IconDots,
  IconAlertCircle,
  IconUsers,
} from '@tabler/icons-react';
import CallSheetForm from '../callsheet/CallSheetForm';
import type { CallSheetFormData } from '../callsheet/callsheet';
import { callSheetService } from '../callsheet/callSheetService';
import type { CallSheetCompleteDB } from '../callsheet/database/callsheet';

// Mock data for demonstration
const mockCallSheets = [
  {
    id: '1',
    project_name: 'Summer Dreams',
    date: '2024-12-20',
    time: '06:00',
    status: 'active',
    created_at: '2024-12-15',
    time_table: [
      { item: 'Breakfast', date: '06:00' },
      { item: 'Makeup & Hair', date: '07:00' },
      { item: 'First Shot', date: '09:00' }
    ],
    location: [
      { 
        location_title: 'Studio A', 
        link: 'https://maps.google.com/studio-a', 
        address: '123 Hollywood Blvd, Los Angeles, CA 90028', 
        contact_number: '+1 555 123 4567' 
      }
    ],
    schedule: [
      { time: '09:00', scene: 'Scene 1A - Interior Office', description: 'Main character arrives at office' },
      { time: '13:00', scene: 'Scene 2B - Exterior Building', description: 'Establishing shot of building' }
    ],
    description: 'Day 1 of principal photography',
    crew: []
  },
  {
    id: '2',
    project_name: 'City Lights',
    date: '2024-11-15',
    time: '08:00',
    status: 'expired',
    created_at: '2024-11-10',
    time_table: [
      { item: 'Equipment Setup', date: '08:00' },
      { item: 'Lighting Check', date: '09:30' }
    ],
    location: [
      { 
        location_title: 'Downtown Location', 
        link: 'https://maps.google.com/downtown', 
        address: '456 Main St, Downtown LA, CA 90014', 
        contact_number: '+1 555 987 6543' 
      }
    ],
    schedule: [
      { time: '10:00', scene: 'Scene 5A - Street Scene', description: 'Crowd walking sequence' }
    ],
    description: 'Night shooting sequence',
    crew: []
  },
  {
    id: '3',
    project_name: 'Ocean Waves',
    date: '2024-12-25',
    time: '05:30',
    status: 'upcoming',
    created_at: '2024-12-18',
    time_table: [
      { item: 'Early Call', date: '05:30' },
      { item: 'Transportation to Beach', date: '06:00' }
    ],
    location: [
      { 
        location_title: 'Malibu Beach', 
        link: 'https://maps.google.com/malibu-beach', 
        address: 'Malibu Beach, Malibu, CA 90265', 
        contact_number: '+1 555 456 7890' 
      }
    ],
    schedule: [
      { time: '07:00', scene: 'Scene 10A - Sunrise Shot', description: 'Beautiful sunrise over ocean' }
    ],
    description: 'Beach location shoot for climax scene',
    crew: []
  }
];

export default function AdminCallSheet() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<string | null>('recent');
  const [callSheets, setCallSheets] = useState<CallSheetCompleteDB[]>([]);
  const [editingCallSheet, setEditingCallSheet] = useState<CallSheetCompleteDB | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(12); // Items per page
  
  // Tab counts for badges
  const [recentCount, setRecentCount] = useState(0);
  const [expiredCount, setExpiredCount] = useState(0);
  const [countsLoading, setCountsLoading] = useState(false);
  
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Load tab counts for badges
  const loadTabCounts = useCallback(async () => {
    setCountsLoading(true);
    try {
      const [recentResponse, expiredResponse] = await Promise.all([
        callSheetService.getRecentCallSheets(1, 0), // Just get count
        callSheetService.getExpiredCallSheets(1, 0), // Just get count
      ]);
      
      
      setRecentCount(recentResponse.total);
      setExpiredCount(expiredResponse.total);
    } catch (error) {
      console.error('Error loading tab counts:', error);
      // Set fallback counts
      setRecentCount(0);
      setExpiredCount(0);
    } finally {
      setCountsLoading(false);
    }
  }, []);

  const loadCallSheets = useCallback(async (resetPagination = false) => {
    setDataLoading(true);
    try {
      let response;
      const offset = resetPagination ? 0 : (currentPage - 1) * pageSize;

      if (activeTab === 'recent') {
        response = await callSheetService.getRecentCallSheets(pageSize, offset);
      } else if (activeTab === 'expired') {
        response = await callSheetService.getExpiredCallSheets(pageSize, offset);
      } else {
        // Default case - shouldn't happen with current tab structure
        response = await callSheetService.getCallSheets({}, { 
          limit: pageSize, 
          offset,
          order_by: 'created_at',
          order_direction: 'desc'
        });
      }

      setCallSheets(response.data);
      setTotalPages(response.total_pages);
      setTotalCount(response.total);
      
      if (resetPagination) {
        setCurrentPage(1);
      }
    } catch (error) {
      console.error('Error loading call sheets:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load call sheets. Using demo data.',
        color: 'orange',
      });
      // Fallback to mock data if database fails (convert to proper format)
      const convertedMockData: CallSheetCompleteDB[] = mockCallSheets.map(sheet => ({
        id: sheet.id,
        project_name: sheet.project_name,
        date: sheet.date,
        time: sheet.time,
        description: sheet.description,
        status: sheet.status as 'draft' | 'active' | 'upcoming' | 'expired' | 'archived',
        created_at: sheet.created_at,
        updated_at: sheet.created_at,
        created_by: undefined,
        time_table: sheet.time_table.map((item, index) => ({
          id: `mock-tt-${index}`,
          call_sheet_id: sheet.id,
          item: item.item,
          time: item.date,
          sort_order: index + 1,
          created_at: sheet.created_at,
          updated_at: sheet.created_at,
        })),
        locations: sheet.location.map((loc, index) => ({
          id: `mock-loc-${index}`,
          call_sheet_id: sheet.id,
          location_title: loc.location_title,
          address: loc.address,
          link: loc.link,
          contact_number: loc.contact_number,
          sort_order: index + 1,
          created_at: sheet.created_at,
          updated_at: sheet.created_at,
        })),
        schedule: sheet.schedule.map((sch, index) => ({
          id: `mock-sch-${index}`,
          call_sheet_id: sheet.id,
          time: sch.time,
          scene: sch.scene,
          description: sch.description,
          sort_order: index + 1,
          created_at: sheet.created_at,
          updated_at: sheet.created_at,
        })),
        crew: sheet.crew || [],
      }));
      setCallSheets(convertedMockData);
      setTotalPages(1);
      setTotalCount(convertedMockData.length);
    } finally {
      setDataLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Remove all dependencies to prevent infinite loops - function is self-contained

  // Handle edit parameter from URL
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId) {
      // Find the call sheet to edit
      const callSheetToEdit = callSheets.find(cs => cs.id === editId);
      if (callSheetToEdit) {
        setEditingCallSheet(callSheetToEdit);
        setActiveTab('edit');
      }
    }
  }, [searchParams, callSheets]);

  // Initial load only - no dependencies to prevent infinite loops
  useEffect(() => {
    loadCallSheets();
    loadTabCounts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array for initial load only

  // Reload when activeTab changes
  useEffect(() => {
    loadCallSheets(true); // Reset pagination when tab changes
    loadTabCounts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]); // Only depend on activeTab

  // Reload when page changes (but not on initial load)
  useEffect(() => {
    if (currentPage > 1) {
      loadCallSheets();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]); // Only depend on currentPage

  const handleCreateCallSheet = async (data: CallSheetFormData) => {
    setFormLoading(true);
    try {
      // TODO: Get actual user ID from auth context
      const userId = undefined; // Replace with actual user ID when auth is implemented
      
      const response = await callSheetService.createCallSheet(data, userId);
      
      if (response.success) {
        // Reload the data to get the complete call sheet with relations
        await loadCallSheets(true);
        await loadTabCounts();
        setActiveTab('recent');
        
        notifications.show({
          title: 'Success',
          message: response.message || 'Call sheet created successfully!',
          color: 'green',
        });
      } else {
        throw new Error(response.message || 'Failed to create call sheet');
      }
    } catch (error) {
      console.error('Error creating call sheet:', error);
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to create call sheet. Please try again.',
        color: 'red',
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditCallSheet = (callSheet: CallSheetCompleteDB) => {
    setEditingCallSheet(callSheet);
    setActiveTab('edit');
  };

  const handleUpdateCallSheet = async (data: CallSheetFormData) => {
    setFormLoading(true);
    try {
      if (!editingCallSheet) {
        throw new Error('No call sheet selected for editing');
      }

      const response = await callSheetService.updateCallSheet(editingCallSheet.id, data);
      
      if (response.success) {
        // Reload the data to get the updated call sheet with relations
        await loadCallSheets();
        await loadTabCounts();
        setActiveTab('recent');
        setEditingCallSheet(null);
        // Clear URL parameters
        navigate('/admin/callsheet', { replace: true });
        
        notifications.show({
          title: 'Success',
          message: response.message || 'Call sheet updated successfully!',
          color: 'green',
        });
      } else {
        throw new Error(response.message || 'Failed to update call sheet');
      }
    } catch (error) {
      console.error('Error updating call sheet:', error);
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to update call sheet. Please try again.',
        color: 'red',
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handlePreviewCallSheet = (callSheet: CallSheetCompleteDB) => {
    navigate(`/admin/callsheet/${callSheet.id}`);
  };

  const handleDeleteCallSheet = async () => {
    if (!deleteTargetId) return;
    
    try {
      const response = await callSheetService.deleteCallSheet(deleteTargetId);
      
      if (response.success) {
        // Reload the data to reflect the deletion
        await loadCallSheets();
        await loadTabCounts();
        closeDeleteModal();
        setDeleteTargetId(null);
        
        notifications.show({
          title: 'Success',
          message: response.message || 'Call sheet deleted successfully!',
          color: 'green',
        });
      } else {
        throw new Error(response.message || 'Failed to delete call sheet');
      }
    } catch (error) {
      console.error('Error deleting call sheet:', error);
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to delete call sheet. Please try again.',
        color: 'red',
      });
    }
  };

  const openDeleteConfirmation = (id: string) => {
    setDeleteTargetId(id);
    openDeleteModal();
  };

  // Tab change handler
  const handleTabChange = (tab: string | null) => {
    setActiveTab(tab);
    setCurrentPage(1);
    // Load data for the new tab (counts will be refreshed by useEffect)
    setTimeout(() => loadCallSheets(true), 0);
  };

  // Page change handler
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Get real-time status for a call sheet
  const getRealTimeStatus = (sheet: CallSheetCompleteDB) => {
    return callSheetService.getCurrentStatus(sheet.date, sheet.time);
  };

  // Get status color based on real-time status
  const getRealTimeStatusColor = (sheet: CallSheetCompleteDB) => {
    const realTimeStatus = getRealTimeStatus(sheet);
    return getStatusColor(realTimeStatus);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'green';
      case 'active': return 'blue';
      case 'expired': return 'red';
      case 'draft': return 'orange';
      case 'archived': return 'gray';
      default: return 'blue';
    }
  };

  // Filtering is now handled by backend queries for better performance and accuracy

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        <Group justify="space-between" align="center">
          <div>
            <Title order={1} c="blue">
              <IconClipboardList size={32} style={{ marginRight: 8 }} />
              Call Sheet Management
            </Title>
            <Text c="dimmed" size="lg">
              Create and manage production call sheets
            </Text>
          </div>
          <Badge size="lg" color="blue" variant="light">
            {recentCount + expiredCount} Call Sheets
          </Badge>
          <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={() => setActiveTab('create')}
                >
                  Create Call Sheet
                </Button>
        </Group>

        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tabs.List>
            <Tabs.Tab value="recent" leftSection={<IconCalendar size={16} />}>
              Recent Call Sheets
              <Badge size="sm" color="green" ml="xs">
                {countsLoading ? '...' : recentCount}
              </Badge>
            </Tabs.Tab>
            <Tabs.Tab value="expired" leftSection={<IconClock size={16} />}>
              Expired Call Sheets
              <Badge size="sm" color="red" ml="xs">
                {countsLoading ? '...' : expiredCount}
              </Badge>
            </Tabs.Tab>
           
            
          </Tabs.List>

          <Tabs.Panel value="recent" pt="md">
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                Manage your upcoming and active call sheets
              </Text>

              {/* Summary for recent tab */}
              <Paper p="md" withBorder>
                <Group justify="space-between" align="center">
                  <Text size="sm" c="dimmed">
                    Upcoming & active call sheets
                  </Text>
                  <Text size="sm" c="dimmed">
                    Showing {callSheets.length} of {totalCount} upcoming/active call sheets
                  </Text>
                </Group>
              </Paper>

              {dataLoading ? (
                <Center p="xl">
                  <Stack align="center" gap="md">
                    <Loader size="lg" />
                    <Text c="dimmed">Loading call sheets...</Text>
                  </Stack>
                </Center>
              ) : callSheets.length === 0 ? (
                <Paper p="xl" ta="center">
                  <IconCalendar size={48} color="gray" />
                  <Title order={3} c="dimmed" mt="md">
                    No Recent Call Sheets
                  </Title>
                  <Text c="dimmed" mb="lg">
                    Create a new call sheet to get started
                  </Text>
                  <Button
                    leftSection={<IconPlus size={16} />}
                    onClick={() => setActiveTab('create')}
                  >
                    Create Call Sheet
                  </Button>
                </Paper>
              ) : (
                <>
                  <Grid>
                    {callSheets.map((callSheet) => (
                    <Grid.Col key={callSheet.id} span={{ base: 12, md: 6, lg: 4 }}>
                      <Card shadow="sm" p="lg" radius="md" withBorder>
                        <Group justify="space-between" mb="md">
                          <Badge color={getRealTimeStatusColor(callSheet)} variant="light">
                            {getRealTimeStatus(callSheet).toUpperCase()}
                          </Badge>
                          <Menu shadow="md" width={200}>
                            <Menu.Target>
                              <ActionIcon variant="light" size="sm">
                                <IconDots size={16} />
                              </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                              <Menu.Item 
                                leftSection={<IconEye size={14} />}
                                onClick={() => handlePreviewCallSheet(callSheet)}
                              >
                                Preview
                              </Menu.Item>
                              <Menu.Item 
                                leftSection={<IconEdit size={14} />}
                                onClick={() => handleEditCallSheet(callSheet)}
                              >
                                Edit
                              </Menu.Item>
                              <Menu.Item leftSection={<IconDownload size={14} />}>
                                Export PDF
                              </Menu.Item>
                              <Menu.Divider />
                              <Menu.Item 
                                leftSection={<IconTrash size={14} />}
                                color="red"
                                onClick={() => openDeleteConfirmation(callSheet.id)}
                              >
                                Delete
                              </Menu.Item>
                            </Menu.Dropdown>
                          </Menu>
                        </Group>

                        <Title order={4} mb="xs">
                          {callSheet.project_name}
                        </Title>

                        <Stack gap="xs" mb="md">
                          <Group gap="xs">
                            <IconCalendar size={14} color="gray" />
                            <Text size="sm" c="dimmed">
                              {new Date(callSheet.date).toLocaleDateString()}
                            </Text>
                          </Group>
                          <Group gap="xs">
                            <IconUsers size={14} color="gray" />
                            <Text size="sm" c="dimmed">
                              Crew: {callSheet.crew?.length || 0} members
                            </Text>
                          </Group>
                          <Group gap="xs">
                            <IconFileText size={14} color="gray" />
                            <Text size="sm" c="dimmed">
                              Created: {new Date(callSheet.created_at).toLocaleDateString()}
                            </Text>
                          </Group>
                        </Stack>

                        <Group justify="space-between">
                          <Button 
                            variant="light" 
                            size="sm" 
                            leftSection={<IconEye size={14} />}
                            onClick={() => handlePreviewCallSheet(callSheet)}
                          >
                            Preview
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            leftSection={<IconEdit size={14} />}
                            onClick={() => handleEditCallSheet(callSheet)}
                          >
                            Edit
                          </Button>
                        </Group>
                      </Card>
                    </Grid.Col>
                    ))}
                  </Grid>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <Group justify="center" mt="xl">
                      <Pagination
                        value={currentPage}
                        onChange={handlePageChange}
                        total={totalPages}
                        size="md"
                        withEdges
                      />
                    </Group>
                  )}
                </>
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="expired" pt="md">
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                View past call sheets and archived productions
              </Text>

              {/* Summary for expired tab */}
              <Paper p="md" withBorder>
                <Group justify="space-between" align="center">
                  <Text size="sm" c="dimmed">
                    Expired call sheets (past date/time)
                  </Text>
                  <Text size="sm" c="dimmed">
                    Showing {callSheets.length} of {totalCount} expired call sheets
                  </Text>
                </Group>
              </Paper>

              {dataLoading ? (
                <Center p="xl">
                  <Stack align="center" gap="md">
                    <Loader size="lg" />
                    <Text c="dimmed">Loading call sheets...</Text>
                  </Stack>
                </Center>
              ) : callSheets.length === 0 ? (
                <Paper p="xl" ta="center">
                  <IconClock size={48} color="gray" />
                  <Title order={3} c="dimmed" mt="md">
                    No Expired Call Sheets
                  </Title>
                  <Text c="dimmed" mb="lg">
                    Past call sheets will appear here
                  </Text>
                </Paper>
              ) : (
                <>
                  <Grid>
                    {callSheets.map((callSheet) => (
                    <Grid.Col key={callSheet.id} span={{ base: 12, md: 6, lg: 4 }}>
                      <Card shadow="sm" p="lg" radius="md" withBorder opacity={0.8}>
                        <Group justify="space-between" mb="md">
                          <Badge color={getRealTimeStatusColor(callSheet)} variant="light">
                            {getRealTimeStatus(callSheet).toUpperCase()}
                          </Badge>
                          <Menu shadow="md" width={200}>
                            <Menu.Target>
                              <ActionIcon variant="light" size="sm">
                                <IconDots size={16} />
                              </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                              <Menu.Item 
                                leftSection={<IconEye size={14} />}
                                onClick={() => handlePreviewCallSheet(callSheet)}
                              >
                                Preview
                              </Menu.Item>
                              <Menu.Item leftSection={<IconDownload size={14} />}>
                                Export PDF
                              </Menu.Item>
                              <Menu.Divider />
                              <Menu.Item 
                                leftSection={<IconTrash size={14} />}
                                color="red"
                                onClick={() => openDeleteConfirmation(callSheet.id)}
                              >
                                Delete
                              </Menu.Item>
                            </Menu.Dropdown>
                          </Menu>
                        </Group>

                        <Title order={4} mb="xs" c="dimmed">
                          {callSheet.project_name}
                        </Title>

                        <Stack gap="xs" mb="md">
                          <Group gap="xs">
                            <IconCalendar size={14} color="gray" />
                            <Text size="sm" c="dimmed">
                              {new Date(callSheet.date).toLocaleDateString()}
                            </Text>
                          </Group>
                          <Group gap="xs">
                            <IconUsers size={14} color="gray" />
                            <Text size="sm" c="dimmed">
                              Crew: {callSheet.crew?.length || 0} members
                            </Text>
                          </Group>
                          <Group gap="xs">
                            <IconFileText size={14} color="gray" />
                            <Text size="sm" c="dimmed">
                              Created: {new Date(callSheet.created_at).toLocaleDateString()}
                            </Text>
                          </Group>
                        </Stack>

                        <Group justify="space-between">
                          <Button 
                            variant="light" 
                            size="sm" 
                            leftSection={<IconEye size={14} />}
                            onClick={() => handlePreviewCallSheet(callSheet)}
                          >
                            Preview
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            color="gray"
                            leftSection={<IconDownload size={14} />}
                          >
                            Export
                          </Button>
                        </Group>
                      </Card>
                    </Grid.Col>
                    ))}
                  </Grid>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <Group justify="center" mt="xl">
                      <Pagination
                        value={currentPage}
                        onChange={handlePageChange}
                        total={totalPages}
                        size="md"
                        withEdges
                      />
                    </Group>
                  )}
                </>
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="create" pt="md">
            <CallSheetForm 
              onSubmit={handleCreateCallSheet}
              isLoading={formLoading}
              mode="create"
            />
          </Tabs.Panel>

          {editingCallSheet && (
            <Tabs.Panel value="edit" pt="md">
              <CallSheetForm 
                onSubmit={handleUpdateCallSheet}
                initialData={callSheetService.dbToFormData(editingCallSheet)}
                isLoading={formLoading}
                mode="edit"
              />
            </Tabs.Panel>
          )}
        </Tabs>
      </Stack>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        title="Confirm Deletion"
        centered
      >
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Warning"
          color="red"
          mb="md"
        >
          This action cannot be undone. The call sheet will be permanently deleted.
        </Alert>
        <Text mb="lg">
          Are you sure you want to delete this call sheet?
        </Text>
        <Group justify="flex-end">
          <Button variant="light" onClick={closeDeleteModal}>
            Cancel
          </Button>
          <Button color="red" onClick={handleDeleteCallSheet}>
            Delete
          </Button>
        </Group>
      </Modal>

    </Container>
  );
}
