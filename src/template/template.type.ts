export interface ProjectTemplate {
    template_id: string;
    template_name: string;
    description?: string;
    is_archived: boolean;
    created_by: string;
    updated_by?: string;
    created_at: string;
    updated_at: string;
  }
  
  export interface TemplatePhase {
    phase_id: string;
    template_id: string;
    phase_name: string;
    description?: string;
    phase_order: number;
    is_archived: boolean;
    created_by: string;
    updated_by?: string;
    created_at: string;
    updated_at: string;
  }
  
  export interface PhaseStep {
    step_id: string;
    phase_id: string;
    step_name: string;
    description?: string;
    step_order: number;
    is_archived: boolean;
    created_by: string;
    updated_by?: string;
    created_at: string;
    updated_at: string;
  }
  
  export type TaskCategoryType = "monitor" | "coordinate" | "execute";
  
  export interface ChecklistItem {
    id: string;
    text: string;
    order: number;
  }
  
  export interface StepTask {
    task_id: string;
    step_id: string;
    task_name: string;
    description?: string;
    task_order: number;
    estimated_days?: number;
    assigned_role_id?: string;
    category?: TaskCategoryType;
    checklist_items?: ChecklistItem[];
    is_archived: boolean;
    created_by: string;
    updated_by?: string;
    created_at: string;
    updated_at: string;
    parent_task_id?: string;
  }
  
  // Form interfaces for creating/updating
  export interface CreateProjectTemplateRequest {
    template_name: string;
    description?: string;
  }
  
  export interface UpdateProjectTemplateRequest {
    template_name?: string;
    description?: string;
    is_archived?: boolean;
  }
  
  export interface CreateTemplatePhaseRequest {
    template_id: string;
    phase_name: string;
    description?: string;
    phase_order?: number;
  }
  
  export interface UpdateTemplatePhaseRequest {
    phase_name?: string;
    description?: string;
    phase_order?: number;
    is_archived?: boolean;
  }
  
  export interface CreatePhaseStepRequest {
    phase_id: string;
    step_name: string;
    description?: string;
    step_order?: number;
  }
  
  export interface UpdatePhaseStepRequest {
    step_name?: string;
    description?: string;
    step_order?: number;
    is_archived?: boolean;
  }
  
  export interface CreateStepTaskRequest {
    step_id: string;
    task_name: string;
    description?: string;
    task_order?: number;
    estimated_days?: number;
    assigned_role_id?: string;
    parent_task_id?: string;
    category?: TaskCategoryType;
    checklist_items?: ChecklistItem[];
  }
  
  export interface UpdateStepTaskRequest {
    task_name?: string;
    description?: string;
    step_id?: string; // Allow updating which step the task belongs to
    task_order?: number;
    estimated_days?: number;
    assigned_role_id?: string;
    parent_task_id?: string;
    category?: TaskCategoryType;
    checklist_items?: ChecklistItem[];
    is_archived?: boolean;
  }
  
  // Navigation breadcrumb type
  export interface TemplateBreadcrumb {
    type: 'template' | 'phase' | 'step' | 'task';
    id: string;
    name: string;
  }
  
  // Pagination and filtering types
  export interface PaginationParams {
    page?: number;
    pageSize?: number;
  }
  
  export interface TemplateFilters {
    search?: string;
    created_by?: string;
    is_archived?: boolean;
  }
  
  export interface PhaseFilters {
    search?: string;
    template_id?: string;
    is_archived?: boolean;
  }
  
  export interface StepFilters {
    search?: string;
    phase_id?: string;
    is_archived?: boolean;
  }
  
  export interface TaskFilters {
    search?: string;
    step_id?: string;
    assigned_role_id?: string;
    parent_task_id?: string;
    category?: TaskCategoryType;
    is_archived?: boolean;
  }
  
  export interface PaginatedResponse<T> {
    data: T[];
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }
  
  export type PaginatedTemplatesResponse = PaginatedResponse<ProjectTemplate>;
  export type PaginatedPhasesResponse = PaginatedResponse<TemplatePhase>;
  export type PaginatedStepsResponse = PaginatedResponse<PhaseStep>;
  export type PaginatedTasksResponse = PaginatedResponse<StepTask>;
  
// Role type for template system (simplified from roleType)
export interface TemplateRole {
  role_id: string;
  role_name: string;
  department_name?: string;
  is_archived: boolean;
}

// Template role usage tracking
export interface TemplateRoleUsage {
  template_role_id: string;
  template_id: string;
  role_id: string;
  role_name: string;
  department_name?: string;
  role_usage_count: number;
  first_used_at: string;
  last_used_at: string;
}
  