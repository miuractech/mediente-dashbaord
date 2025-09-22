import {
  Card,
  Text,
  Badge,
  Group,
  Stack,
  Progress,
  ActionIcon,
  Menu,
  Image,
  Tooltip,
} from '@mantine/core';
import { IconDots, IconEdit, IconArchive, IconEye } from '@tabler/icons-react';
import { useProjectProgress } from './project.hook';
import type { ProjectWithStats } from './project.typs';

interface ProjectCardProps {
  project: ProjectWithStats;
  onView?: (project: ProjectWithStats) => void;
  onEdit?: (project: ProjectWithStats) => void;
  onArchive?: (project: ProjectWithStats) => void;
}

export function ProjectCard({ project, onView, onEdit, onArchive }: ProjectCardProps) {
  const progress = useProjectProgress(project);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'blue';
      case 'completed':
        return 'green';
      case 'archived':
        return 'gray';
      default:
        return 'gray';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };


  return (
    <Card 
      shadow="sm" 
      padding="md" 
      radius="md" 
      withBorder 
      style={{ cursor: 'pointer' }}
      onClick={() => onView?.(project)}
    >
      <Card.Section>
        {project.image_url ? (
          <Image
            src={project.image_url}
            height={160}
            h={300}
            alt={project.project_name}
            fallbackSrc="https://placehold.co/400x160?text=No+Image"
          />
        ) : (
          <div
            style={{
              height: 300,
              backgroundColor: 'var(--mantine-color-gray-1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text c="dimmed" size="sm">
              No image
            </Text>
          </div>
        )}
      </Card.Section>

      <Group justify="space-between" mt="md" mb="xs">
        <Text fw={500} size="lg" lineClamp={1}>
          {project.project_name}
        </Text>
        
        <Menu shadow="md" width={200}>
          <Menu.Target>
            <ActionIcon 
              variant="subtle" 
              color="gray"
              onClick={(e) => e.stopPropagation()}
            >
              <IconDots size={16} />
            </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown>
            {onView && (
              <Menu.Item 
                leftSection={<IconEye size={14} />} 
                onClick={(e) => {
                  e.stopPropagation();
                  onView(project);
                }}
              >
                View Details
              </Menu.Item>
            )}
            {onEdit && (
              <Menu.Item 
                leftSection={<IconEdit size={14} />} 
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(project);
                }}
              >
                Edit Project
              </Menu.Item>
            )}
            {onArchive && (
              <Menu.Item 
                leftSection={<IconArchive size={14} />} 
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive(project);
                }}
                color="red"
              >
                Archive
              </Menu.Item>
            )}
          </Menu.Dropdown>
        </Menu>
      </Group>

      <Group justify="space-between" mb="md">
        <Badge color={getStatusColor(project.project_status)} variant="light">
          {project.project_status.charAt(0).toUpperCase() + project.project_status.slice(1)}
        </Badge>
        
        {progress?.hasEscalatedTasks && (
          <Badge color="red" variant="light">
            {progress.escalatedTasks} Escalated
          </Badge>
        )}
      </Group>

      {project.project_description && (
        <Text size="sm" c="dimmed" lineClamp={2} mb="md">
          {project.project_description}
        </Text>
      )}

      <Stack gap="xs" mb="md">
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Start Date
          </Text>
          <Text size="sm">
            {formatDate(project.project_start_date)}
          </Text>
        </Group>

        {project.project_end_date && (
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              End Date
            </Text>
            <Text size="sm">
              {formatDate(project.project_end_date)}
            </Text>
          </Group>
        )}
      </Stack>

      {progress && (
        <Stack gap="xs" mb="md">
          <Group justify="space-between">
            <Text size="sm" fw={500}>
              Progress
            </Text>
            <Text size="sm" fw={500}>
              {progress.progressPercentage}%
            </Text>
          </Group>
          
          <Progress
            value={progress.progressPercentage}
            color={progress.hasEscalatedTasks ? 'red' : 'blue'}
            size="sm"
          />

          <Group justify="space-between">
            <Group gap="xs">
              <Tooltip label="Completed Tasks">
                <Badge variant="light" color="green" size="xs">
                  ✓ {progress.completedTasks}
                </Badge>
              </Tooltip>
              
              <Tooltip label="Ongoing Tasks">
                <Badge variant="light" color="blue" size="xs">
                  ⏳ {progress.ongoingTasks}
                </Badge>
              </Tooltip>
              
              <Tooltip label="Pending Tasks">
                <Badge variant="light" color="gray" size="xs">
                  ⏸ {progress.pendingTasks}
                </Badge>
              </Tooltip>
              
              {progress.escalatedTasks > 0 && (
                <Tooltip label="Escalated Tasks">
                  <Badge variant="light" color="red" size="xs">
                    ⚠ {progress.escalatedTasks}
                  </Badge>
                </Tooltip>
              )}
            </Group>
          </Group>
        </Stack>
      )}

      <Group justify="space-between">
        <Group gap="xs">
          <Tooltip label="Total Roles">
            <Badge variant="outline" size="xs">
              👥 {project.total_roles}
            </Badge>
          </Tooltip>
          
          <Tooltip label="Filled Roles">
            <Badge variant="outline" color="green" size="xs">
              ✓ {project.filled_roles}
            </Badge>
          </Tooltip>
          
          {project.unfilled_roles > 0 && (
            <Tooltip label="Unfilled Roles">
              <Badge variant="outline" color="red" size="xs">
                ❌ {project.unfilled_roles}
              </Badge>
            </Tooltip>
          )}
        </Group>

        <Text size="xs" c="dimmed">
          Created {formatDate(project.created_at)}
        </Text>
      </Group>

      {project.unfilled_roles > 0 && (
        <Text size="xs" c="orange" mt="xs" ta="center">
          ⚠ Complete crew assignment to start project
        </Text>
      )}
    </Card>
  );
}
