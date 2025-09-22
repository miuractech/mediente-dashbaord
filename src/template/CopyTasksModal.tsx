import { useState, useEffect } from 'react';
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
  Divider
} from '@mantine/core';
import { IconInfoCircle, IconCopy } from '@tabler/icons-react';
import { taskCopyService, stepCopyService } from './projectTemplateService';
import type { PhaseStep } from './template.type';

interface CopyTasksModalProps {
  opened: boolean;
  onClose: () => void;
  sourceStepId: string;
  sourceStepName: string;
  templateId: string;
  onSuccess: () => void;
}

export function CopyTasksModal({
  opened,
  onClose,
  sourceStepId,
  sourceStepName,
  templateId,
  onSuccess
}: CopyTasksModalProps) {
  const [copyMode, setCopyMode] = useState<'existing' | 'new' | 'duplicate'>('duplicate');
  const [targetStepId, setTargetStepId] = useState<string>('');
  const [targetPhaseId, setTargetPhaseId] = useState<string>('');
  const [newStepName, setNewStepName] = useState<string>('');
  const [duplicateNameSuffix, setDuplicateNameSuffix] = useState<string>('Copy');
  const [availableSteps, setAvailableSteps] = useState<(PhaseStep & { phase_name: string; phase_order: number })[]>([]);
  const [availablePhases, setAvailablePhases] = useState<Array<{ value: string; label: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available steps and phases
  useEffect(() => {
    if (!opened || !templateId) return;

    const loadOptions = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load available target steps
        const steps = await stepCopyService.getAvailableTargetSteps(templateId);
        setAvailableSteps(steps);

        // Load available phases
        const phases = await stepCopyService.getAvailableTargetPhases(templateId);
        setAvailablePhases(phases.map(phase => ({
          value: phase.phase_id,
          label: `${phase.phase_order}. ${phase.phase_name}`
        })));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load options');
      } finally {
        setLoading(false);
      }
    };

    loadOptions();
  }, [opened, templateId, sourceStepId]);

  const handleSubmit = async () => {
    if (!copyMode) {
      setError('Please select a copy mode');
      return;
    }
    
    if (copyMode === 'existing' && !targetStepId) {
      setError('Please select a target step');
      return;
    }
    
    if (copyMode === 'new' && (!targetPhaseId || !newStepName.trim())) {
      setError('Please select a phase and enter a step name');
      return;
    }
    
    if (copyMode === 'duplicate' && !duplicateNameSuffix.trim()) {
      setError('Please enter a name suffix for the duplicated tasks');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (copyMode === 'duplicate') {
        // Duplicate tasks within the same step with custom suffix
        await taskCopyService.copyTasksToStep(sourceStepId, sourceStepId, duplicateNameSuffix.trim());
      } else if (copyMode === 'existing') {
        await taskCopyService.copyTasksToStep(sourceStepId, targetStepId);
      } else {
        await taskCopyService.copyTasksToNewStep(sourceStepId, targetPhaseId, newStepName.trim());
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to copy tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      // Reset form
      setCopyMode('duplicate');
      setTargetStepId('');
      setTargetPhaseId('');
      setNewStepName('');
      setDuplicateNameSuffix('Copy');
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
          <Text>Copy Tasks</Text>
        </Group>
      }
      size="md"
    >
      <Stack gap="md">
        <Alert icon={<IconInfoCircle size={16} />} color="blue">
          Copy all tasks from step "{sourceStepName}". You can duplicate tasks within the same step, 
          copy to existing steps, or create a new step. Parent-child relationships will be maintained.
        </Alert>

        {error && (
          <Alert color="red">
            {error}
          </Alert>
        )}

        <Select
          label="Copy Mode"
          value={copyMode}
          onChange={(value) => setCopyMode(value as 'existing' | 'new' | 'duplicate')}
          data={[
            { value: 'duplicate', label: 'Duplicate within same step' },
            { value: 'existing', label: 'Copy to existing step' },
            { value: 'new', label: 'Copy to new step' }
          ]}
          required
        />

        {copyMode === 'duplicate' && (
          <TextInput
            label="Name Suffix for Duplicated Tasks"
            placeholder="e.g., Copy, v2, Draft"
            value={duplicateNameSuffix}
            onChange={(event) => setDuplicateNameSuffix(event.currentTarget.value)}
            description="This will be added to each task name (e.g., 'Task Name (Copy)')"
            required
            disabled={loading}
          />
        )}

        {copyMode === 'existing' && (
          <Select
            label="Target Step"
            placeholder="Select target step"
            value={targetStepId}
            onChange={(value) => setTargetStepId(value || '')}
            data={availableSteps
              .filter(step => step.step_id !== sourceStepId) // Exclude current step
              .map(step => ({
                value: step.step_id,
                label: `${step.phase_name} → ${step.step_order}. ${step.step_name}`
              }))}
            searchable
            required
            disabled={loading}
          />
        )}

        {copyMode === 'new' && (
          <>
            <Select
              label="Target Phase"
              placeholder="Select target phase"
              value={targetPhaseId}
              onChange={(value) => setTargetPhaseId(value || '')}
              data={availablePhases}
              searchable
              required
              disabled={loading}
            />

            <TextInput
              label="New Step Name"
              placeholder="Enter name for the new step"
              value={newStepName}
              onChange={(event) => setNewStepName(event.currentTarget.value)}
              required
              disabled={loading}
            />
          </>
        )}

        <Divider />

        <Group justify="flex-end">
          <Button variant="subtle" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !copyMode || 
              (copyMode === 'existing' && !targetStepId) ||
              (copyMode === 'new' && (!targetPhaseId || !newStepName.trim())) ||
              (copyMode === 'duplicate' && !duplicateNameSuffix.trim())}
            leftSection={loading ? <Loader size={16} /> : <IconCopy size={16} />}
          >
            {copyMode === 'duplicate' ? 'Duplicate Tasks' : 'Copy Tasks'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
