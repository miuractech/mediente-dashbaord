import { useState, useMemo } from 'react';
import {
  Stack,
  Group,
  Button,
  TextInput,
  Select,
  SimpleGrid,
  Text,
  Center,
  Loader,
  Badge,
  Paper,
  Pagination,
} from '@mantine/core';
import { IconPlus, IconSearch, IconFilter } from '@tabler/icons-react';
import { useDebouncedValue } from '@mantine/hooks';
import { useProjects } from './project.hook';
import { ProjectCard } from './ProjectCard';
import { ProjectFormModal } from './ProjectFormModal';
import type { ProjectWithStats, ProjectFilters, ProjectStatusType } from './project.typs';

interface ProjectListComponentProps {
  onProjectView?: (project: ProjectWithStats) => void;
  onProjectEdit?: (project: ProjectWithStats) => void;
  onProjectArchive?: (project: ProjectWithStats) => void;
}

const ITEMS_PER_PAGE = 12;

export function ProjectListComponent({
  onProjectView,
  onProjectEdit,
  onProjectArchive,
}: ProjectListComponentProps) {
  const [createModalOpened, setCreateModalOpened] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedSearchTerm] = useDebouncedValue(searchTerm, 300);

  // Build filters with useMemo to prevent infinite re-renders
  const filters = useMemo((): ProjectFilters => ({
    ...(debouncedSearchTerm && { search: debouncedSearchTerm }),
    ...(statusFilter && { status: [statusFilter as ProjectStatusType] }),
  }), [debouncedSearchTerm, statusFilter]);

  const { projects, loading, error, refetch } = useProjects(filters);

  // Pagination
  const totalPages = Math.ceil(projects.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedProjects = projects.slice(startIndex, endIndex);

  const handleCreateSuccess = () => {
    refetch();
  };

  const getProjectStats = () => {
    const total = projects.length;
    const active = projects.filter(p => p.project_status === 'active').length;
    const completed = projects.filter(p => p.project_status === 'completed').length;
    const archived = projects.filter(p => p.project_status === 'archived').length;

    return { total, active, completed, archived };
  };

  const stats = getProjectStats();

  if (error) {
    return (
      <Center h={400}>
        <Stack align="center" gap="md">
          <Text c="red">Failed to load projects</Text>
          <Button onClick={refetch} variant="light">
            Try Again
          </Button>
        </Stack>
      </Center>
    );
  }

  return (
    <Stack gap="md">
      {/* Header */}
      <Group justify="space-between">
        <div>
          <Text size="xl" fw={700}>
            Projects
          </Text>
          <Text size="sm" c="dimmed">
            Manage your film production projects
          </Text>
        </div>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => setCreateModalOpened(true)}
        >
          Create Project
        </Button>
      </Group>

      {/* Stats */}
      <Paper p="md" withBorder>
        <Group justify="space-around">
          <Stack align="center" gap="xs">
            <Text size="lg" fw={700}>
              {stats.total}
            </Text>
            <Text size="sm" c="dimmed">
              Total Projects
            </Text>
          </Stack>
          <Stack align="center" gap="xs">
            <Text size="lg" fw={700} c="blue">
              {stats.active}
            </Text>
            <Text size="sm" c="dimmed">
              Active
            </Text>
          </Stack>
          <Stack align="center" gap="xs">
            <Text size="lg" fw={700} c="green">
              {stats.completed}
            </Text>
            <Text size="sm" c="dimmed">
              Completed
            </Text>
          </Stack>
          <Stack align="center" gap="xs">
            <Text size="lg" fw={700} c="gray">
              {stats.archived}
            </Text>
            <Text size="sm" c="dimmed">
              Archived
            </Text>
          </Stack>
        </Group>
      </Paper>

      {/* Filters */}
      <Paper p="md" withBorder>
        <Group gap="md">
          <TextInput
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftSection={<IconSearch size={16} />}
            style={{ flex: 1 }}
          />
          
          <Select
            placeholder="Filter by status"
            value={statusFilter}
            onChange={(value) => setStatusFilter(value || 'active')}
            data={[
              { value: 'active', label: 'Active' },
              { value: 'completed', label: 'Completed' },
              { value: 'archived', label: 'Archived' },
              { value: '', label: 'All Statuses' },
            ]}
            leftSection={<IconFilter size={16} />}
            w={200}
          />
        </Group>

        {/* Active filters display */}
        {(debouncedSearchTerm || statusFilter) && (
          <Group gap="xs" mt="sm">
            <Text size="sm" c="dimmed">
              Active filters:
            </Text>
            {debouncedSearchTerm && (
              <Badge variant="light" size="sm">
                Search: "{debouncedSearchTerm}"
              </Badge>
            )}
            {statusFilter && (
              <Badge variant="light" size="sm">
                Status: {statusFilter}
              </Badge>
            )}
          </Group>
        )}
      </Paper>

      {/* Projects Grid */}
      {loading ? (
        <Center h={400}>
          <Loader size="lg" />
        </Center>
      ) : projects.length === 0 ? (
        <Center h={400}>
          <Stack align="center" gap="md">
            <Text size="lg" c="dimmed">
              {debouncedSearchTerm || statusFilter ? 'No projects match your filters' : 'No projects created yet'}
            </Text>
            {!debouncedSearchTerm && !statusFilter && (
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => setCreateModalOpened(true)}
              >
                Create Your First Project
              </Button>
            )}
          </Stack>
        </Center>
      ) : (
        <>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
            {paginatedProjects.map((project) => (
              <ProjectCard
                key={project.project_id}
                project={project}
                onView={onProjectView}
                onEdit={onProjectEdit}
                onArchive={onProjectArchive}
              />
            ))}
          </SimpleGrid>

          {/* Pagination */}
          {totalPages > 1 && (
            <Group justify="center" mt="xl">
              <Pagination
                total={totalPages}
                value={currentPage}
                onChange={setCurrentPage}
                size="sm"
              />
            </Group>
          )}

          {/* Results info */}
          <Text size="sm" c="dimmed" ta="center">
            Showing {startIndex + 1}-{Math.min(endIndex, projects.length)} of {projects.length} projects
          </Text>
        </>
      )}

      {/* Create Project Modal */}
      <ProjectFormModal
        opened={createModalOpened}
        onClose={() => setCreateModalOpened(false)}
        onSuccess={handleCreateSuccess}
      />
    </Stack>
  );
}
