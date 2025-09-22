import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Stack,
  Group,
  Button,
  Text,
  Card,
  Alert,
  Loader,
  Center,
  Breadcrumbs,
  Anchor,
  Badge,
  SimpleGrid,
  Pagination,
  Avatar,
  ActionIcon,
  TextInput,
  Select,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconUser,
  IconUserPlus,
  IconSearch,
  IconFilter,
  IconX,
} from '@tabler/icons-react';
import { useProject, useProjectRoles, useProjectCrewAssignments } from '../projects/project.hook';
import { RoleAssignmentModal } from '../projects/RoleAssignmentModal';
import { CrewDetailModal } from '../projects/CrewDetailModal';
import type { ProjectRole, ProjectCrewAssignmentWithDetails } from '../projects/project.typs';

const ROLES_PER_PAGE = 12;

export default function ProjectCrewManagement() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<ProjectRole | null>(null);
  const [assignmentModalOpened, setAssignmentModalOpened] = useState(false);
  const [selectedCrewMember, setSelectedCrewMember] = useState<ProjectCrewAssignmentWithDetails | null>(null);
  const [crewDetailModalOpened, setCrewDetailModalOpened] = useState(false);

  const { project, loading: projectLoading, error: projectError } = useProject(projectId || null);
  const { roles, loading: rolesLoading, refetch: refetchRoles } = useProjectRoles(projectId || null);
  const { assignments, loading: assignmentsLoading, refetch: refetchAssignments } = useProjectCrewAssignments(projectId || null);

  const loading = projectLoading || rolesLoading || assignmentsLoading;

  if (loading) {
    return (
      <Center h="100vh">
        <Loader size="lg" />
      </Center>
    );
  }

  if (projectError || !project) {
    return (
      <Stack gap="md" p="md">
        <Alert color="red" title="Error">
          Project not found or failed to load.
        </Alert>
        <Button onClick={() => navigate('/admin/projects')}>
          Back to Projects
        </Button>
      </Stack>
    );
  }

  // Filter roles based on search and filters
  const filteredRoles = roles.filter(role => {
    const matchesSearch = !searchTerm || 
      role.role_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.department_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = !departmentFilter || role.department_name === departmentFilter;
    
    const matchesStatus = !statusFilter || 
      (statusFilter === 'filled' && role.is_filled) ||
      (statusFilter === 'unfilled' && !role.is_filled);
    
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredRoles.length / ROLES_PER_PAGE);
  const startIndex = (currentPage - 1) * ROLES_PER_PAGE;
  const paginatedRoles = filteredRoles.slice(startIndex, startIndex + ROLES_PER_PAGE);

  // Get unique departments for filter
  const departments = Array.from(new Set(roles.map(role => role.department_name))).sort();

  // Get assignment for a role
  const getAssignmentForRole = (roleId: string) => {
    return assignments.find(assignment => assignment.project_role_id === roleId);
  };

  const breadcrumbItems = [
    { title: 'Projects', href: '/admin/projects' },
    { title: project.project_name, href: `/admin/projects/${projectId}` },
    { title: 'Crew Management', href: null },
  ].map((item, index) => (
    item.href ? (
      <Anchor key={index} onClick={() => navigate(item.href!)}>
        {item.title}
      </Anchor>
    ) : (
      <Text key={index}>{item.title}</Text>
    )
  ));

  const handleRoleClick = (role: ProjectRole) => {
    const assignment = getAssignmentForRole(role.project_role_id);
    if (assignment) {
      // Show crew member details
      setSelectedCrewMember(assignment);
      setCrewDetailModalOpened(true);
    } else {
      // Show assignment modal
      setSelectedRole(role);
      setAssignmentModalOpened(true);
    }
  };

  const handleAssignmentSuccess = () => {
    refetchRoles();
    refetchAssignments();
    setAssignmentModalOpened(false);
    setSelectedRole(null);
  };

  const handleRemoveAssignment = () => {
    refetchRoles();
    refetchAssignments();
    setCrewDetailModalOpened(false);
    setSelectedCrewMember(null);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDepartmentFilter('');
    setStatusFilter('');
    setCurrentPage(1);
  };

  return (
    <Stack gap="md" p="md">
      {/* Breadcrumbs */}
      <Breadcrumbs>{breadcrumbItems}</Breadcrumbs>

      {/* Header */}
      <Group justify="space-between">
        <div>
          <Text size="xl" fw={700}>
            Crew Management - {project.project_name}
          </Text>
          <Text size="sm" c="dimmed" mt="xs">
            {assignments.length} of {roles.length} roles filled
          </Text>
        </div>
        
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate('/admin/projects')}
        >
          Back to Projects
        </Button>
      </Group>

      {/* Progress Alert */}
      {assignments.length === roles.length ? (
        <Alert color="green" title="All Roles Filled">
          <Group justify="space-between">
            <div>
              <Text fw={500}>All project roles have been assigned to crew members. The project is ready to start!</Text>
            </div>
            <Button
              size="sm"
              onClick={() => navigate(`/admin/projects/${projectId}`)}
            >
              Continue to Project
            </Button>
          </Group>
        </Alert>
      ) : (
        <Alert color="orange" title="Roles Pending Assignment">
          {roles.length - assignments.length} role(s) still need to be assigned before the project can start.
        </Alert>
      )}

      {/* Summary Stats */}
      <Card withBorder p="md">
        <Text fw={500} mb="sm">Summary</Text>
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
          <div>
            <Text size="lg" fw={700} c="blue">
              {roles.length}
            </Text>
            <Text size="sm" c="dimmed">Total Roles</Text>
          </div>
          <div>
            <Text size="lg" fw={700} c="green">
              {assignments.length}
            </Text>
            <Text size="sm" c="dimmed">Filled</Text>
          </div>
          <div>
            <Text size="lg" fw={700} c="orange">
              {roles.length - assignments.length}
            </Text>
            <Text size="sm" c="dimmed">Unfilled</Text>
          </div>
          <div>
            <Text size="lg" fw={700}>
              {departments.length}
            </Text>
            <Text size="sm" c="dimmed">Departments</Text>
          </div>
        </SimpleGrid>
      </Card>

      {/* Filters */}
      <Card withBorder p="md">
        <Group gap="md" align="end">
          <TextInput
            placeholder="Search roles or departments..."
            leftSection={<IconSearch size={16} />}
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.currentTarget.value);
              setCurrentPage(1);
            }}
            style={{ flex: 1 }}
            rightSection={
              searchTerm && (
                <ActionIcon
                  variant="subtle"
                  onClick={() => setSearchTerm('')}
                  size="sm"
                >
                  <IconX size={12} />
                </ActionIcon>
              )
            }
          />

          <Select
            placeholder="Department"
            leftSection={<IconFilter size={16} />}
            value={departmentFilter}
            onChange={(value) => {
              setDepartmentFilter(value || '');
              setCurrentPage(1);
            }}
            data={[
              { value: '', label: 'All Departments' },
              ...departments.map(dept => ({ value: dept, label: dept }))
            ]}
            style={{ minWidth: 180 }}
            clearable
          />

          <Select
            placeholder="Status"
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value || '');
              setCurrentPage(1);
            }}
            data={[
              { value: '', label: 'All Roles' },
              { value: 'filled', label: 'Filled' },
              { value: 'unfilled', label: 'Unfilled' }
            ]}
            style={{ minWidth: 120 }}
            clearable
          />

          {(searchTerm || departmentFilter || statusFilter) && (
            <Button variant="light" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </Group>
      </Card>

      {/* Role Cards Grid */}
      {filteredRoles.length === 0 ? (
        <Card withBorder p="xl">
          <Text ta="center" c="dimmed">
            No roles found matching your filters.
          </Text>
        </Card>
      ) : (
        <>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
            {paginatedRoles.map((role) => {
              const assignment = getAssignmentForRole(role.project_role_id);
              
              return (
                <Card
                  key={role.project_role_id}
                  withBorder
                  p="md"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleRoleClick(role)}
                >
                  <Stack gap="sm">
                    <Group justify="space-between" align="flex-start">
                      <div style={{ flex: 1 }}>
                        <Text fw={500} size="sm" lineClamp={2}>
                          {role.role_name}
                        </Text>
                        <Text size="xs" c="dimmed" mt="xs">
                          {role.department_name}
                        </Text>
                      </div>
                      
                      <Badge
                        color={assignment ? 'green' : 'orange'}
                        variant="light"
                        size="sm"
                      >
                        {assignment ? 'Filled' : 'Open'}
                      </Badge>
                    </Group>

                    {assignment ? (
                      <Group gap="sm">
                        <Avatar
                          src={assignment.crew.photo_url}
                          size="sm"
                          radius="xl"
                        >
                          <IconUser size={16} />
                        </Avatar>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Text size="sm" fw={500} lineClamp={1}>
                            {assignment.crew.name}
                          </Text>
                          <Text size="xs" c="dimmed" lineClamp={1}>
                            {assignment.crew.email}
                          </Text>
                        </div>
                      </Group>
                    ) : (
                      <Group gap="sm" c="dimmed">
                        <IconUserPlus size={16} />
                        <Text size="sm">
                          Click to assign crew member
                        </Text>
                      </Group>
                    )}
                  </Stack>
                </Card>
              );
            })}
          </SimpleGrid>

          {/* Pagination */}
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
        </>
      )}

      {/* Role Assignment Modal */}
      <RoleAssignmentModal
        role={selectedRole}
        projectId={projectId || ''}
        opened={assignmentModalOpened}
        onClose={() => {
          setAssignmentModalOpened(false);
          setSelectedRole(null);
        }}
        onSuccess={handleAssignmentSuccess}
      />

      {/* Crew Detail Modal */}
      <CrewDetailModal
        assignment={selectedCrewMember}
        opened={crewDetailModalOpened}
        onClose={() => {
          setCrewDetailModalOpened(false);
          setSelectedCrewMember(null);
        }}
        onRemoveAssignment={handleRemoveAssignment}
      />
    </Stack>
  );
}