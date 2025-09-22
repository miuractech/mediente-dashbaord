import { useState, useEffect } from 'react';
import { Modal, TextInput, Textarea, Button, Group, Stack, Autocomplete } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import type { roleType } from './roles.type';
import type { Department } from '../department/department.type';
import { roleService, type CreateRoleData, type UpdateRoleData } from './roleService';
import { useAuth } from '../auth/useAuth';

interface RoleFormModalProps {
  opened: boolean;
  onClose: () => void;
  role?: roleType;
  departments: Department[];
  availableReports: roleType[];
  onSuccess: () => void;
}

export function RoleFormModal({ opened, onClose, role, departments, availableReports, onSuccess }: RoleFormModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [departmentValue, setDepartmentValue] = useState('');
  const [reportsToValue, setReportsToValue] = useState('');

  const form = useForm({
    initialValues: {
      role_name: role?.name || '',
      description: role?.description || '',
      department_id: role?.department_id || '',
      reports_to: role?.reports_to || ''
    },
    validate: {
      role_name: (value) => (!value ? 'Role name is required' : null),
      department_id: (value) => (!value ? 'Department is required' : null)
    }
  });

  useEffect(() => {
    if (role) {
      form.setValues({
        role_name: role.name,
        description: role.description || '',
        department_id: role.department_id,
        reports_to: role.reports_to || ''
      });
      // Set display values for autocompletes
      const dept = departments.find(d => d.department_id === role.department_id);
      setDepartmentValue(dept?.department_name || '');
      
      const manager = availableReports.find(r => r.id === role.reports_to);
      setReportsToValue(manager?.name || '');
    } else {
      form.reset();
      setDepartmentValue('');
      setReportsToValue('');
    }
  }, [role, departments, availableReports]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (values: typeof form.values) => {
    if (!user) return;

    setLoading(true);
    try {
      if (role) {
        // Update existing role
        const updateData: UpdateRoleData = {
          role_name: values.role_name,
          description: values.description || undefined,
          reports_to: values.reports_to || undefined,
          updated_by: user.id
        };
        await roleService.updateRole(role.id, updateData);
        notifications.show({
          title: 'Success',
          message: 'Role updated successfully',
          color: 'green'
        });
      } else {
        // Create new role
        const createData: CreateRoleData = {
          role_name: values.role_name,
          description: values.description || undefined,
          department_id: values.department_id,
          reports_to: values.reports_to || undefined,
          created_by: user.id
        };
        await roleService.createRole(createData);
        notifications.show({
          title: 'Success',
          message: 'Role created successfully',
          color: 'green'
        });
      }
      onSuccess();
      onClose();
      form.reset();
      setDepartmentValue('');
      setReportsToValue('');
    } catch (error) {
      console.error('Error saving role:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to save role',
        color: 'red'
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter available reports to exclude current role and its subordinates
  const getFilteredReports = () => {
    if (!role) return availableReports;
    
    // Get all subordinate role IDs recursively
    const getSubordinates = (roleId: string, roles: roleType[]): string[] => {
      const subordinates: string[] = [];
      roles.forEach(r => {
        if (r.reports_to === roleId) {
          subordinates.push(r.id);
          subordinates.push(...getSubordinates(r.id, roles));
        }
      });
      return subordinates;
    };

    const subordinateIds = getSubordinates(role.id, availableReports);
    return availableReports.filter(r => 
      r.id !== role.id && 
      !subordinateIds.includes(r.id) &&
      r.department_id === form.values.department_id
    );
  };

  const filteredReports = getFilteredReports();

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={role ? 'Edit Role' : 'Create Role'}
      size="md"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            label="Role Name"
            placeholder="e.g., Production Manager, Camera Operator"
            required
            {...form.getInputProps('role_name')}
          />

          <Textarea
            label="Description"
            placeholder="Brief description of the role responsibilities"
            rows={3}
            {...form.getInputProps('description')}
          />

          <Autocomplete
            label="Department"
            placeholder="Search and select department"
            required
            disabled={!!role} // Don't allow changing department for existing roles
            data={departments.filter(dept => dept.department_id && dept.department_name).map(dept => dept.department_name)}
            value={departmentValue}
            onChange={(value) => {
              setDepartmentValue(value);
              const selectedDept = departments.find(d => d.department_name === value);
              form.setFieldValue('department_id', selectedDept?.department_id || '');
            }}
            error={form.errors.department_id}
          />

          <Autocomplete
            label="Reports To"
            placeholder="Search reporting manager (optional)"
            data={filteredReports.filter(r => r.id && r.name).map(r => r.name)}
            value={reportsToValue}
            onChange={(value) => {
              setReportsToValue(value);
              if (!value) {
                form.setFieldValue('reports_to', '');
                return;
              }
              const selectedRole = filteredReports.find(r => r.name === value);
              form.setFieldValue('reports_to', selectedRole?.id || '');
            }}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {role ? 'Update' : 'Create'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
