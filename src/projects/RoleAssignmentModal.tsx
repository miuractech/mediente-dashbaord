import { useState, useEffect } from 'react';
import { useDebouncedValue } from '@mantine/hooks';
import {
  Modal,
  Text,
  Button,
  Group,
  Stack,
  Select,
  Card,
  Alert,
  Loader,
} from '@mantine/core';
import { IconUserPlus } from '@tabler/icons-react';
import {
  useUnassignedCrew,
  useAvailableCrew,
  useAssignCrewToRole,
  useRemoveCrewFromProject,
} from './project.hook';
import { CrewFormModal } from '../crew/CrewFormModal';
import { useAuth } from '../auth/useAuth';
import type { ProjectRole } from './project.typs';

interface RoleAssignmentModalProps {
  role: ProjectRole | null;
  projectId: string;
  opened: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  currentAssignmentId?: string;
}

export function RoleAssignmentModal({ 
  role, 
  projectId, 
  opened, 
  onClose, 
  onSuccess,
  currentAssignmentId 
}: RoleAssignmentModalProps) {
  const [selectedCrewId, setSelectedCrewId] = useState<string>('');
  const [crewFormModalOpened, setCrewFormModalOpened] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebouncedValue(searchTerm, 300);

  const { user } = useAuth();
  // Use unassigned crew for new assignments, all crew for reassignments
  const { crew: unassignedCrew, loading: unassignedLoading, refetch: refetchUnassigned } = useUnassignedCrew(projectId, debouncedSearchTerm, 10);
  const { crew: allCrew, loading: allCrewLoading, refetch: refetchAllCrew } = useAvailableCrew(debouncedSearchTerm, 10);
  
  const crew = currentAssignmentId ? allCrew : unassignedCrew;
  const crewLoading = currentAssignmentId ? allCrewLoading : unassignedLoading;
  
  const { assignCrew, loading: assignLoading } = useAssignCrewToRole();
  const { removeCrew, loading: removeLoading } = useRemoveCrewFromProject();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (opened) {
      setSelectedCrewId('');
      setSearchTerm('');
    }
  }, [opened]);


  const handleCrewCreated = () => {
    setCrewFormModalOpened(false);
    refetchUnassigned();
    refetchAllCrew();
  };

  if (!role) return null;

  // Crew is already filtered by backend to exclude assigned ones
  // For reassignment, we might want to show all crew, but for now keep the same logic
  const availableCrew = crew;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={currentAssignmentId ? `Reassign Role` : `Assign Crew to Role`}
      size="md"
      centered
    >
      <Stack gap="md">
        {/* Role Information */}
        <Card withBorder p="md" bg="gray.0">
          <Group gap="sm">
            <div style={{ flex: 1 }}>
              <Text fw={500}>{role.role_name}</Text>
              <Text size="sm" c="dimmed">{role.department_name}</Text>
            </div>
          </Group>
        </Card>

        {/* Crew Selection */}
        <div>
          <Group justify="space-between" align="center" mb="sm">
            <Text fw={500}>
              Select Crew Member {availableCrew.length > 0 && `(${availableCrew.length} of 10 shown)`}
            </Text>
            <Button
              size="xs"
              variant="light"
              leftSection={<IconUserPlus size={14} />}
              onClick={() => setCrewFormModalOpened(true)}
            >
              Add New Person
            </Button>
          </Group>
          
          <Select
            placeholder="Search and select crew member by name or email..."
            value={selectedCrewId}
            onChange={async (value) => {
              if (value && role) {
                setSelectedCrewId(value);
                
                // If this is a reassignment, first remove the current assignment
                if (currentAssignmentId) {
                  const removeSuccess = await removeCrew(currentAssignmentId);
                  if (!removeSuccess) return;
                }

                const success = await assignCrew({
                  project_id: projectId,
                  role_id: role.role_id,
                  crew_id: value,
                });

                if (success) {
                  onSuccess?.();
                }
              } else {
                setSelectedCrewId(value || '');
              }
            }}
            data={availableCrew.map(member => ({
              value: member.id,
              label: `${member.name} - ${member.email}`,
            }))}
            searchable
            onSearchChange={setSearchTerm}
            searchValue={searchTerm}
            maxDropdownHeight={300}
            clearable
            nothingFoundMessage={searchTerm ? "No crew members found matching your search" : "Type to search crew members"}
            rightSection={crewLoading ? <Loader size={16} /> : undefined}
            disabled={assignLoading || removeLoading}
          />
          
          {availableCrew.length === 0 && searchTerm.length > 0 && !crewLoading && (
            <Alert color="yellow" mt="xs">
              No crew members found matching "{searchTerm}". Try a different search term.
            </Alert>
          )}
          
          {availableCrew.length === 0 && !searchTerm && !crewLoading && (
            <Alert color="blue" variant="light" mt="xs">
              Start typing to search crew members by name or email...
            </Alert>
          )}
          
          {crewLoading && searchTerm && (
            <Alert color="blue" variant="light" mt="xs">
              Searching for "{searchTerm}"...
            </Alert>
          )}
        </div>

        {/* Actions */}
        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
        </Group>
      </Stack>

      {/* Crew Form Modal */}
      <CrewFormModal
        opened={crewFormModalOpened}
        onClose={() => setCrewFormModalOpened(false)}
        onSuccess={handleCrewCreated}
        currentUserId={user?.id || ''}
      />
    </Modal>
  );
}
