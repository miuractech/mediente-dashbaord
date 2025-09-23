import type { TaskCategoryType } from "../template/template.type";

// Project status enum
export type ProjectStatusType = 'active' | 'completed' | 'archived';

// Task status enum (Jira-style)
export type TaskStatusType = 'pending' | 'ongoing' | 'completed' | 'escalated';

// Base project type
export interface Project {
  project_id: string;
  project_name: string;
  project_description: string | null;
  image_url: string | null;
  project_status: ProjectStatusType;
  project_start_date: string | null;
  project_end_date: string | null;
  template_id: string;
  template_snapshot: Record<string, unknown>;
  current_phase_id: string | null;
  current_step_id: string | null;
  is_archived: boolean;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// Project with statistics
export interface ProjectWithStats extends Project {
  // Template-based totals (complete project scope)
  total_tasks: number;
  total_estimated_days: number;
  
  // Current loaded task statistics (actual progress)
  loaded_tasks: number;
  completed_tasks: number;
  ongoing_tasks: number;
  pending_tasks: number;
  escalated_tasks: number;
  
  // Role statistics
  total_roles: number;
  filled_roles: number;
  unfilled_roles: number;
  
  // Progress calculation
  completion_percentage: number;
}

// Project role type
export interface ProjectRole {
  project_role_id: string;
  project_id: string;
  role_id: string;
  role_name: string;
  department_name: string;
  is_filled: boolean;
  created_at: string;
  updated_at: string;
}

// Project crew assignment type
export interface ProjectCrewAssignment {
  assignment_id: string;
  project_id: string;
  project_role_id: string;
  crew_id: string;
  assigned_at: string;
  assigned_by: string;
}

// Crew type (simplified for project context)
export interface CrewMember {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  photo_url: string | null;
  status: boolean;
  is_archived: boolean;
}

// Project crew assignment with details
export interface ProjectCrewAssignmentWithDetails extends ProjectCrewAssignment {
  crew: CrewMember;
  role: ProjectRole;
}

// Project task type
export interface ProjectTask {
  project_task_id: string;
  project_id: string;
  template_task_id: string | null;
  task_name: string;
  task_description: string | null;
  phase_name: string;
  phase_order: number;
  step_name: string;
  step_order: number;
  task_order: number;
  estimated_days: number | null;
  actual_days: number;
  parent_task_id: string | null;
  task_status: TaskStatusType;
  category: TaskCategoryType | null;
  checklist_items: Array<{ id: string; text: string; order: number; completed?: boolean }>;
  escalation_reason: string | null;
  escalated_at: string | null;
  is_manually_escalated: boolean;
  file_attachments: Array<{ 
    id: string; 
    file_url: string; 
    file_name: string; 
    file_size: number; 
    file_type: string; 
    uploaded_at: string; 
  }>;
  comments: Array<{ id: string; text: string; author: string; created_at: string }>;
  started_at: string | null;
  completed_at: string | null;
  deadline: string | null;
  is_loaded: boolean;
  is_custom: boolean;
  is_archived: boolean;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// Project task with assignments
export interface ProjectTaskWithAssignments extends ProjectTask {
  assigned_crew: Array<{
    crew_id: string;
    crew_name: string;
    crew_email: string;
    role_name: string;
    department_name: string;
  }>;
  projects?: {
    project_name: string;
  };
}

// Project task assignment type
export interface ProjectTaskAssignment {
  assignment_id: string;
  project_task_id: string;
  project_role_id: string;
  crew_id: string;
  assigned_at: string;
  assigned_by: string;
}

// Forms and input types
export interface CreateProjectInput {
  project_name: string;
  project_description?: string;
  image_url?: string;
  project_start_date?: string;
  template_id: string;
}

export interface UpdateProjectInput {
  project_name?: string;
  project_description?: string;
  image_url?: string | null;
  project_start_date?: string;
  project_end_date?: string;
  project_status?: ProjectStatusType;
}

export interface CreateCustomTaskInput {
  task_name: string;
  task_description?: string;
  estimated_days?: number;
  category?: TaskCategoryType;
  parent_task_id?: string;
  checklist_items?: Array<{ id: string; text: string; order: number }>;
}

export interface UpdateTaskInput {
  task_name?: string;
  task_description?: string;
  task_status?: TaskStatusType;
  estimated_days?: number;
  actual_days?: number;
  category?: TaskCategoryType;
  parent_task_id?: string | null;
  checklist_items?: Array<{ id: string; text: string; order: number; completed?: boolean }>;
  escalation_reason?: string | null;
  escalated_at?: string | null;
  is_manually_escalated?: boolean;
  started_at?: string | null;
  completed_at?: string | null;
  file_attachments?: Array<{ 
    id: string; 
    file_url: string; 
    file_name: string; 
    file_size: number; 
    file_type: string; 
    uploaded_at: string; 
  }>;
  comments?: Array<{ id: string; text: string; author: string; created_at: string }>;
}

export interface AssignCrewInput {
  project_id: string;
  role_id: string;
  crew_id: string;
}

export interface AssignTaskCrewInput {
  project_task_id: string;
  project_role_id: string;
  crew_id: string;
}

// Filter and query types
export interface ProjectFilters {
  status?: ProjectStatusType[];
  template_id?: string;
  created_by?: string;
  search?: string;
  start_date_from?: string;
  start_date_to?: string;
}

export interface TaskFilters {
  project_id: string;
  status?: TaskStatusType[];
  phase_order?: number;
  step_order?: number;
  category?: TaskCategoryType[];
  assigned_crew_id?: string;
  is_loaded?: boolean;
  is_custom?: boolean;
  search?: string;
}

// Statistics and analytics types
export interface ProjectStatistics {
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  archived_projects: number;
  total_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  escalated_tasks: number;
}

export interface TaskStatistics {
  total_tasks: number;
  pending_tasks: number;
  ongoing_tasks: number;
  completed_tasks: number;
  escalated_tasks: number;
  average_completion_time: number;
  tasks_by_phase: Array<{ phase_name: string; count: number }>;
  tasks_by_crew: Array<{ crew_name: string; count: number }>;
}

// Template selection types (for project creation)
export interface TemplateOption {
  template_id: string;
  template_name: string;
  description: string | null;
  phase_count: number;
  step_count: number;
  task_count: number;
  total_estimated_days: number;
  roles_involved: number;
}

// Re-export for backwards compatibility
export type ProjectType = Project;
