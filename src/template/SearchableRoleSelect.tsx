import React, { useState, useEffect, useCallback } from 'react';
import { Select, Loader } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { optimizedRoleSearchService } from './projectTemplateService';
import type { TemplateRole } from './template.type';

interface SearchableRoleSelectProps {
  value?: string | null;
  onChange: (value: string | null) => void;
  label?: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  error?: string;
}

export function SearchableRoleSelect({
  value,
  onChange,
  label = "Assigned Role",
  placeholder = "Search and select a role",
  description,
  required = false,
  clearable = true,
  disabled = false,
  error
}: SearchableRoleSelectProps) {
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch] = useDebouncedValue(searchValue, 300);
  const [roles, setRoles] = useState<TemplateRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<TemplateRole | null>(null);

  // Load initial roles or search results
  const loadRoles = useCallback(async (search: string = '') => {
    try {
      setLoading(true);
      const rolesData = await optimizedRoleSearchService.searchRoles(search, 10);
      setRoles(rolesData);
    } catch (error) {
      console.error('Error loading roles:', error);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load selected role details when value changes
  useEffect(() => {
    const loadSelectedRole = async () => {
      if (value && !selectedRole) {
        try {
          const role = await optimizedRoleSearchService.getRoleById(value);
          setSelectedRole(role);
        } catch (error) {
          console.error('Error loading selected role:', error);
        }
      } else if (!value) {
        setSelectedRole(null);
      }
    };

    loadSelectedRole();
  }, [value, selectedRole]);

  // Load roles when search changes
  useEffect(() => {
    loadRoles(debouncedSearch);
  }, [debouncedSearch, loadRoles]);

  // Create options for Select component
  const roleOptions = roles.map(role => ({
    value: role.role_id,
    label: `${role.role_name} (${role.department_name || 'No Department'})`
  }));

  // Add current selected role to options if not already present
  if (selectedRole && !roles.find(r => r.role_id === selectedRole.role_id)) {
    roleOptions.unshift({
      value: selectedRole.role_id,
      label: `${selectedRole.role_name} (${selectedRole.department_name || 'No Department'})`
    });
  }

  return (
    <Select
      label={label}
      placeholder={placeholder}
      description={description}
      required={required}
      value={value}
      onChange={onChange}
      data={roleOptions}
      searchable
      clearable={clearable}
      disabled={disabled}
      error={error}
      onSearchChange={setSearchValue}
      searchValue={searchValue}
      rightSection={loading ? <Loader size={16} /> : undefined}
      nothingFoundMessage={
        searchValue.trim() 
          ? "No roles found matching your search" 
          : "Start typing to search roles"
      }
      maxDropdownHeight={300}
      limit={10}
    />
  );
}
