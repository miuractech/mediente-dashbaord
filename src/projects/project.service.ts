import supabase from '../supabase';
import type {
  Project,
  ProjectWithStats,
  ProjectTask,
  ProjectTaskWithAssignments,
  ProjectRole,
  ProjectCrewAssignment,
  ProjectCrewAssignmentWithDetails,
  CreateProjectInput,
  UpdateProjectInput,
  CreateCustomTaskInput,
  UpdateTaskInput,
  AssignCrewInput,
  AssignTaskCrewInput,
  ProjectFilters,
  TaskFilters,
  TemplateOption,
  CrewMember,
  ProjectStatusType,
  ProjectStatistics,
} from './project.typs';

class ProjectService {
  // =====================================================
  // PROJECT CRUD OPERATIONS
  // =====================================================

  async createProject(input: CreateProjectInput, createdBy: string): Promise<Project> {
    const { data, error } = await supabase.rpc('create_project_from_template', {
      p_project_name: input.project_name,
      p_description: input.project_description || null,
      p_image_url: input.image_url || null,
      p_start_date: input.project_start_date || null,
      p_template_id: input.template_id,
      p_created_by: createdBy,
    });

    if (error) throw new Error(`Failed to create project: ${error.message}`);

    // Fetch the created project
    const project = await this.getProjectById(data);
    if (!project) throw new Error('Failed to fetch created project');

    return project;
  }

  async getProjects(filters?: ProjectFilters): Promise<ProjectWithStats[]> {
    let query = supabase
      .from('projects_with_template_stats')
      .select('*')
      .order('created_at', { ascending: false });

    // Handle archived status filtering
    if (filters?.status) {
      if (filters.status.includes('archived')) {
        // If archived is included, show archived projects
        if (filters.status.length === 1 && filters.status[0] === 'archived') {
          // Show only archived projects
          query = query.eq('is_archived', true);
        } else {
          // Show both archived and non-archived based on status
          query = query.in('project_status', filters.status);
        }
      } else {
        // Show only non-archived projects with specified status
        query = query.eq('is_archived', false).in('project_status', filters.status);
      }
    } else {
      // Default: show only non-archived projects
      query = query.eq('is_archived', false);
    }

    if (filters) {
      if (filters.template_id) {
        query = query.eq('template_id', filters.template_id);
      }
      if (filters.created_by) {
        query = query.eq('created_by', filters.created_by);
      }
      if (filters.start_date_from) {
        query = query.gte('project_start_date', filters.start_date_from);
      }
      if (filters.start_date_to) {
        query = query.lte('project_start_date', filters.start_date_to);
      }
      if (filters.search) {
        query = query.or(`project_name.ilike.%${filters.search}%,project_description.ilike.%${filters.search}%`);
      }
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch projects: ${error.message}`);

    return data || [];
  }

  async getProjectById(projectId: string): Promise<Project | null> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_archived', false)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch project: ${error.message}`);
    }

    return data;
  }

  async getProjectWithStats(projectId: string): Promise<ProjectWithStats | null> {
    const { data, error } = await supabase
      .from('projects_with_template_stats')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_archived', false)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch project with stats: ${error.message}`);
    }

    return data;
  }

  // =====================================================
  // DASHBOARD ANALYTICS OPERATIONS
  // =====================================================

  async getDashboardAnalytics(): Promise<ProjectStatistics> {
    const { data, error } = await supabase
      .from('projects_with_template_stats')
      .select(`
        project_status,
        total_tasks,
        completed_tasks,
        escalated_tasks
      `)
      .eq('is_archived', false);

    if (error) {
      throw new Error(`Failed to fetch dashboard analytics: ${error.message}`);
    }

    const stats: ProjectStatistics = {
      total_projects: data.length,
      active_projects: data.filter(p => p.project_status === 'active').length,
      completed_projects: data.filter(p => p.project_status === 'completed').length,
      archived_projects: 0, // Not including archived in query
      total_tasks: data.reduce((sum, p) => sum + (p.total_tasks || 0), 0),
      completed_tasks: data.reduce((sum, p) => sum + (p.completed_tasks || 0), 0),
      overdue_tasks: 0, // Will be calculated separately
      escalated_tasks: data.reduce((sum, p) => sum + (p.escalated_tasks || 0), 0),
    };

    return stats;
  }

  async getActiveProjects(): Promise<ProjectWithStats[]> {
    const { data, error } = await supabase
      .from('projects_with_template_stats')
      .select('*')
      .eq('project_status', 'active')
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch active projects: ${error.message}`);
    }

    return data || [];
  }

  async getProjectEscalatedTasks(projectId: string): Promise<ProjectTaskWithAssignments[]> {
    const { data, error } = await supabase
      .from('project_tasks_with_assignments')
      .select('*')
      .eq('project_id', projectId)
      .eq('task_status', 'escalated')
      .eq('is_archived', false)
      .order('escalated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch escalated tasks: ${error.message}`);
    }

    return data || [];
  }

  async getProjectPhaseProgress(projectId: string): Promise<Array<{
    phase_name: string;
    phase_order: number;
    total_tasks: number;
    completed_tasks: number;
    ongoing_tasks: number;
    pending_tasks: number;
    escalated_tasks: number;
  }>> {
    const { data, error } = await supabase
      .from('project_tasks')
      .select(`
        phase_name,
        phase_order,
        task_status
      `)
      .eq('project_id', projectId)
      .eq('is_loaded', true)
      .eq('is_archived', false)
      .order('phase_order');

    if (error) {
      throw new Error(`Failed to fetch phase progress: ${error.message}`);
    }

    // Group by phase and calculate stats
    const phaseMap = new Map<string, {
      phase_name: string;
      phase_order: number;
      total_tasks: number;
      completed_tasks: number;
      ongoing_tasks: number;
      pending_tasks: number;
      escalated_tasks: number;
    }>();

    data?.forEach(task => {
      const key = `${task.phase_order}-${task.phase_name}`;
      if (!phaseMap.has(key)) {
        phaseMap.set(key, {
          phase_name: task.phase_name,
          phase_order: task.phase_order,
          total_tasks: 0,
          completed_tasks: 0,
          ongoing_tasks: 0,
          pending_tasks: 0,
          escalated_tasks: 0,
        });
      }

      const phase = phaseMap.get(key)!;
      phase.total_tasks++;
      
      switch (task.task_status) {
        case 'completed':
          phase.completed_tasks++;
          break;
        case 'ongoing':
          phase.ongoing_tasks++;
          break;
        case 'pending':
          phase.pending_tasks++;
          break;
        case 'escalated':
          phase.escalated_tasks++;
          break;
      }
    });

    return Array.from(phaseMap.values()).sort((a, b) => a.phase_order - b.phase_order);
  }

  async updateProject(projectId: string, input: UpdateProjectInput, updatedBy: string): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .update({
        ...input,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      })
      .eq('project_id', projectId)
      .eq('is_archived', false)
      .select()
      .single();

    if (error) throw new Error(`Failed to update project: ${error.message}`);
    return data;
  }

  async archiveProject(projectId: string, updatedBy: string): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .update({
        is_archived: true,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      })
      .eq('project_id', projectId);

    if (error) throw new Error(`Failed to archive project: ${error.message}`);
  }

  // =====================================================
  // PROJECT ROLE MANAGEMENT
  // =====================================================

  async getProjectRoles(projectId: string): Promise<ProjectRole[]> {
    const { data, error } = await supabase
      .from('project_roles')
      .select('*')
      .eq('project_id', projectId)
      .order('department_name', { ascending: true })
      .order('role_name', { ascending: true });

    if (error) throw new Error(`Failed to fetch project roles: ${error.message}`);
    return data || [];
  }

  async assignCrewToRole(input: AssignCrewInput, assignedBy: string): Promise<ProjectCrewAssignment> {
    const { error } = await supabase.rpc('assign_crew_to_project_role', {
      p_project_id: input.project_id,
      p_role_id: input.role_id,
      p_crew_id: input.crew_id,
      p_assigned_by: assignedBy,
    });

    if (error) throw new Error(`Failed to assign crew to role: ${error.message}`);

    // Fetch the created assignment
    const { data: assignment, error: fetchError } = await supabase
      .from('project_crew_assignments')
      .select('*')
      .eq('project_id', input.project_id)
      .eq('crew_id', input.crew_id)
      .order('assigned_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError) throw new Error(`Failed to fetch assignment: ${fetchError.message}`);
    return assignment;
  }

  async getProjectCrewAssignments(projectId: string): Promise<ProjectCrewAssignmentWithDetails[]> {
    const { data, error } = await supabase
      .from('project_crew_assignments')
      .select(`
        *,
        crew:crew(id, name, email, phone, photo_url, status, is_archived),
        role:project_roles(*)
      `)
      .eq('project_id', projectId);

    if (error) throw new Error(`Failed to fetch crew assignments: ${error.message}`);
    return data || [];
  }

  async removeCrewFromProject(assignmentId: string): Promise<void> {
    const { error } = await supabase
      .from('project_crew_assignments')
      .delete()
      .eq('assignment_id', assignmentId);

    if (error) throw new Error(`Failed to remove crew assignment: ${error.message}`);
  }

  async canProjectStart(projectId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('can_project_start', {
      p_project_id: projectId,
    });

    if (error) throw new Error(`Failed to check if project can start: ${error.message}`);
    return data;
  }

  // =====================================================
  // TASK MANAGEMENT
  // =====================================================

  async getProjectTasks(filters: TaskFilters): Promise<ProjectTaskWithAssignments[]> {
    let query = supabase
      .from('project_tasks_with_assignments')
      .select('*')
      .eq('project_id', filters.project_id)
      .eq('is_archived', false)
      .order('phase_order', { ascending: true })
      .order('step_order', { ascending: true })
      .order('task_order', { ascending: true });

    if (filters.status) {
      query = query.in('task_status', filters.status);
    }
    if (filters.phase_order !== undefined) {
      query = query.eq('phase_order', filters.phase_order);
    }
    if (filters.step_order !== undefined) {
      query = query.eq('step_order', filters.step_order);
    }
    if (filters.category) {
      query = query.in('category', filters.category);
    }
    if (filters.is_loaded !== undefined) {
      query = query.eq('is_loaded', filters.is_loaded);
    }
    if (filters.is_custom !== undefined) {
      query = query.eq('is_custom', filters.is_custom);
    }
    if (filters.search) {
      query = query.or(`task_name.ilike.%${filters.search}%,task_description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch project tasks: ${error.message}`);

    return data || [];
  }

  async getPaginatedProjectTasks(
    filters: TaskFilters,
    page = 1,
    limit = 20
  ): Promise<{
    tasks: ProjectTaskWithAssignments[];
    totalCount: number;
    hasNextPage: boolean;
  }> {
    // Build the base query for counting
    let countQuery = supabase
      .from('project_tasks_with_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', filters.project_id)
      .eq('is_archived', false);

    // Build the data query
    let dataQuery = supabase
      .from('project_tasks_with_assignments')
      .select('*')
      .eq('project_id', filters.project_id)
      .eq('is_archived', false)
      .order('phase_order', { ascending: true })
      .order('step_order', { ascending: true })
      .order('task_order', { ascending: true })
      .range((page - 1) * limit, page * limit - 1);

    // Apply filters to both queries
    if (filters.status) {
      countQuery = countQuery.in('task_status', filters.status);
      dataQuery = dataQuery.in('task_status', filters.status);
    }
    if (filters.phase_order !== undefined) {
      countQuery = countQuery.eq('phase_order', filters.phase_order);
      dataQuery = dataQuery.eq('phase_order', filters.phase_order);
    }
    if (filters.step_order !== undefined) {
      countQuery = countQuery.eq('step_order', filters.step_order);
      dataQuery = dataQuery.eq('step_order', filters.step_order);
    }
    if (filters.category) {
      countQuery = countQuery.in('category', filters.category);
      dataQuery = dataQuery.in('category', filters.category);
    }
    if (filters.is_loaded !== undefined) {
      countQuery = countQuery.eq('is_loaded', filters.is_loaded);
      dataQuery = dataQuery.eq('is_loaded', filters.is_loaded);
    }
    if (filters.is_custom !== undefined) {
      countQuery = countQuery.eq('is_custom', filters.is_custom);
      dataQuery = dataQuery.eq('is_custom', filters.is_custom);
    }
    if (filters.search) {
      const searchFilter = `task_name.ilike.%${filters.search}%,task_description.ilike.%${filters.search}%`;
      countQuery = countQuery.or(searchFilter);
      dataQuery = dataQuery.or(searchFilter);
    }

    // Execute both queries
    const [countResult, dataResult] = await Promise.all([
      countQuery,
      dataQuery
    ]);

    if (countResult.error) {
      throw new Error(`Failed to count project tasks: ${countResult.error.message}`);
    }
    if (dataResult.error) {
      throw new Error(`Failed to fetch project tasks: ${dataResult.error.message}`);
    }

    const totalCount = countResult.count || 0;
    const tasks = dataResult.data || [];
    const hasNextPage = page * limit < totalCount;

    return {
      tasks,
      totalCount,
      hasNextPage,
    };
  }

  async getTaskById(taskId: string): Promise<ProjectTaskWithAssignments | null> {
    const { data, error } = await supabase
      .from('project_tasks_with_assignments')
      .select('*')
      .eq('project_task_id', taskId)
      .eq('is_archived', false)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch task: ${error.message}`);
    }

    return data;
  }

  async updateTask(taskId: string, input: UpdateTaskInput, updatedBy: string): Promise<ProjectTask> {
    // Prepare the update object
    const updateData = {
      ...input,
      task_status: input.task_status,
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    } as UpdateTaskInput & {
      updated_by: string;
      updated_at: string;
    };

    // Handle status-specific field updates
    if (input.task_status) {
      switch (input.task_status) {
        case 'ongoing':
          // Set started_at if not already set
          if (!updateData.started_at) {
            updateData.started_at = new Date().toISOString();
          }
          // Clear escalation fields if moving from escalated
          updateData.escalated_at = null;
          updateData.escalation_reason = null;
          updateData.is_manually_escalated = false;
          break;
          
        case 'completed':
          // Set completed_at and ensure started_at is set
          updateData.completed_at = new Date().toISOString();
          if (!updateData.started_at) {
            updateData.started_at = updateData.completed_at;
          }
          // Clear escalation fields
          updateData.escalated_at = null;
          updateData.escalation_reason = null;
          updateData.is_manually_escalated = false;
          break;
          
        case 'escalated':
          // Set escalated_at if not already set
          if (!updateData.escalated_at) {
            updateData.escalated_at = new Date().toISOString();
          }
          // Set started_at if not already set (escalation can happen from pending)
          if (!updateData.started_at) {
            updateData.started_at = updateData.escalated_at;
          }
          break;
          
        case 'pending':
          // Reset all timestamps and escalation fields
          updateData.started_at = null;
          updateData.completed_at = null;
          updateData.escalated_at = null;
          updateData.escalation_reason = null;
          updateData.is_manually_escalated = false;
          break;
      }
    }

    const { data, error } = await supabase
      .from('project_tasks')
      .update(updateData)
      .eq('project_task_id', taskId)
      .eq('is_archived', false)
      .select()
      .single();

    if (error) throw new Error(`Failed to update task: ${error.message}`);
    return data;
  }

  async createCustomTask(
    projectId: string,
    input: CreateCustomTaskInput,
    createdBy: string
  ): Promise<ProjectTask> {
    // Get current phase and step info
    const currentTasks = await this.getProjectTasks({
      project_id: projectId,
      is_loaded: true,
    });

    if (currentTasks.length === 0) {
      throw new Error('No loaded tasks found. Cannot determine current phase/step.');
    }

    const lastTask = currentTasks[currentTasks.length - 1];
    const nextTaskOrder = Math.max(...currentTasks.map(t => t.task_order)) + 1;

    const { data, error } = await supabase
      .from('project_tasks')
      .insert({
        project_id: projectId,
        task_name: input.task_name,
        task_description: input.task_description,
        phase_name: lastTask.phase_name,
        phase_order: lastTask.phase_order,
        step_name: lastTask.step_name,
        step_order: lastTask.step_order,
        task_order: nextTaskOrder,
        estimated_hours: input.estimated_hours,
        parent_task_id: input.parent_task_id,
        category: input.category,
        checklist_items: input.checklist_items || [],
        is_loaded: true,
        is_custom: true,
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create custom task: ${error.message}`);
    return data;
  }


  async assignMultipleCrewToTask(
    projectTaskId: string, 
    crewAssignments: { crew_id: string; project_role_id: string }[],
    assignedBy: string
  ): Promise<void> {
    const assignments = crewAssignments.map(assignment => ({
      project_task_id: projectTaskId,
      project_role_id: assignment.project_role_id,
      crew_id: assignment.crew_id,
      assigned_by: assignedBy,
    }));

    const { error } = await supabase
      .from('project_task_assignments')
      .insert(assignments);

    if (error) throw new Error(`Failed to assign multiple crew to task: ${error.message}`);
  }

  async loadNextPhaseTasks(projectId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('load_next_phase_tasks', {
      p_project_id: projectId,
    });

    if (error) throw new Error(`Failed to load next phase tasks: ${error.message}`);
    return data;
  }

  async hasLoadedTasks(projectId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('project_tasks')
      .select('project_task_id')
      .eq('project_id', projectId)
      .eq('is_loaded', true)
      .limit(1);

    if (error) throw new Error(`Failed to check loaded tasks: ${error.message}`);
    return (data?.length || 0) > 0;
  }

  async escalateOverdueTasks(): Promise<number> {
    const { data, error } = await supabase.rpc('escalate_overdue_tasks');

    if (error) throw new Error(`Failed to escalate overdue tasks: ${error.message}`);
    return data;
  }

  async getAllEscalatedTasks(): Promise<ProjectTaskWithAssignments[]> {
    const { data, error } = await supabase
      .from('project_tasks_with_assignments')
      .select(`
        *,
        projects!inner(project_name)
      `)
      .eq('task_status', 'escalated')
      .eq('is_archived', false)
      .order('escalated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch all escalated tasks: ${error.message}`);
    }

    return data || [];
  }

  async getAllOverdueTasks(): Promise<ProjectTaskWithAssignments[]> {
    const { data, error } = await supabase
      .from('project_tasks_with_assignments')
      .select(`
        *,
        projects!inner(project_name)
      `)
      .lt('deadline', new Date().toISOString())
      .in('task_status', ['pending', 'ongoing'])
      .eq('is_archived', false)
      .order('deadline', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch all overdue tasks: ${error.message}`);
    }

    return data || [];
  }

  async getAllPendingTasks(): Promise<ProjectTaskWithAssignments[]> {
    const { data, error } = await supabase
      .from('project_tasks_with_assignments')
      .select(`
        *,
        projects!inner(project_name)
      `)
      .eq('task_status', 'pending')
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch all pending tasks: ${error.message}`);
    }

    return data || [];
  }

  // =====================================================
  // UTILITY FUNCTIONS
  // =====================================================

  async getAvailableTemplates(searchTerm?: string, limit: number = 5, offset: number = 0): Promise<{ templates: TemplateOption[], total: number }> {
    let query = supabase
      .from('project_templates')
      .select(`
        template_id,
        template_name,
        description,
        template_phases!inner(
          phase_id,
          phase_steps!inner(
            step_id,
            step_tasks!inner(
              task_id,
              estimated_hours
            )
          )
        )
      `, { count: 'exact' })
      .eq('is_archived', false);

    if (searchTerm) {
      query = query.or(`template_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
    }

    const { data: templates, error, count } = await query
      .range(offset, offset + limit - 1)
      .order('template_name', { ascending: true });

    if (error) throw new Error(`Failed to fetch templates: ${error.message}`);

    // Transform the data to match TemplateOption interface
    const transformedTemplates = templates?.map(template => ({
      template_id: template.template_id,
      template_name: template.template_name,
      description: template.description,
      phase_count: template.template_phases?.length || 0,
      step_count: template.template_phases?.reduce((acc, phase) => acc + (phase.phase_steps?.length || 0), 0) || 0,
      task_count: template.template_phases?.reduce(
        (acc, phase) => acc + (phase.phase_steps?.reduce(
          (stepAcc, step) => stepAcc + (step.step_tasks?.length || 0), 0
        ) || 0), 0
      ) || 0,
      total_estimated_hours: template.template_phases?.reduce(
        (acc, phase) => acc + (phase.phase_steps?.reduce(
          (stepAcc, step) => stepAcc + (step.step_tasks?.reduce(
            (taskAcc, task) => taskAcc + (task.estimated_hours || 0), 0
          ) || 0), 0
        ) || 0), 0
      ) || 0,
      roles_involved: 0, // Would need additional query to get this
    })) || [];

    return {
      templates: transformedTemplates,
      total: count || 0
    };
  }

  async getAvailableCrew(searchTerm?: string, limit?: number): Promise<CrewMember[]> {
    let query = supabase
      .from('crew')
      .select('id, name, email, phone, photo_url, status, is_archived')
      .eq('status', true)
      .eq('is_archived', false);

    // Add search functionality if search term is provided
    if (searchTerm && searchTerm.trim()) {
      query = query.or(`name.ilike.%${searchTerm.trim()}%,email.ilike.%${searchTerm.trim()}%,phone.ilike.%${searchTerm.trim()}%`);
    }

    query = query.order('name', { ascending: true });

    // Add limit if provided
    if (limit && limit > 0) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to fetch available crew: ${error.message}`);
    return data || [];
  }

  async startProject(projectId: string): Promise<boolean> {
    // Check if project can start (all roles filled)
    const canStart = await this.canProjectStart(projectId);
    if (!canStart) {
      throw new Error('Cannot start project: not all roles are filled');
    }

    // Load first step tasks
    const loaded = await this.loadNextPhaseTasks(projectId);
    if (!loaded) {
      throw new Error('Failed to load initial tasks');
    }

    // Update project status to active
    await this.updateProject(projectId, { project_status: 'active' }, 'system');

    return true;
  }

  // =====================================================
  // SEARCH AND FILTERING
  // =====================================================

  async searchProjects(searchTerm: string): Promise<ProjectWithStats[]> {
    return this.getProjects({ search: searchTerm });
  }

  async getProjectsByTemplate(templateId: string): Promise<ProjectWithStats[]> {
    return this.getProjects({ template_id: templateId });
  }

  async getProjectsByStatus(status: string[]): Promise<ProjectWithStats[]> {
    return this.getProjects({ status: status as ProjectStatusType[] });
  }

  // =====================================================
  // FILE UPLOAD OPERATIONS
  // =====================================================

  async uploadProjectImage(file: File, projectId: string): Promise<string> {
    const fileName = `projects/${projectId}/${Date.now()}-${file.name}`;
    
    const { error } = await supabase.storage
      .from('project-images')
      .upload(fileName, file);

    if (error) throw new Error(`Failed to upload project image: ${error.message}`);

    const { data: { publicUrl } } = supabase.storage
      .from('project-images')
      .getPublicUrl(fileName);

    return publicUrl;
  }

  async uploadTaskFile(file: File, taskId: string): Promise<{ id: string; file_url: string; file_name: string; file_size: number; file_type: string; uploaded_at: string }> {
    const timestamp = Date.now();
    const fileName = `${taskId}_${timestamp}_${file.name}`;
    
    const { error } = await supabase.storage
      .from('task-attachments')
      .upload(fileName, file);

    if (error) throw new Error(`Failed to upload file: ${error.message}`);

    const { data: { publicUrl } } = supabase.storage
      .from('task-attachments')
      .getPublicUrl(fileName);

    return {
      id: timestamp.toString(),
      file_url: publicUrl,
      file_name: file.name,
      file_size: file.size,
      file_type: file.name.split('.').pop() || '',
      uploaded_at: new Date().toISOString(),
    };
  }

  async deleteTaskFile(fileUrl: string): Promise<void> {
    // Extract file path from the public URL
    const urlParts = fileUrl.split('/task-attachments/');
    if (urlParts.length !== 2) {
      throw new Error('Invalid file URL format');
    }
    const filePath = urlParts[1];
    
    const { error } = await supabase.storage
      .from('task-attachments')
      .remove([filePath]);

    if (error) throw new Error(`Failed to delete file: ${error.message}`);
  }

  // =====================================================
  // COMMENT OPERATIONS
  // =====================================================

  async addTaskComment(
    taskId: string, 
    comment: string, 
    authorId: string, 
    authorName: string
  ): Promise<{ id: string; text: string; author: string; created_at: string }> {
    const newComment = {
      id: Date.now().toString(),
      text: comment,
      author: authorName,
      created_at: new Date().toISOString(),
    };

    // Get current task
    const task = await this.getTaskById(taskId);
    if (!task) throw new Error('Task not found');

    // Update task with new comment
    const updatedComments = [...(task.comments || []), newComment];
    await this.updateTask(taskId, { comments: updatedComments }, authorId);

    return newComment;
  }

  async deleteTaskComment(taskId: string, commentId: string, userId: string): Promise<void> {
    const task = await this.getTaskById(taskId);
    if (!task) throw new Error('Task not found');

    const updatedComments = task.comments.filter(comment => comment.id !== commentId);
    await this.updateTask(taskId, { comments: updatedComments }, userId);
  }

  // =====================================================
  // TASK CREW ASSIGNMENT OPERATIONS
  // =====================================================

  async assignCrewToTask(input: AssignTaskCrewInput, assignedBy: string): Promise<boolean> {
    const { project_task_id, crew_id } = input;

    // First, we need to get a project role for this crew member
    // For now, we'll find any available role or create a generic assignment
    const { data: existingAssignment, error: checkError } = await supabase
      .from('project_task_assignments')
      .select('assignment_id')
      .eq('project_task_id', project_task_id)
      .eq('crew_id', crew_id)
      .single();

    if (!checkError && existingAssignment) {
      // Already assigned
      return true;
    }

    // Get the project ID from the task
    const { data: task, error: taskError } = await supabase
      .from('project_tasks')
      .select('project_id')
      .eq('project_task_id', project_task_id)
      .single();

    if (taskError || !task) {
      throw new Error('Task not found');
    }

    // Find any project role for this crew member, or use the first available role
    const { data: projectRole, error: roleError } = await supabase
      .from('project_crew_assignments')
      .select('project_role_id')
      .eq('project_id', task.project_id)
      .eq('crew_id', crew_id)
      .single();

    let projectRoleId: string;

    if (roleError || !projectRole) {
      // If crew member is not assigned to any role in this project,
      // find the first available project role
      const { data: availableRole, error: availableRoleError } = await supabase
        .from('project_roles')
        .select('project_role_id')
        .eq('project_id', task.project_id)
        .limit(1)
        .single();

      if (availableRoleError || !availableRole) {
        throw new Error('No available project roles found');
      }

      projectRoleId = availableRole.project_role_id;
    } else {
      projectRoleId = projectRole.project_role_id;
    }

    // Insert the task assignment
    const { error } = await supabase
      .from('project_task_assignments')
      .insert({
        project_task_id,
        project_role_id: projectRoleId,
        crew_id,
        assigned_by: assignedBy,
      });

    if (error) throw new Error(`Failed to assign crew to task: ${error.message}`);

    return true;
  }

  async removeCrewFromTask(taskId: string, crewId: string): Promise<boolean> {
    // First check if this is the only person assigned to the task
    const { data: assignments, error: countError } = await supabase
      .from('project_task_assignments')
      .select('assignment_id')
      .eq('project_task_id', taskId);

    if (countError) throw new Error(`Failed to check task assignments: ${countError.message}`);

    if (assignments && assignments.length <= 1) {
      throw new Error('Cannot remove the last assigned person from a task. At least one person must be assigned.');
    }

    // Remove the assignment
    const { error } = await supabase
      .from('project_task_assignments')
      .delete()
      .eq('project_task_id', taskId)
      .eq('crew_id', crewId);

    if (error) throw new Error(`Failed to remove crew from task: ${error.message}`);

    return true;
  }

  async getTaskAssignments(taskId: string): Promise<Array<{
    assignment_id: string;
    crew_id: string;
    crew_name: string;
    crew_email: string;
    role_name: string;
    department_name: string;
  }>> {
    const { data, error } = await supabase
      .from('project_task_assignments')
      .select(`
        assignment_id,
        crew_id,
        crew!crew_id (
          id,
          name,
          email
        ),
        project_role!project_role_id (
          role_name,
          department_name
        )
      `)
      .eq('project_task_id', taskId);

    if (error) throw new Error(`Failed to fetch task assignments: ${error.message}`);

    return data?.map((assignment: {
      assignment_id: string;
      crew_id: string;
      crew: { name: string; email: string }[];
      project_role: { role_name: string; department_name: string }[];
    }) => ({
      assignment_id: assignment.assignment_id,
      crew_id: assignment.crew_id,
      crew_name: assignment.crew?.[0]?.name || '',
      crew_email: assignment.crew?.[0]?.email || '',
      role_name: assignment.project_role?.[0]?.role_name || '',
      department_name: assignment.project_role?.[0]?.department_name || '',
    })) || [];
  }
}

export const projectService = new ProjectService();
export default projectService;
