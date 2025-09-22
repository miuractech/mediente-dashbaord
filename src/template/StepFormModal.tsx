import React, { useState, useEffect } from 'react';
import {
  Modal,
  TextInput,
  Textarea,
  Button,
  Group,
  Stack,
  Title
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import type { PhaseStep, CreatePhaseStepRequest, UpdatePhaseStepRequest } from './template.type';
import { phaseStepService } from './projectTemplateService';

interface StepFormModalProps {
  opened: boolean;
  onClose: () => void;
  phaseId: string;
  step?: PhaseStep;
  onSuccess: () => void;
}

export default function StepFormModal({ 
  opened, 
  onClose, 
  phaseId,
  step, 
  onSuccess 
}: StepFormModalProps) {
  const [formData, setFormData] = useState({
    step_name: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);

  const isEditing = !!step;

  useEffect(() => {
    if (step) {
      setFormData({
        step_name: step.step_name,
        description: step.description || ''
      });
    } else {
      setFormData({
        step_name: '',
        description: ''
      });
    }
  }, [step]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.step_name.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Step name is required',
        color: 'red'
      });
      return;
    }

    setLoading(true);

    try {
      if (isEditing && step) {
        const updateData: UpdatePhaseStepRequest = {
          step_name: formData.step_name.trim(),
          description: formData.description.trim() || undefined
        };
        
        await phaseStepService.update(step.step_id, updateData);
        notifications.show({
          title: 'Success',
          message: 'Step updated successfully',
          color: 'green'
        });
      } else {
        const createData: CreatePhaseStepRequest = {
          phase_id: phaseId,
          step_name: formData.step_name.trim(),
          description: formData.description.trim() || undefined
        };
        
        await phaseStepService.create(createData);
        notifications.show({
          title: 'Success',
          message: 'Step created successfully',
          color: 'green'
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving step:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to save step',
        color: 'red'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal 
      opened={opened} 
      onClose={onClose}
      title={
        <Title order={3}>
          {isEditing ? 'Edit Step' : 'Create New Step'}
        </Title>
      }
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <Stack>
          <TextInput
            label="Step Name"
            placeholder="Enter step name"
            value={formData.step_name}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              step_name: e.target.value 
            }))}
            required
            maxLength={200}
          />

          <Textarea
            label="Description"
            placeholder="Enter step description (optional)"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              description: e.target.value 
            }))}
            minRows={3}
            maxRows={6}
            maxLength={1000}
          />



          <Group justify="flex-end">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
