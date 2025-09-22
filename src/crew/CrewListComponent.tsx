import { Table, Avatar, Badge, ActionIcon, Group, Text, Tooltip, Menu, TextInput, Switch, Flex } from '@mantine/core';
import { IconSearch, IconDots, IconEdit, IconArchive, IconRestore, IconEye, IconUser } from '@tabler/icons-react';
import { useState, useMemo, useCallback } from 'react';
import type { crewType } from './crew.type';
import { useCrewMutations } from './crew.hook';

interface CrewListComponentProps {
  crew: crewType[];
  onEdit: (crew: crewType) => void;
  onView: (crew: crewType) => void;
  onRefresh: () => void;
  includeArchived: boolean;
  onToggleArchived: (includeArchived: boolean) => void;
  currentUserId: string;
}

export const CrewListComponent = ({ 
  crew, 
  onEdit, 
  onView, 
  onRefresh, 
  includeArchived, 
  onToggleArchived,
  currentUserId 
}: CrewListComponentProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { archiveCrew, unarchiveCrew, loading } = useCrewMutations();

  const filteredCrew = useMemo(() => crew.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  ), [crew, searchTerm]);

  const handleArchive = useCallback(async (crewMember: crewType) => {
    try {
      await archiveCrew(crewMember.id, currentUserId);
      onRefresh();
    } catch (error) {
      console.error('Failed to archive crew member:', error);
    }
  }, [archiveCrew, currentUserId, onRefresh]);

  const handleUnarchive = useCallback(async (crewMember: crewType) => {
    try {
      await unarchiveCrew(crewMember.id, currentUserId);
      onRefresh();
    } catch (error) {
      console.error('Failed to restore crew member:', error);
    }
  }, [unarchiveCrew, currentUserId, onRefresh]);

  const getEmploymentStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'inactive': return 'gray';
      case 'terminated': return 'red';
      case 'on_leave': return 'yellow';
      default: return 'gray';
    }
  };


  return (
    <div>
      <Flex justify="space-between" align="center" mb="md">
        <TextInput
          placeholder="Search crew members..."
          leftSection={<IconSearch size={14} />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, maxWidth: 400 }}
        />
        <Switch
          label="Include Archived"
          checked={includeArchived}
          onChange={(e) => onToggleArchived(e.currentTarget.checked)}
        />
      </Flex>

      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Profile</Table.Th>
            <Table.Th>Name</Table.Th>
            <Table.Th>Email</Table.Th>
            <Table.Th>Phone</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Employment</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {filteredCrew.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={8}>
                <Text ta="center" c="dimmed">
                  {searchTerm ? 'No crew members found matching your search' : 'No crew members found'}
                </Text>
              </Table.Td>
            </Table.Tr>
          ) : (
            filteredCrew.map((member) => (
              <Table.Tr key={member.id} style={{ opacity: member.is_archived ? 0.6 : 1 }}>
                <Table.Td>
                  <Avatar 
                    src={member.photo_url} 
                    size="sm" 
                    radius="xl"
                  >
                    <IconUser size={16} />
                  </Avatar>
                </Table.Td>
                <Table.Td>
                  <div>
                    <Text fw={500}>{member.name}</Text>
                    {member.is_archived && (
                      <Badge size="xs" color="red" variant="outline">
                        Archived
                      </Badge>
                    )}
                  </div>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{member.email}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{member.phone || '-'}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge 
                    color={member.status ? 'green' : 'red'} 
                    variant="light"
                  >
                    {member.status ? 'Active' : 'Inactive'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Badge 
                    color={getEmploymentStatusColor(member.employment_status || 'active')} 
                    variant="light"
                  >
                    {member.employment_status?.replace('_', ' ').toUpperCase() || 'ACTIVE'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    <Tooltip label="View Details">
                      <ActionIcon 
                        variant="subtle" 
                        color="blue"
                        onClick={() => onView(member)}
                      >
                        <IconEye size={16} />
                      </ActionIcon>
                    </Tooltip>
                    
                    <Tooltip label="Edit">
                      <ActionIcon 
                        variant="subtle" 
                        color="blue"
                        onClick={() => onEdit(member)}
                        disabled={member.is_archived}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                    </Tooltip>

                    <Menu shadow="md" width={200}>
                      <Menu.Target>
                        <ActionIcon variant="subtle" color="gray">
                          <IconDots size={16} />
                        </ActionIcon>
                      </Menu.Target>

                      <Menu.Dropdown>
                        {member.is_archived ? (
                          <Menu.Item
                            leftSection={<IconRestore size={14} />}
                            onClick={() => handleUnarchive(member)}
                            disabled={loading}
                          >
                            Restore
                          </Menu.Item>
                        ) : (
                          <Menu.Item
                            leftSection={<IconArchive size={14} />}
                            color="red"
                            onClick={() => handleArchive(member)}
                            disabled={loading}
                          >
                            Archive
                          </Menu.Item>
                        )}
                      </Menu.Dropdown>
                    </Menu>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))
          )}
        </Table.Tbody>
      </Table>
    </div>
  );
};
