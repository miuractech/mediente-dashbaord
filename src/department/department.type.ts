export type Department = {
  department_id: string;
  department_name: string;
  description?: string;
  is_archived: boolean;
  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
};

export type DepartmentFormData = {
  department_name: string;
  description?: string;
};
