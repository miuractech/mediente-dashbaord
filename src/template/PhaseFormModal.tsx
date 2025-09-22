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
import type { TemplatePhase, CreateTemplatePhaseRequest, UpdateTemplatePhaseRequest } from './template.type';
import { templatePhaseService } from './projectTemplateService';

interface PhaseFormModalProps {
  opened: boolean;
  onClose: () => void;
  templateId: string;
  phase?: TemplatePhase;
  onSuccess: () => void;
}

export default function PhaseFormModal({ 
  opened, 
  onClose, 
  templateId,
  phase, 
  onSuccess 
}: PhaseFormModalProps) {
  const [formData, setFormData] = useState({
    phase_name: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);

  const isEditing = !!phase;

  useEffect(() => {
    if (phase) {
      setFormData({
        phase_name: phase.phase_name,
        description: phase.description || ''
      });
    } else {
      setFormData({
        phase_name: '',
        description: ''
      });
    }
  }, [phase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.phase_name.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Phase name is required',
        color: 'red'
      });
      return;
    }

    setLoading(true);

    try {
      if (isEditing && phase) {
        const updateData: UpdateTemplatePhaseRequest = {
          phase_name: formData.phase_name.trim(),
          description: formData.description.trim() || undefined
        };
        
        await templatePhaseService.update(phase.phase_id, updateData);
        notifications.show({
          title: 'Success',
          message: 'Phase updated successfully',
          color: 'green'
        });
      } else {
        const createData: CreateTemplatePhaseRequest = {
          template_id: templateId,
          phase_name: formData.phase_name.trim(),
          description: formData.description.trim() || undefined
        };
        
        await templatePhaseService.create(createData);
        notifications.show({
          title: 'Success',
          message: 'Phase created successfully',
          color: 'green'
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving phase:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to save phase',
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
          {isEditing ? 'Edit Phase' : 'Create New Phase'}
        </Title>
      }
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <Stack>
          <TextInput
            label="Phase Name"
            placeholder="Enter phase name"
            value={formData.phase_name}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              phase_name: e.target.value 
            }))}
            required
            maxLength={200}
          />

          <Textarea
            label="Description"
            placeholder="Enter phase description (optional)"
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
