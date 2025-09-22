import { Container, Title, Button, Group, LoadingOverlay, Text, Stack } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useState, useCallback } from 'react';
import { useCrewList } from '../crew/crew.hook';
import { CrewListComponent } from '../crew/CrewListComponent';
import { CrewFormModal } from '../crew/CrewFormModal';
import { CrewViewModal } from '../crew/CrewViewModal';
import type { crewType } from '../crew/crew.type';
import { useAuth } from '../auth/useAuth';

export default function CrewManagement() {
  const { user } = useAuth();
  const [includeArchived, setIncludeArchived] = useState(false);
  const { crew, loading, refetch } = useCrewList(includeArchived);
  const [formModalOpened, setFormModalOpened] = useState(false);
  const [viewModalOpened, setViewModalOpened] = useState(false);
  const [selectedCrew, setSelectedCrew] = useState<crewType | null>(null);

  const handleAddCrew = useCallback(() => {
    setSelectedCrew(null);
    setFormModalOpened(true);
  }, []);

  const handleEditCrew = useCallback((crewMember: crewType) => {
    setSelectedCrew(crewMember);
    setFormModalOpened(true);
  }, []);

  const handleViewCrew = useCallback((crewMember: crewType) => {
    setSelectedCrew(crewMember);
    setViewModalOpened(true);
  }, []);

  const handleFormSuccess = useCallback(() => {
    refetch();
    setFormModalOpened(false);
    setSelectedCrew(null);
  }, [refetch]);

  const handleToggleArchived = useCallback((includeArchivedValue: boolean) => {
    setIncludeArchived(includeArchivedValue);
  }, []);

  if (!user) {
    return (
      <Container size="xl" py="xl">
        <Text>Please log in to access crew management.</Text>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <LoadingOverlay visible={loading} />
      
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={2}>Crew Management</Title>
          <Button 
            leftSection={<IconPlus size={16} />}
            onClick={handleAddCrew}
          >
            Add Crew Member
          </Button>
        </Group>

        <CrewListComponent
          crew={crew}
          onEdit={handleEditCrew}
          onView={handleViewCrew}
          onRefresh={refetch}
          includeArchived={includeArchived}
          onToggleArchived={handleToggleArchived}
          currentUserId={user.id}
        />
      </Stack>

      <CrewFormModal
        opened={formModalOpened}
        onClose={() => {
          setFormModalOpened(false);
          setSelectedCrew(null);
        }}
        crew={selectedCrew}
        onSuccess={handleFormSuccess}
        currentUserId={user.id}
      />

      <CrewViewModal
        opened={viewModalOpened}
        onClose={() => {
          setViewModalOpened(false);
          setSelectedCrew(null);
        }}
        crew={selectedCrew}
      />
    </Container>
  );
}
