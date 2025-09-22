import supabase from '../supabase';
import type { Department, DepartmentFormData } from './department.type';

export interface DepartmentFilters {
  isArchived?: boolean;
  searchQuery?: string;
  page?: number;
  itemsPerPage?: number;
}

export interface PaginatedDepartments {
  data: Department[];
  totalCount: number;
  totalPages: number;
}

export class DepartmentService {
  static async getDepartments(filters: DepartmentFilters = {}): Promise<PaginatedDepartments> {
    const {
      isArchived = false,
      searchQuery = '',
      page = 1,
      itemsPerPage = 10,
    } = filters;

    let query = supabase
      .from('departments')
      .select('*', { count: 'exact' })
      .eq('is_archived', isArchived)
      .order('created_at', { ascending: false });

    if (searchQuery) {
      query = query.ilike('department_name', `%${searchQuery}%`);
    }

    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage - 1;
    query = query.range(startIndex, endIndex);

    const { data, count, error } = await query;

    if (error) throw error;

    return {
      data: data || [],
      totalCount: count || 0,
      totalPages: Math.ceil((count || 0) / itemsPerPage),
    };
  }

  static async createDepartment(
    departmentData: DepartmentFormData,
    userEmail: string
  ): Promise<Department> {
    const { data, error } = await supabase
      .from('departments')
      .insert({
        department_name: departmentData.department_name.trim(),
        description: departmentData.description?.trim() || null,
        created_by: userEmail,
        updated_by: userEmail,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateDepartment(
    departmentId: string,
    departmentData: DepartmentFormData,
    userEmail: string
  ): Promise<Department> {
    const { data, error } = await supabase
      .from('departments')
      .update({
        department_name: departmentData.department_name.trim(),
        description: departmentData.description?.trim() || null,
        updated_by: userEmail,
      })
      .eq('department_id', departmentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async toggleArchiveStatus(
    departmentId: string,
    isArchived: boolean,
    userEmail: string
  ): Promise<Department> {
    const { data, error } = await supabase
      .from('departments')
      .update({
        is_archived: !isArchived,
        updated_by: userEmail,
      })
      .eq('department_id', departmentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteDepartment(departmentId: string): Promise<void> {
    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('department_id', departmentId);

    if (error) throw error;
  }

  static async getDepartmentById(departmentId: string): Promise<Department | null> {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('department_id', departmentId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return data;
  }
}
