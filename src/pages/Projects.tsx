import { useState, useCallback } from 'react';
import { Stack, Modal, Button, Group, Alert } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { ProjectListComponent } from '../projects/ProjectListComponent';
import { EditProjectModal } from '../projects/EditProjectModal';
import { useArchiveProject } from '../projects/project.hook';
import { useAutoRefresh } from '../projects/useAutoRefresh.hook';
import type { ProjectWithStats } from '../projects/project.typs';

export default function Projects() {
  const [selectedProject, setSelectedProject] = useState<ProjectWithStats | null>(null);
  const [archiveConfirmModalOpened, setArchiveConfirmModalOpened] = useState(false);
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();

  const { archiveProject, loading: archiveLoading } = useArchiveProject();

  // Manual refresh handler
  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  // Set up auto-refresh every 2 minutes when window is active
  useAutoRefresh({
    enabled: true,
    interval: 120000, // 2 minutes
    onRefresh: handleRefresh,
  });

  const handleProjectView = (project: ProjectWithStats) => {
    // Check if crew assignment is complete
    if (project.unfilled_roles > 0) {
      // Redirect to crew management page
      navigate(`/admin/projects/${project.project_id}/crew-management`);
    } else {
      // Redirect to project details page
      navigate(`/admin/projects/${project.project_id}`);
    }
  };

  const handleProjectEdit = (project: ProjectWithStats) => {
    setSelectedProject(project);
    setEditModalOpened(true);
  };

  const handleProjectArchive = (project: ProjectWithStats) => {
    setSelectedProject(project);
    setArchiveConfirmModalOpened(true);
  };


  const handleArchiveConfirm = async () => {
    if (!selectedProject) return;

    const success = await archiveProject(selectedProject.project_id);
    if (success) {
      setArchiveConfirmModalOpened(false);
      setSelectedProject(null);
      setRefreshKey(prev => prev + 1);
    }
  };

  const handleEditSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <Stack gap="md" p="md">
      <ProjectListComponent
        key={refreshKey}
        onProjectView={handleProjectView}
        onProjectEdit={handleProjectEdit}
        onProjectArchive={handleProjectArchive}
      />


      {/* Archive Project Confirmation Modal */}
      <Modal
        opened={archiveConfirmModalOpened}
        onClose={() => {
          setArchiveConfirmModalOpened(false);
          setSelectedProject(null);
        }}
        title="Archive Project"
        centered
      >
        {selectedProject && (
          <Stack gap="md">
            <Alert color="red">
              Are you sure you want to archive "{selectedProject.project_name}"?
              This action cannot be undone easily.
            </Alert>
            
            <Group justify="flex-end">
              <Button
                variant="subtle"
                onClick={() => setArchiveConfirmModalOpened(false)}
                disabled={archiveLoading}
              >
                Cancel
              </Button>
              <Button
                color="red"
                onClick={handleArchiveConfirm}
                loading={archiveLoading}
              >
                Archive Project
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Edit Project Modal */}
      <EditProjectModal
        opened={editModalOpened}
        onClose={() => {
          setEditModalOpened(false);
          setSelectedProject(null);
        }}
        onSuccess={handleEditSuccess}
        project={selectedProject}
      />
    </Stack>
  );
}