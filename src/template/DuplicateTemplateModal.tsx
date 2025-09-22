import { useState, useEffect } from 'react';
import { Modal, TextInput, Group, Button, Stack, Text, Progress, Alert, Badge } from '@mantine/core';
import { IconInfoCircle, IconAlertTriangle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { projectTemplateService } from './projectTemplateService';
import type { ProjectTemplate } from './template.type';

interface DuplicateTemplateModalProps {
  opened: boolean;
  onClose: () => void;
  template: ProjectTemplate | null;
  onSuccess: () => void;
}

export default function DuplicateTemplateModal({
  opened,
  onClose,
  template,
  onSuccess
}: DuplicateTemplateModalProps) {
  const [newTemplateName, setNewTemplateName] = useState('');
  const [loading, setLoading] = useState(false);
  const [complexity, setComplexity] = useState<{
    template_id: string;
    template_name: string;
    phase_count: number;
    step_count: number;
    task_count: number;
    parent_task_count: number;
    estimated_duration_seconds: number;
  } | null>(null);
  const [loadingComplexity, setLoadingComplexity] = useState(false);

  const handleSubmit = async () => {
    if (!template || !newTemplateName.trim()) return;

    setLoading(true);
    try {
      await projectTemplateService.duplicate(template.template_id, newTemplateName.trim());
      
      notifications.show({
        title: 'Success',
        message: `Template "${newTemplateName}" created successfully`,
        color: 'green'
      });

      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error duplicating template:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to duplicate template',
        color: 'red'
      });
    } finally {
      setLoading(false);
    }
  };

  // Load complexity when template changes
  useEffect(() => {
    if (template && opened) {
      setLoadingComplexity(true);
      projectTemplateService.getComplexity(template.template_id)
        .then(setComplexity)
        .catch(console.error)
        .finally(() => setLoadingComplexity(false));
    }
  }, [template, opened]);

  const handleClose = () => {
    setNewTemplateName('');
    setComplexity(null);
    onClose();
  };

  const isLargeTemplate = complexity && complexity.task_count > 1000;
  const isVeryLargeTemplate = complexity && complexity.task_count > 5000;
  const estimatedTime = complexity ? Math.max(1, Math.ceil(complexity.estimated_duration_seconds / 1000)) : 0;

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Duplicate Template"
      size="md"
    >
      <Stack>
        <Text size="sm" c="dimmed">
          Create a copy of "{template?.template_name}" with all its phases, steps, and tasks.
        </Text>

        {/* Template Complexity Info */}
        {loadingComplexity && (
          <Alert icon={<IconInfoCircle size={16} />} title="Loading template information...">
            <Progress size="sm" animated />
          </Alert>
        )}

        {complexity && (
          <Alert 
            icon={isVeryLargeTemplate ? <IconAlertTriangle size={16} /> : <IconInfoCircle size={16} />}
            color={isVeryLargeTemplate ? "orange" : "blue"}
            title="Template Size Information"
          >
            <Stack gap="xs">
              <Group gap="md">
                <Badge variant="light">{complexity.phase_count} phases</Badge>
                <Badge variant="light">{complexity.step_count} steps</Badge>
                <Badge variant="light" color={isLargeTemplate ? "orange" : "blue"}>
                  {complexity.task_count} tasks
                </Badge>
              </Group>
              
              {isLargeTemplate && (
                <Text size="sm" c={isVeryLargeTemplate ? "orange" : "dimmed"}>
                  {isVeryLargeTemplate ? "⚠️ Very large template" : "📋 Large template"} - 
                  Estimated duplication time: ~{estimatedTime} seconds
                </Text>
              )}
              
              {isVeryLargeTemplate && (
                <Text size="sm" c="orange">
                  Please be patient during duplication. Do not close this window.
                </Text>
              )}
            </Stack>
          </Alert>
        )}
        
        <TextInput
          label="New Template Name"
          placeholder="Enter name for the duplicated template"
          value={newTemplateName}
          onChange={(event) => setNewTemplateName(event.currentTarget.value)}
          required
          data-autofocus
        />

        {loading && (
          <Alert icon={<IconInfoCircle size={16} />} color="blue">
            <Stack gap="xs">
              <Text size="sm">Duplicating template... This may take a few moments.</Text>
              <Progress size="sm" animated />
              {isLargeTemplate && (
                <Text size="xs" c="dimmed">
                  Large templates may take up to {estimatedTime} seconds to duplicate.
                </Text>
              )}
            </Stack>
          </Alert>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="light" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            loading={loading}
            disabled={!newTemplateName.trim() || loadingComplexity}
          >
            {loading ? 'Duplicating...' : 'Duplicate Template'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
