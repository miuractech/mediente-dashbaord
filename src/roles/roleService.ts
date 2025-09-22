
import supabase from '../supabase';
import type { roleType } from './roles.type';

export interface CreateRoleData {
  role_name: string;
  description?: string;
  department_id: string;
  reports_to?: string;
  created_by: string;
}

export interface UpdateRoleData {
  role_name?: string;
  description?: string;
  reports_to?: string;
  updated_by: string;
  is_archived?: boolean;
}

export interface RoleFilters {
  search?: string;
  department_id?: string;
  is_archived?: boolean;
}

export interface PaginatedRolesResponse {
  data: roleType[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const roleService = {
  // Get roles with pagination and filters
  async getRoles(
    page: number = 1,
    pageSize: number = 20,
    filters?: RoleFilters
  ): Promise<PaginatedRolesResponse> {
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('department_roles')
        .select(`
          role_id,
          role_name,
          description,
          department_id,
          reports_to,
          is_archived,
          created_by,
          updated_by,
          created_at,
          updated_at,
          departments!inner(department_name)
        `, { count: 'exact' })
        .eq('is_archived', filters?.is_archived ?? false)
        .order('role_name')
        .range(from, to);

      // Apply filters
      if (filters?.search) {
        const searchTerm = filters.search.trim();
        query = query.or(`role_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      if (filters?.department_id && filters.department_id !== 'all') {
        query = query.eq('department_id', filters.department_id);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching roles:', error);
        throw error;
      }

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / pageSize);

      const roles = data?.map(role => ({
        id: role.role_id,
        name: role.role_name,
        description: role.description,
        department_id: role.department_id,
        reports_to: role.reports_to,
        is_archived: role.is_archived,
        created_by: role.created_by,
        updated_by: role.updated_by,
        created_at: new Date(role.created_at),
        updated_at: role.updated_at ? new Date(role.updated_at) : undefined
      })) || [];

      return {
        data: roles,
        count: totalCount,
        page,
        pageSize,
        totalPages
      };
    } catch (error) {
      console.error('Error in getRoles:', error);
      throw error;
    }
  },

  // Get all roles for a department (non-paginated, for dropdowns)
  async getRolesByDepartment(departmentId: string): Promise<roleType[]> {
    const { data, error } = await supabase
      .from('department_roles')
      .select(`
        role_id,
        role_name,
        description,
        department_id,
        reports_to,
        is_archived,
        created_by,
        updated_by,
        created_at,
        updated_at
      `)
      .eq('department_id', departmentId)
      .eq('is_archived', false)
      .order('role_name');

    if (error) {
      console.error('Error fetching roles:', error);
      throw error;
    }

    return data?.map(role => ({
      id: role.role_id,
      name: role.role_name,
      description: role.description,
      department_id: role.department_id,
      reports_to: role.reports_to,
      is_archived: role.is_archived,
      created_by: role.created_by,
      updated_by: role.updated_by,
      created_at: new Date(role.created_at),
      updated_at: role.updated_at ? new Date(role.updated_at) : undefined
    })) || [];
  },

  // Get all roles (for reporting hierarchy, non-paginated)
  async getAllRoles(): Promise<roleType[]> {
    const { data, error } = await supabase
      .from('department_roles')
      .select(`
        role_id,
        role_name,
        description,
        department_id,
        reports_to,
        is_archived,
        created_by,
        updated_by,
        created_at,
        updated_at,
        departments!inner(department_name)
      `)
      .eq('is_archived', false)
      .order('role_name')
      .limit(1000); // Reasonable limit for hierarchy building

    if (error) {
      console.error('Error fetching all roles:', error);
      throw error;
    }

    return data?.map(role => ({
      id: role.role_id,
      name: role.role_name,
      description: role.description,
      department_id: role.department_id,
      reports_to: role.reports_to,
      is_archived: role.is_archived,
      created_by: role.created_by,
      updated_by: role.updated_by,
      created_at: new Date(role.created_at),
      updated_at: role.updated_at ? new Date(role.updated_at) : undefined
    })) || [];
  },

  // Get role hierarchy for a department
  async getRoleHierarchy(departmentId: string): Promise<roleType[]> {
    const roles = await this.getRolesByDepartment(departmentId);
    
    // Build manages relationships
    const roleMap = new Map<string, roleType>();
    roles.forEach(role => {
      roleMap.set(role.id, { ...role, manages: [] });
    });

    roleMap.forEach(role => {
      if (role.reports_to && roleMap.has(role.reports_to)) {
        const manager = roleMap.get(role.reports_to)!;
        if (!manager.manages) manager.manages = [];
        manager.manages.push(role.id);
      }
    });

    return Array.from(roleMap.values());
  },

  // Create a new role
  async createRole(roleData: CreateRoleData): Promise<roleType> {
    const { data, error } = await supabase
      .from('department_roles')
      .insert({
        role_name: roleData.role_name,
        description: roleData.description,
        department_id: roleData.department_id,
        reports_to: roleData.reports_to,
        created_by: roleData.created_by,
        updated_by: roleData.created_by
      })
      .select(`
        role_id,
        role_name,
        description,
        department_id,
        reports_to,
        is_archived,
        created_by,
        updated_by,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      console.error('Error creating role:', error);
      throw error;
    }

    return {
      id: data.role_id,
      name: data.role_name,
      description: data.description,
      department_id: data.department_id,
      reports_to: data.reports_to,
      is_archived: data.is_archived,
      created_by: data.created_by,
      updated_by: data.updated_by,
      created_at: new Date(data.created_at),
      updated_at: data.updated_at ? new Date(data.updated_at) : undefined
    };
  },

  // Update a role
  async updateRole(roleId: string, updateData: UpdateRoleData): Promise<roleType> {
    const { data, error } = await supabase
      .from('department_roles')
      .update({
        role_name: updateData.role_name,
        description: updateData.description,
        reports_to: updateData.reports_to,
        updated_by: updateData.updated_by,
        is_archived: updateData.is_archived
      })
      .eq('role_id', roleId)
      .select(`
        role_id,
        role_name,
        description,
        department_id,
        reports_to,
        is_archived,
        created_by,
        updated_by,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      console.error('Error updating role:', error);
      throw error;
    }

    return {
      id: data.role_id,
      name: data.role_name,
      description: data.description,
      department_id: data.department_id,
      reports_to: data.reports_to,
      is_archived: data.is_archived,
      created_by: data.created_by,
      updated_by: data.updated_by,
      created_at: new Date(data.created_at),
      updated_at: data.updated_at ? new Date(data.updated_at) : undefined
    };
  },

  // Archive a role
  async archiveRole(roleId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('department_roles')
      .update({
        is_archived: true,
        updated_by: userId
      })
      .eq('role_id', roleId);

    if (error) {
      console.error('Error archiving role:', error);
      throw error;
    }
  },

  // Restore an archived role
  async restoreRole(roleId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('department_roles')
      .update({
        is_archived: false,
        updated_by: userId
      })
      .eq('role_id', roleId);

    if (error) {
      console.error('Error restoring role:', error);
      throw error;
    }
  },

  // Deprecated: Use getRoles with filters instead
  // Get all archived roles
  async getArchivedRoles(): Promise<roleType[]> {
    const response = await this.getRoles(1, 1000, { is_archived: true });
    return response.data;
  },

  // Deprecated: Use getRoles with filters instead
  // Get archived roles for a specific department
  async getArchivedRolesByDepartment(departmentId: string): Promise<roleType[]> {
    const response = await this.getRoles(1, 1000, { 
      is_archived: true, 
      department_id: departmentId 
    });
    return response.data;
  },

  // Delete a role (permanent)
  async deleteRole(roleId: string): Promise<void> {
    const { error } = await supabase
      .from('department_roles')
      .delete()
      .eq('role_id', roleId);

    if (error) {
      console.error('Error deleting role:', error);
      throw error;
    }
  }
};
