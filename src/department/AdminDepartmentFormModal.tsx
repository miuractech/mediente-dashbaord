/* eslint-disable @typescript-eslint/no-explicit-any */
import { Modal, TextInput, Textarea, Button, Group, Stack, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useEffect } from 'react';
import supabase from '../supabase';
import type { Department, DepartmentFormData } from './department.type';

interface AdminDepartmentFormModalProps {
  opened: boolean;
  onClose: () => void;
  department?: Department | null;
  onSuccess: () => void;
}

export function AdminDepartmentFormModal({
  opened,
  onClose,
  department,
  onSuccess,
}: AdminDepartmentFormModalProps) {
  const form = useForm<DepartmentFormData>({
    initialValues: {
      department_name: '',
      description: '',
    },
    validate: {
      department_name: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Department name is required';
        }
        if (value.length > 150) {
          return 'Department name must be 150 characters or less';
        }
        return null;
      },
      description: (value) => {
        if (value && value.length > 500) {
          return 'Description must be 500 characters or less';
        }
        return null;
      },
    },
  });

  const isEditing = !!department;

  useEffect(() => {
    if (department) {
      form.setValues({
        department_name: department.department_name,
        description: department.description || '',
      });
    } else {
      form.reset();
    }
  }, [department, opened]);

  const handleSubmit = async (values: DepartmentFormData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.email) {
        notifications.show({
          title: 'Error',
          message: 'User not authenticated',
          color: 'red',
        });
        return;
      }

      if (isEditing && department) {
        // Update existing department
        const { error } = await supabase
          .from('departments')
          .update({
            department_name: values.department_name.trim(),
            description: values.description?.trim() || null,
            updated_by: user.email,
          })
          .eq('department_id', department.department_id);

        if (error) throw error;

        notifications.show({
          title: 'Success',
          message: 'Department updated successfully',
          color: 'green',
        });
      } else {
        // Create new department
        const { error } = await supabase
          .from('departments')
          .insert({
            department_name: values.department_name.trim(),
            description: values.description?.trim() || null,
            created_by: user.email,
            updated_by: user.email,
          });

        if (error) throw error;

        notifications.show({
          title: 'Success',
          message: 'Department saved successfully',
          color: 'green',
        });
      }

      form.reset();
      onClose();
      onSuccess();
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'An error occurred while saving the department',
        color: 'red',
      });
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEditing ? 'Edit Department' : 'Add Department'}
      size="md"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          {isEditing && department && (
            <>
             
             
              
              <Group grow>
                <div>
                  <Text size="sm" fw={500}>Created By</Text>
                  <Text size="sm" c="dimmed">{department.created_by}</Text>
                </div>
                <div>
                  <Text size="sm" fw={500}>Updated By</Text>
                  <Text size="sm" c="dimmed">{department.updated_by || 'N/A'}</Text>
                </div>
              </Group>
            </>
          )}

          <TextInput
            label="Department Name"
            placeholder="Enter department name"
            required
            {...form.getInputProps('department_name')}
            maxLength={150}
          />

          <Textarea
            label="Description"
            placeholder="Enter department description (optional)"
            rows={4}
            {...form.getInputProps('description')}
            maxLength={500}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={form.submitting}>
              {isEditing ? 'Update' : 'Save'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
