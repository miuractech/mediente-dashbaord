import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Group,
  Stack,
  Select,
  TextInput,
  Text,
  Loader,
  Alert,
  Badge,
  Divider
} from '@mantine/core';
import { IconInfoCircle, IconCopy } from '@tabler/icons-react';
import { stepCopyService } from './projectTemplateService';
import type { TemplatePhase } from './template.type';

interface CopyStepModalProps {
  opened: boolean;
  onClose: () => void;
  sourceStepId: string;
  sourceStepName: string;
  templateId: string;
  currentPhaseId: string;
  onSuccess: () => void;
}

export function CopyStepModal({
  opened,
  onClose,
  sourceStepId,
  sourceStepName,
  templateId,
  currentPhaseId,
  onSuccess
}: CopyStepModalProps) {
  const [targetPhaseId, setTargetPhaseId] = useState<string>('');
  const [newStepName, setNewStepName] = useState<string>('');
  const [availablePhases, setAvailablePhases] = useState<TemplatePhase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available phases
  useEffect(() => {
    if (!opened) return;

    const loadPhases = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load available target phases (excluding current phase)
        const phases = await stepCopyService.getAvailableTargetPhases(templateId, currentPhaseId);
        setAvailablePhases(phases);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load phases');
      } finally {
        setLoading(false);
      }
    };

    loadPhases();
  }, [opened, templateId, currentPhaseId]);

  // Set default step name when modal opens
  useEffect(() => {
    if (opened && !newStepName) {
      setNewStepName(`${sourceStepName} (Copy)`);
    }
  }, [opened, sourceStepName, newStepName]);

  const handleSubmit = async () => {
    if (!targetPhaseId || !newStepName.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await stepCopyService.copyStepToPhase(sourceStepId, targetPhaseId, newStepName.trim());
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to copy step');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      // Reset form
      setTargetPhaseId('');
      setNewStepName('');
      setError(null);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="sm">
          <IconCopy size={20} />
          <Text>Copy Step with All Tasks</Text>
        </Group>
      }
      size="md"
    >
      <Stack gap="md">
        <Alert icon={<IconInfoCircle size={16} />} color="blue">
          Copy the entire step "{sourceStepName}" with all its tasks to another phase. 
          All task relationships and properties will be preserved.
        </Alert>

        {error && (
          <Alert color="red">
            {error}
          </Alert>
        )}

        <Select
          label="Target Phase"
          placeholder="Select target phase"
          value={targetPhaseId}
          onChange={(value) => setTargetPhaseId(value || '')}
          data={availablePhases.map(phase => ({
            value: phase.phase_id,
            label: `${phase.phase_order}. ${phase.phase_name}`
          }))}
          searchable
          required
          disabled={loading}
        />

        <TextInput
          label="New Step Name"
          placeholder="Enter name for the copied step"
          value={newStepName}
          onChange={(event) => setNewStepName(event.currentTarget.value)}
          required
          disabled={loading}
        />

        {availablePhases.length === 0 && !loading && (
          <Alert color="yellow">
            No other phases available for copying. The step can only be copied to a different phase.
          </Alert>
        )}

        <Divider />

        <Group justify="flex-end">
          <Button variant="subtle" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !targetPhaseId || !newStepName.trim() || availablePhases.length === 0}
            leftSection={loading ? <Loader size={16} /> : <IconCopy size={16} />}
          >
            Copy Step
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
