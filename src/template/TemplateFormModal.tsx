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
import type { ProjectTemplate, CreateProjectTemplateRequest, UpdateProjectTemplateRequest } from './template.type';
import { projectTemplateService } from './projectTemplateService';

interface TemplateFormModalProps {
  opened: boolean;
  onClose: () => void;
  template?: ProjectTemplate;
  onSuccess: () => void;
}

export default function TemplateFormModal({ 
  opened, 
  onClose, 
  template, 
  onSuccess 
}: TemplateFormModalProps) {
  const [formData, setFormData] = useState({
    template_name: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);

  const isEditing = !!template;

  useEffect(() => {
    if (template) {
      setFormData({
        template_name: template.template_name,
        description: template.description || ''
      });
    } else {
      setFormData({
        template_name: '',
        description: ''
      });
    }
  }, [template]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.template_name.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Template name is required',
        color: 'red'
      });
      return;
    }

    setLoading(true);

    try {
      if (isEditing && template) {
        const updateData: UpdateProjectTemplateRequest = {
          template_name: formData.template_name.trim(),
          description: formData.description.trim() || undefined
        };
        
        await projectTemplateService.update(template.template_id, updateData);
        notifications.show({
          title: 'Success',
          message: 'Template updated successfully',
          color: 'green'
        });
      } else {
        const createData: CreateProjectTemplateRequest = {
          template_name: formData.template_name.trim(),
          description: formData.description.trim() || undefined
        };
        
        await projectTemplateService.create(createData);
        notifications.show({
          title: 'Success',
          message: 'Template created successfully',
          color: 'green'
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving template:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to save template',
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
          {isEditing ? 'Edit Template' : 'Create New Template'}
        </Title>
      }
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <Stack>
          <TextInput
            label="Template Name"
            placeholder="Enter template name"
            value={formData.template_name}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              template_name: e.target.value 
            }))}
            required
            maxLength={200}
          />

          <Textarea
            label="Description"
            placeholder="Enter template description (optional)"
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
