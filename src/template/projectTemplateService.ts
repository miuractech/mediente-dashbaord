import supabase from '../supabase';
import type {
  ProjectTemplate,
  TemplatePhase,
  PhaseStep,
  StepTask,
  CreateProjectTemplateRequest,
  UpdateProjectTemplateRequest,
  CreateTemplatePhaseRequest,
  UpdateTemplatePhaseRequest,
  CreatePhaseStepRequest,
  UpdatePhaseStepRequest,
  CreateStepTaskRequest,
  UpdateStepTaskRequest,
  PaginationParams,
  TemplateFilters,
  PhaseFilters,
  StepFilters,
  TaskFilters,
  PaginatedTemplatesResponse,
  PaginatedPhasesResponse,
  PaginatedStepsResponse,
  PaginatedTasksResponse,
  TemplateRole,
  TemplateRoleUsage
} from './template.type';

// Project Templates CRUD
export const projectTemplateService = {
  // Get all templates (legacy - use getPaginated for production)
  async getAll(): Promise<ProjectTemplate[]> {
    const { data, error } = await supabase
      .from('project_templates')
      .select('*')
      .eq('is_archived', false)
      .order('template_name')
      .limit(100); // Limit to prevent large queries

    if (error) throw error;
    return data || [];
  },

  // Get templates with pagination and filters
  async getPaginated(
    pagination: PaginationParams = {},
    filters: TemplateFilters = {}
  ): Promise<PaginatedTemplatesResponse> {
    const { page = 1, pageSize = 20 } = pagination;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('project_templates')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters.is_archived !== undefined) {
      query = query.eq('is_archived', filters.is_archived);
    } else {
      query = query.eq('is_archived', false); // Default to non-archived
    }

    if (filters.search) {
      query = query.or(`template_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    if (filters.created_by) {
      query = query.eq('created_by', filters.created_by);
    }

    const { data, error, count } = await query
      .order('template_name')
      .range(from, to);

    if (error) throw error;

    const totalPages = Math.ceil((count || 0) / pageSize);

    return {
      data: data || [],
      count: count || 0,
      page,
      pageSize,
      totalPages
    };
  },

  // Get template by ID
  async getById(templateId: string): Promise<ProjectTemplate | null> {
    const { data, error } = await supabase
      .from('project_templates')
      .select('*')
      .eq('template_id', templateId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  // Create template
  async create(template: CreateProjectTemplateRequest): Promise<ProjectTemplate> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('project_templates')
      .insert({
        ...template,
        created_by: user.email || user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update template
  async update(templateId: string, updates: UpdateProjectTemplateRequest): Promise<ProjectTemplate> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('project_templates')
      .update({
        ...updates,
        updated_by: user.email || user.id
      })
      .eq('template_id', templateId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete template (archive)
  async delete(templateId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('project_templates')
      .update({
        is_archived: true,
        updated_by: user.email || user.id
      })
      .eq('template_id', templateId);

    if (error) throw error;
  },

  // Get template complexity before duplication
  async getComplexity(templateId: string): Promise<{
    template_id: string;
    template_name: string;
    phase_count: number;
    step_count: number;
    task_count: number;
    parent_task_count: number;
    estimated_duration_seconds: number;
  } | null> {
    const { data, error } = await supabase.rpc('get_template_complexity', {
      template_uuid: templateId
    });

    if (error) throw error;
    return data?.[0] || null;
  },

  // Duplicate template with all its content
  async duplicate(templateId: string, newTemplateName: string): Promise<ProjectTemplate> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check template complexity first
    const complexity = await this.getComplexity(templateId);
    if (complexity && complexity.task_count > 10000) {
      throw new Error(`Template is too large (${complexity.task_count} tasks). Please contact support for assistance with large template duplication.`);
    }

    const { data, error } = await supabase.rpc('duplicate_template', {
      source_template_id: templateId,
      new_template_name: newTemplateName,
      created_by_user: user.email || user.id
    });

    if (error) {
      // Provide more specific error messages
      if (error.message?.includes('timeout')) {
        throw new Error('Template duplication timed out. The template may be too large. Please try again or contact support.');
      }
      if (error.message?.includes('duplicate key')) {
        throw new Error('A template with this name already exists. Please choose a different name.');
      }
      throw new Error(`Failed to duplicate template: ${error.message}`);
    }

    // Get the newly created template
    const newTemplate = await this.getById(data);
    if (!newTemplate) throw new Error('Failed to retrieve duplicated template');
    
    return newTemplate;
  }
};

// Template Phases CRUD
export const templatePhaseService = {
  // Get phases by template ID (legacy - use getPaginated for production)
  async getByTemplateId(templateId: string): Promise<TemplatePhase[]> {
    const { data, error } = await supabase
      .from('template_phases')
      .select('*')
      .eq('template_id', templateId)
      .eq('is_archived', false)
      .order('phase_order')
      .limit(100); // Limit to prevent large queries

    if (error) throw error;
    return data || [];
  },

  // Get phases with pagination and filters
  async getPaginated(
    pagination: PaginationParams = {},
    filters: PhaseFilters = {}
  ): Promise<PaginatedPhasesResponse> {
    const { page = 1, pageSize = 20 } = pagination;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('template_phases')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters.template_id) {
      query = query.eq('template_id', filters.template_id);
    }

    if (filters.is_archived !== undefined) {
      query = query.eq('is_archived', filters.is_archived);
    } else {
      query = query.eq('is_archived', false);
    }

    if (filters.search) {
      query = query.or(`phase_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error, count } = await query
      .order('phase_order')
      .range(from, to);

    if (error) throw error;

    const totalPages = Math.ceil((count || 0) / pageSize);

    return {
      data: data || [],
      count: count || 0,
      page,
      pageSize,
      totalPages
    };
  },

  // Get phase by ID
  async getById(phaseId: string): Promise<TemplatePhase | null> {
    const { data, error } = await supabase
      .from('template_phases')
      .select('*')
      .eq('phase_id', phaseId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  // Create phase
  async create(phase: CreateTemplatePhaseRequest): Promise<TemplatePhase> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get next order number
    const { data: existingPhases } = await supabase
      .from('template_phases')
      .select('phase_order')
      .eq('template_id', phase.template_id)
      .order('phase_order', { ascending: false })
      .limit(1);

    const nextOrder = existingPhases && existingPhases.length > 0 
      ? existingPhases[0].phase_order + 1 
      : 1;

    const { data, error } = await supabase
      .from('template_phases')
      .insert({
        ...phase,
        phase_order: phase.phase_order || nextOrder,
        created_by: user.email || user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update phase
  async update(phaseId: string, updates: UpdateTemplatePhaseRequest): Promise<TemplatePhase> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('template_phases')
      .update({
        ...updates,
        updated_by: user.email || user.id
      })
      .eq('phase_id', phaseId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete phase (archive)
  async delete(phaseId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('template_phases')
      .update({
        is_archived: true,
        updated_by: user.email || user.id
      })
      .eq('phase_id', phaseId);

    if (error) throw error;
  },

  // Reorder phases
  async reorder(templateId: string, phaseOrders: { phase_id: string; phase_order: number }[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Use a transaction to avoid unique constraint violations
    // First, set all orders to negative values to avoid conflicts
    const tempUpdates = phaseOrders.map(({ phase_id }, index) => ({
      phase_id,
      temp_order: -(index + 1000) // Use negative numbers to avoid conflicts
    }));

    // Step 1: Set temporary negative orders
    for (const { phase_id, temp_order } of tempUpdates) {
      const { error } = await supabase
        .from('template_phases')
        .update({
          phase_order: temp_order,
          updated_by: user.email || user.id
        })
        .eq('phase_id', phase_id)
        .eq('template_id', templateId);

      if (error) throw error;
    }

    // Step 2: Set final positive orders
    for (const { phase_id, phase_order } of phaseOrders) {
      const { error } = await supabase
        .from('template_phases')
        .update({
          phase_order,
          updated_by: user.email || user.id
        })
        .eq('phase_id', phase_id)
        .eq('template_id', templateId);

      if (error) throw error;
    }
  }
};

// Phase Steps CRUD
export const phaseStepService = {
  // Get steps by phase ID (legacy - use getPaginated for production)
  async getByPhaseId(phaseId: string): Promise<PhaseStep[]> {
    const { data, error } = await supabase
      .from('phase_steps')
      .select('*')
      .eq('phase_id', phaseId)
      .eq('is_archived', false)
      .order('step_order')
      .limit(100); // Limit to prevent large queries

    if (error) throw error;
    return data || [];
  },

  // Get steps with pagination and filters
  async getPaginated(
    pagination: PaginationParams = {},
    filters: StepFilters = {}
  ): Promise<PaginatedStepsResponse> {
    const { page = 1, pageSize = 20 } = pagination;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('phase_steps')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters.phase_id) {
      query = query.eq('phase_id', filters.phase_id);
    }

    if (filters.is_archived !== undefined) {
      query = query.eq('is_archived', filters.is_archived);
    } else {
      query = query.eq('is_archived', false);
    }

    if (filters.search) {
      query = query.or(`step_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error, count } = await query
      .order('step_order')
      .range(from, to);

    if (error) throw error;

    const totalPages = Math.ceil((count || 0) / pageSize);

    return {
      data: data || [],
      count: count || 0,
      page,
      pageSize,
      totalPages
    };
  },

  // Get step by ID
  async getById(stepId: string): Promise<PhaseStep | null> {
    const { data, error } = await supabase
      .from('phase_steps')
      .select('*')
      .eq('step_id', stepId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  // Create step
  async create(step: CreatePhaseStepRequest): Promise<PhaseStep> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get next order number
    const { data: existingSteps } = await supabase
      .from('phase_steps')
      .select('step_order')
      .eq('phase_id', step.phase_id)
      .order('step_order', { ascending: false })
      .limit(1);

    const nextOrder = existingSteps && existingSteps.length > 0 
      ? existingSteps[0].step_order + 1 
      : 1;

    const { data, error } = await supabase
      .from('phase_steps')
      .insert({
        ...step,
        step_order: step.step_order || nextOrder,
        created_by: user.email || user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update step
  async update(stepId: string, updates: UpdatePhaseStepRequest): Promise<PhaseStep> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('phase_steps')
      .update({
        ...updates,
        updated_by: user.email || user.id
      })
      .eq('step_id', stepId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete step (archive)
  async delete(stepId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('phase_steps')
      .update({
        is_archived: true,
        updated_by: user.email || user.id
      })
      .eq('step_id', stepId);

    if (error) throw error;
  },

  // Reorder steps
  async reorder(phaseId: string, stepOrders: { step_id: string; step_order: number }[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Use a transaction to avoid unique constraint violations
    // First, set all orders to negative values to avoid conflicts
    const tempUpdates = stepOrders.map(({ step_id }, index) => ({
      step_id,
      temp_order: -(index + 1000) // Use negative numbers to avoid conflicts
    }));

    // Step 1: Set temporary negative orders
    for (const { step_id, temp_order } of tempUpdates) {
      const { error } = await supabase
        .from('phase_steps')
        .update({
          step_order: temp_order,
          updated_by: user.email || user.id
        })
        .eq('step_id', step_id)
        .eq('phase_id', phaseId);

      if (error) throw error;
    }

    // Step 2: Set final positive orders
    for (const { step_id, step_order } of stepOrders) {
      const { error } = await supabase
        .from('phase_steps')
        .update({
          step_order,
          updated_by: user.email || user.id
        })
        .eq('step_id', step_id)
        .eq('phase_id', phaseId);

      if (error) throw error;
    }
  }
};

// Step Tasks CRUD
export const stepTaskService = {
  // Get tasks by step ID (legacy - use getPaginated for production)
  async getByStepId(stepId: string): Promise<StepTask[]> {
    const { data, error } = await supabase
      .from('step_tasks')
      .select('*')
      .eq('step_id', stepId)
      .eq('is_archived', false)
      .order('task_order')
      .limit(100); // Limit to prevent large queries

    if (error) throw error;
    return data || [];
  },

  // Get tasks with pagination and filters
  async getPaginated(
    pagination: PaginationParams = {},
    filters: TaskFilters = {}
  ): Promise<PaginatedTasksResponse> {
    const { page = 1, pageSize = 20 } = pagination;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('step_tasks')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters.step_id) {
      query = query.eq('step_id', filters.step_id);
    }

    if (filters.assigned_role_id) {
      query = query.eq('assigned_role_id', filters.assigned_role_id);
    }

    if (filters.parent_task_id !== undefined) {
      if (filters.parent_task_id === null || filters.parent_task_id === '') {
        query = query.is('parent_task_id', null);
      } else {
        query = query.eq('parent_task_id', filters.parent_task_id);
      }
    }

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (filters.is_archived !== undefined) {
      query = query.eq('is_archived', filters.is_archived);
    } else {
      query = query.eq('is_archived', false);
    }

    if (filters.search) {
      query = query.or(`task_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error, count } = await query
      .order('task_order')
      .range(from, to);

    if (error) throw error;

    const totalPages = Math.ceil((count || 0) / pageSize);

    return {
      data: data || [],
      count: count || 0,
      page,
      pageSize,
      totalPages
    };
  },

  // Get task by ID
  async getById(taskId: string): Promise<StepTask | null> {
    const { data, error } = await supabase
      .from('step_tasks')
      .select('*')
      .eq('task_id', taskId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  // Create task
  async create(task: CreateStepTaskRequest): Promise<StepTask> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get the template_id from the step to calculate template-wide task order
    const { data: stepData, error: stepError } = await supabase
      .from('phase_steps')
      .select(`
        template_phases!inner(template_id)
      `)
      .eq('step_id', task.step_id)
      .single();

    if (stepError) {
      console.error('❌ [stepTaskService.create] Error fetching step template:', stepError);
      throw stepError;
    }

    const templateId = stepData.template_phases.template_id;
    console.log('📝 [stepTaskService.create] Creating task for template:', templateId);

    // Get next template-wide order number to satisfy unique constraint
    const { data: existingTasks } = await supabase
      .from('step_tasks')
      .select(`
        task_order,
        phase_steps!inner(
          template_phases!inner(template_id)
        )
      `)
      .eq('phase_steps.template_phases.template_id', templateId)
      .order('task_order', { ascending: false })
      .limit(1);

    const nextOrder = existingTasks && existingTasks.length > 0 
      ? existingTasks[0].task_order + 1 
      : 1;

    console.log('📊 [stepTaskService.create] Calculated next task order:', nextOrder, 'for template:', templateId);

    const { data, error } = await supabase
      .from('step_tasks')
      .insert({
        ...task,
        task_order: task.task_order || nextOrder,
        created_by: user.email || user.id
      })
      .select()
      .single();

    if (error) {
      console.error('❌ [stepTaskService.create] Error creating task:', error);
      throw error;
    }
    
    console.log('✅ [stepTaskService.create] Task created successfully with order:', data.task_order);
    return data;
  },

  // Update task
  async update(taskId: string, updates: UpdateStepTaskRequest): Promise<StepTask> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('step_tasks')
      .update({
        ...updates,
        updated_by: user.email || user.id
      })
      .eq('task_id', taskId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete task (archive)
  async delete(taskId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('step_tasks')
      .update({
        is_archived: true,
        updated_by: user.email || user.id
      })
      .eq('task_id', taskId);

    if (error) throw error;
  },

  // Reorder tasks
  async reorder(stepId: string, taskOrders: { task_id: string; task_order: number }[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Call the SQL function to handle reordering safely
    const { error } = await supabase.rpc('reorder_template_items', {
      parent_id: stepId,
      item_type: 'tasks',
      item_orders: taskOrders.map(({ task_id, task_order }) => ({
        id: task_id,
        order: task_order
      }))
    });

    if (error) throw error;
  },

  // Reorder tasks globally across the entire template
  async reorderGlobally(templateId: string, taskOrders: { task_id: string; task_order: number }[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Call the SQL function to handle global task reordering
    const { error } = await supabase.rpc('reorder_template_items', {
      parent_id: templateId,
      item_type: 'tasks',
      item_orders: taskOrders.map(({ task_id, task_order }) => ({
        id: task_id,
        order: task_order
      }))
    });

    if (error) throw error;
  },

  // Get available parent tasks for a step (excluding the task itself and its descendants)
  async getAvailableParentTasks(stepId: string, excludeTaskId?: string, limit: number = 10): Promise<StepTask[]> {
    let query = supabase
      .from('step_tasks')
      .select('*')
      .eq('step_id', stepId)
      .eq('is_archived', false);

    if (excludeTaskId) {
      query = query.neq('task_id', excludeTaskId);
    }

    const { data, error } = await query
      .order('task_order', { ascending: true })
      .limit(limit);

    if (error) throw error;

    // If we're excluding a task, also exclude its descendants to prevent circular references
    if (excludeTaskId && data) {
      const descendants = await this.getTaskDescendants(excludeTaskId);
      const descendantIds = descendants.map(d => d.task_id);
      return data.filter(task => !descendantIds.includes(task.task_id));
    }

    return data || [];
  },

  // Search available parent tasks from previous steps and phases only (optimized for scaling)
  async searchAvailableParentTasks(
    templateId: string, 
    currentStepId: string, 
    searchTerm: string = '',
    excludeTaskId?: string,
    limit: number = 10
  ): Promise<(StepTask & { step_name: string; phase_name: string; phase_order: number; step_order: number })[]> {
    
    // First, get the current step's phase and step order to determine what's "previous"
    const { data: currentStepData, error: currentStepError } = await supabase
      .from('phase_steps')
      .select(`
        step_order,
        phase_id,
        template_phases!inner(
          phase_order,
          template_id
        )
      `)
      .eq('step_id', currentStepId)
      .eq('template_phases.template_id', templateId)
      .single();

    if (currentStepError) throw currentStepError;
    if (!currentStepData) return [];

    // Type assertion for Supabase nested relations
    const templatePhases = currentStepData.template_phases as unknown as { phase_order: number }[];
    const currentPhaseOrder = templatePhases[0]?.phase_order;
    const currentStepOrder = currentStepData.step_order;

    // Build query to get tasks from previous steps/phases only
    let query = supabase
      .from('step_tasks')
      .select(`
        *,
        phase_steps!inner(
          step_name,
          step_order,
          phase_id,
          template_phases!inner(
            phase_name,
            phase_order,
            template_id
          )
        )
      `)
      .eq('phase_steps.template_phases.template_id', templateId)
      .eq('is_archived', false);

    // Add search filter if provided (optimized for millions of tasks)
    if (searchTerm.trim()) {
      // Use case-insensitive search with ILIKE - database should have GIN index on task_name and description
      query = query.or(`task_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
    }

    // Exclude current task if editing
    if (excludeTaskId) {
      query = query.neq('task_id', excludeTaskId);
    }

    const { data, error } = await query
      .order('task_order', { ascending: true })
      .limit(limit);

    if (error) throw error;
    if (!data) return [];

    // Filter to include tasks from current and previous phases, but exclude future phases/steps
    const filteredTasks = data.filter(task => {
      // Type assertion for Supabase nested relations
      const phaseSteps = task.phase_steps as unknown as { 
        step_order: number; 
        template_phases: { phase_order: number }[] 
      }[];
      const taskPhaseOrder = phaseSteps[0]?.template_phases[0]?.phase_order;
      const taskStepOrder = phaseSteps[0]?.step_order;
      
      // Include if from previous phase
      if (taskPhaseOrder < currentPhaseOrder) {
        return true;
      }
      
      // Include if from same phase but previous step
      if (taskPhaseOrder === currentPhaseOrder && taskStepOrder < currentStepOrder) {
        return true;
      }
      
      // Include if from same phase and same step (current step)
      // Note: Specific task exclusion (excludeTaskId) is already handled in the query
      if (taskPhaseOrder === currentPhaseOrder && taskStepOrder === currentStepOrder) {
        return true;
      }
      
      // Exclude future steps and future phases
      return false;
    });

    // Format the data
    const formattedTasks = filteredTasks.map(task => {
      // Type assertion for Supabase nested relations
      const phaseSteps = task.phase_steps as unknown as { 
        step_name: string;
        step_order: number; 
        template_phases: { phase_name: string; phase_order: number }[] 
      }[];
      
      return {
        ...task,
        step_name: phaseSteps[0]?.step_name || '',
        phase_name: phaseSteps[0]?.template_phases[0]?.phase_name || '',
        phase_order: phaseSteps[0]?.template_phases[0]?.phase_order || 0,
        step_order: phaseSteps[0]?.step_order || 0
      };
    });

    // Filter out descendants of excluded task if specified (this requires additional query but only if needed)
    if (excludeTaskId && formattedTasks.length > 0) {
      try {
        const descendants = await this.getTaskDescendants(excludeTaskId);
        const descendantIds = descendants.map(d => d.task_id);
        const filteredByDescendants = formattedTasks.filter(task => !descendantIds.includes(task.task_id));
        
        // Sort by phase order, then step order, then task order
        return filteredByDescendants.sort((a, b) => {
          if (a.phase_order !== b.phase_order) return a.phase_order - b.phase_order;
          if (a.step_order !== b.step_order) return a.step_order - b.step_order;
          return a.task_order - b.task_order;
        });
      } catch (error) {
        console.warn('Could not filter descendants:', error);
        // Sort by phase order, then step order, then task order
        return formattedTasks.sort((a, b) => {
          if (a.phase_order !== b.phase_order) return a.phase_order - b.phase_order;
          if (a.step_order !== b.step_order) return a.step_order - b.step_order;
          return a.task_order - b.task_order;
        });
      }
    }

    // Sort by phase order, then step order, then task order
    return formattedTasks.sort((a, b) => {
      if (a.phase_order !== b.phase_order) return a.phase_order - b.phase_order;
      if (a.step_order !== b.step_order) return a.step_order - b.step_order;
      return a.task_order - b.task_order;
    });
  },

  // Legacy method - kept for backward compatibility but deprecated
  async getAvailableParentTasksFromTemplate(templateId: string, currentStepId: string, excludeTaskId?: string): Promise<(StepTask & { step_name: string; phase_name: string; phase_order: number; step_order: number })[]> {
    console.warn('getAvailableParentTasksFromTemplate is deprecated. Use searchAvailableParentTasks instead.');
    return this.searchAvailableParentTasks(templateId, currentStepId, '', excludeTaskId, 100);
  },

  // Get task descendants (children, grandchildren, etc.)
  async getTaskDescendants(taskId: string): Promise<StepTask[]> {
    const { data, error } = await supabase
      .rpc('get_task_descendants', { task_uuid: taskId });

    if (error) throw error;
    return data || [];
  },

  // Get task ancestors (parent, grandparent, etc.)
  async getTaskAncestors(taskId: string): Promise<StepTask[]> {
    const { data, error } = await supabase
      .rpc('get_task_ancestors', { task_uuid: taskId });

    if (error) throw error;
    return data || [];
  },

  // Get all tasks from a phase (from all steps within that phase)
  async getByPhaseId(phaseId: string): Promise<(StepTask & { step_name: string; step_order: number })[]> {
    const { data, error } = await supabase
      .from('step_tasks')
      .select(`
        *,
        phase_steps!inner(
          step_name,
          step_order,
          phase_id
        )
      `)
      .eq('phase_steps.phase_id', phaseId)
      .eq('is_archived', false)
      .order('phase_steps(step_order)', { ascending: true })
      .order('task_order', { ascending: true });

    if (error) throw error;

    return (data || []).map(task => ({
      ...task,
      step_name: (task.phase_steps as unknown as { step_name: string; step_order: number }).step_name || '',
      step_order: (task.phase_steps as unknown as { step_name: string; step_order: number }).step_order || 0
    }));
  },

  // Get all tasks from all phases in a template
  async getByTemplateId(templateId: string): Promise<(StepTask & { step_name: string; step_order: number; phase_name: string; phase_order: number })[]> {
    const { data, error } = await supabase
      .from('step_tasks')
      .select(`
        *,
        phase_steps!inner(
          step_name,
          step_order,
          template_phases!inner(
            phase_name,
            phase_order,
            template_id
          )
        )
      `)
      .eq('phase_steps.template_phases.template_id', templateId)
      .eq('is_archived', false)
      .order('task_order', { ascending: true });

    if (error) throw error;

    const tasks = (data || []).map(task => {
      // Type assertion for the nested Supabase response structure
      const phaseSteps = task.phase_steps as unknown as {
        step_name: string;
        step_order: number;
        template_phases: {
          phase_name: string;
          phase_order: number;
        };
      };
      
      return {
        ...task,
        step_name: phaseSteps?.step_name || '',
        step_order: phaseSteps?.step_order || 0,
        phase_name: phaseSteps?.template_phases?.phase_name || '',
        phase_order: phaseSteps?.template_phases?.phase_order || 0
      };
    });

    // Sort in JavaScript since PostgreSQL nested ordering isn't supported
    return tasks.sort((a, b) => {
      // First sort by phase order
      if (a.phase_order !== b.phase_order) {
        return a.phase_order - b.phase_order;
      }
      // Then by step order within the same phase
      if (a.step_order !== b.step_order) {
        return a.step_order - b.step_order;
      }
      // Finally by task order within the same step
      return a.task_order - b.task_order;
    });
  },

  // Get available parent tasks from current phase and previous phases for phase-level task creation
  async getAvailableParentTasksFromTemplateForPhase(
    templateId: string, 
    currentPhaseId: string,
    excludeTaskId?: string,
    limit: number = 10,
    searchTerm?: string
  ): Promise<(StepTask & { step_name: string; phase_name: string; phase_order: number; step_order: number })[]> {
    
    // First, get the current phase order to filter previous and current phases
    const { data: currentPhase } = await supabase
      .from('template_phases')
      .select('phase_order')
      .eq('phase_id', currentPhaseId)
      .single();

    if (!currentPhase) {
      throw new Error('Current phase not found');
    }

    let query = supabase
      .from('step_tasks')
      .select(`
        *,
        phase_steps!inner(
          step_name,
          step_order,
          phase_id,
          template_phases!inner(
            phase_name,
            phase_order,
            template_id
          )
        )
      `)
      .eq('phase_steps.template_phases.template_id', templateId)
      .eq('is_archived', false)
      // Include tasks from current phase and all previous phases
      .lte('phase_steps.template_phases.phase_order', currentPhase.phase_order);

    // Exclude current task if editing
    if (excludeTaskId) {
      query = query.neq('task_id', excludeTaskId);
    }

    // Add search filter if provided (optimized for millions of tasks)
    if (searchTerm && searchTerm.trim()) {
      // Use case-insensitive search with ILIKE - database should have GIN index on task_name and description
      query = query.or(`task_name.ilike.%${searchTerm.trim()}%,description.ilike.%${searchTerm.trim()}%`);
    }

    const { data, error } = await query
      .order('task_order', { ascending: true })
      .limit(limit);

    if (error) throw error;
    if (!data) return [];

    // Format the data
    const formattedTasks = data.map(task => {
      const phaseSteps = task.phase_steps as unknown as { 
        step_name: string;
        step_order: number; 
        template_phases: { phase_name: string; phase_order: number }[] 
      }[];
      
      return {
        ...task,
        step_name: phaseSteps[0]?.step_name || '',
        phase_name: phaseSteps[0]?.template_phases[0]?.phase_name || '',
        phase_order: phaseSteps[0]?.template_phases[0]?.phase_order || 0,
        step_order: phaseSteps[0]?.step_order || 0
      };
    });

    // Sort the formatted tasks by phase order, step order, and task order
    formattedTasks.sort((a, b) => {
      // First sort by phase order
      if (a.phase_order !== b.phase_order) {
        return a.phase_order - b.phase_order;
      }
      // Then by step order
      if (a.step_order !== b.step_order) {
        return a.step_order - b.step_order;
      }
      // Finally by task order
      return a.task_order - b.task_order;
    });

    // Filter out descendants of excluded task if specified
    if (excludeTaskId && formattedTasks.length > 0) {
      try {
        const descendants = await this.getTaskDescendants(excludeTaskId);
        const descendantIds = descendants.map(d => d.task_id);
        return formattedTasks.filter(task => !descendantIds.includes(task.task_id));
      } catch (error) {
        console.warn('Could not filter descendants:', error);
        return formattedTasks;
      }
    }

    return formattedTasks;
  },

  // Get tasks organized by hierarchy (root tasks with their children)
  async getTasksWithHierarchy(stepId: string): Promise<StepTask[]> {
    const { data, error } = await supabase
      .from('step_tasks')
      .select('*')
      .eq('step_id', stepId)
      .eq('is_archived', false)
      .order('task_order');

    if (error) throw error;

    // Organize tasks by hierarchy
    const tasks = data || [];
    const rootTasks: StepTask[] = [];
    const taskMap = new Map<string, StepTask & { children?: StepTask[] }>();

    // Create a map of all tasks
    tasks.forEach(task => {
      taskMap.set(task.task_id, { ...task, children: [] });
    });

    // Build hierarchy
    tasks.forEach(task => {
      const taskWithChildren = taskMap.get(task.task_id)!;
      if (task.parent_task_id) {
        const parent = taskMap.get(task.parent_task_id);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(taskWithChildren);
        }
      } else {
        rootTasks.push(taskWithChildren);
      }
    });

    return rootTasks;
  },

  // Search all tasks across entire template (template-wide parent task search)
  async searchTemplateWideTasks(
    templateId: string,
    searchTerm: string = '',
    excludeTaskId?: string,
    limit: number = 10
  ): Promise<(StepTask & { step_name: string; phase_name: string; phase_order: number; step_order: number })[]> {
    console.log('🔍 [stepTaskService.searchTemplateWideTasks] Starting template-wide search:', {
      templateId,
      searchTerm,
      excludeTaskId,
      limit
    });

    // Search across all tasks in the template with step and phase context
    const { data, error } = await supabase
      .from('step_tasks')
      .select(`
        *,
        phase_steps!inner(
          step_name,
          step_order,
          template_phases!inner(
            phase_name,
            phase_order,
            template_id
          )
        )
      `)
      .eq('phase_steps.template_phases.template_id', templateId)
      .eq('is_archived', false)
      .ilike('task_name', `%${searchTerm}%`)
      .order('task_order', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('❌ [stepTaskService.searchTemplateWideTasks] Database error:', error);
      console.error('❌ [stepTaskService.searchTemplateWideTasks] Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    console.log('✅ [stepTaskService.searchTemplateWideTasks] Raw query results:', data?.length || 0, 'tasks');
    console.log('🔍 [stepTaskService.searchTemplateWideTasks] Sample data structure:', data?.[0]);

    if (!data) return [];

    // Transform the nested structure to flat tasks with context
    const flatTasks = data.map(task => ({
      ...task,
      step_name: task.phase_steps.step_name,
      step_order: task.phase_steps.step_order,
      phase_name: task.phase_steps.template_phases.phase_name,
      phase_order: task.phase_steps.template_phases.phase_order,
    })).filter(task => {
      // Exclude current task if specified
      return !excludeTaskId || task.task_id !== excludeTaskId;
    }).sort((a, b) => {
      // Sort by phase_order, then step_order, then task_order
      if (a.phase_order !== b.phase_order) {
        return a.phase_order - b.phase_order;
      }
      if (a.step_order !== b.step_order) {
        return a.step_order - b.step_order;
      }
      return a.task_order - b.task_order;
    });

    console.log('📋 [stepTaskService.searchTemplateWideTasks] Processed results:', flatTasks.length, 'tasks');
    console.log('📊 [stepTaskService.searchTemplateWideTasks] Task list:', flatTasks.map(t => `${t.task_name} (${t.step_name} - ${t.phase_name})`));

    return flatTasks;
  }
};

// Optimized Role Search Service (for scalable role selection)
export const optimizedRoleSearchService = {
  // Search roles with pagination for scalability
  async searchRoles(
    search: string = '',
    limit: number = 10
  ): Promise<TemplateRole[]> {
    let query = supabase
      .from('department_roles')
      .select(`
        role_id,
        role_name,
        departments!inner(department_name),
        is_archived
      `)
      .eq('is_archived', false)
      .order('role_name')
      .limit(limit);

    if (search.trim()) {
      const searchTerm = search.trim();
      // Simple role name search to avoid parsing issues
      query = query.ilike('role_name', `%${searchTerm}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(role => ({
      role_id: role.role_id,
      role_name: role.role_name,
      department_name: role.departments?.[0]?.department_name,
      is_archived: role.is_archived
    }));
  },

  // Get role by ID for display
  async getRoleById(roleId: string): Promise<TemplateRole | null> {
    const { data, error } = await supabase
      .from('department_roles')
      .select(`
        role_id,
        role_name,
        departments!inner(department_name),
        is_archived
      `)
      .eq('role_id', roleId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return {
      role_id: data.role_id,
      role_name: data.role_name,
      department_name: data.departments?.[0]?.department_name,
      is_archived: data.is_archived
    };
  }
};

// Template Role Service (optimized for role selection in templates)
export const templateRoleService = {
  // Get roles for template assignment with search
  async getRolesForTemplates(
    search?: string,
    limit: number = 50
  ): Promise<TemplateRole[]> {
    let query = supabase
      .from('department_roles')
      .select(`
        role_id,
        role_name,
        departments!inner(department_name),
        is_archived
      `)
      .eq('is_archived', false)
      .order('role_name')
      .limit(limit);

    if (search) {
      query = query.or(`role_name.ilike.%${search}%,departments.department_name.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(role => ({
      role_id: role.role_id,
      role_name: role.role_name,
      department_name: role.departments?.[0]?.department_name,
      is_archived: role.is_archived
    }));
  },

  // Get role by ID for display
  async getRoleById(roleId: string): Promise<TemplateRole | null> {
    const { data, error } = await supabase
      .from('department_roles')
      .select(`
        role_id,
        role_name,
        departments!inner(department_name),
        is_archived
      `)
      .eq('role_id', roleId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return {
      role_id: data.role_id,
      role_name: data.role_name,
      department_name: data.departments?.[0]?.department_name,
      is_archived: data.is_archived
    };
  }
};

// Template Role Usage Service
export const templateRoleUsageService = {
  // Get unique roles used in a template
  async getTemplateRoles(templateId: string): Promise<TemplateRoleUsage[]> {
    const { data, error } = await supabase
      .rpc('get_template_roles_with_details', { p_template_id: templateId });

    if (error) throw error;
    
    return (data || []).map((role: {
      template_role_id: string;
      role_id: string;
      role_name: string;
      department_name: string;
      role_usage_count: number;
      first_used_at: string;
      last_used_at: string;
    }) => ({
      template_role_id: role.template_role_id,
      template_id: templateId,
      role_id: role.role_id,
      role_name: role.role_name || 'Unknown Role',
      department_name: role.department_name,
      role_usage_count: role.role_usage_count,
      first_used_at: role.first_used_at,
      last_used_at: role.last_used_at
    }));
  },

  // Rebuild template roles from existing tasks (useful for migration or repair)
  async rebuildTemplateRoles(templateId: string): Promise<number> {
    const { data, error } = await supabase
      .rpc('rebuild_template_roles', { p_template_id: templateId });

    if (error) throw error;
    return data || 0;
  },

  // Get template role statistics
  async getTemplateRoleStats(templateId: string): Promise<{
    totalUniqueRoles: number;
    totalRoleAssignments: number;
    mostUsedRole?: TemplateRoleUsage;
    leastUsedRole?: TemplateRoleUsage;
  }> {
    const roles = await this.getTemplateRoles(templateId);
    
    if (roles.length === 0) {
      return {
        totalUniqueRoles: 0,
        totalRoleAssignments: 0
      };
    }

    const sortedByUsage = [...roles].sort((a, b) => b.role_usage_count - a.role_usage_count);
    const totalRoleAssignments = roles.reduce((sum, role) => sum + role.role_usage_count, 0);

    return {
      totalUniqueRoles: roles.length,
      totalRoleAssignments,
      mostUsedRole: sortedByUsage[0],
      leastUsedRole: sortedByUsage[sortedByUsage.length - 1]
    };
  },

  // Add role usage manually (if needed for special cases)
  async addRoleUsage(templateId: string, roleId: string): Promise<void> {
    const { error } = await supabase
      .rpc('add_template_role_usage', { 
        p_template_id: templateId, 
        p_role_id: roleId 
      });

    if (error) throw error;
  },

  // Remove role usage manually (if needed for special cases)
  async removeRoleUsage(templateId: string, roleId: string): Promise<void> {
    const { error } = await supabase
      .rpc('remove_template_role_usage', { 
        p_template_id: templateId, 
        p_role_id: roleId 
      });

    if (error) throw error;
  },

  // Update role usage when changing task assignments
  async updateRoleUsage(templateId: string, oldRoleId: string | null, newRoleId: string | null): Promise<void> {
    const { error } = await supabase
      .rpc('update_template_role_usage', { 
        p_template_id: templateId, 
        p_old_role_id: oldRoleId, 
        p_new_role_id: newRoleId 
      });

    if (error) throw error;
  }
};

// Copy/Clone Services
export const taskCopyService = {
  // Copy tasks from one step to another existing step
  async copyTasksToStep(
    sourceStepId: string,
    targetStepId: string,
    nameSuffix: string = 'Copy'
  ): Promise<{ success: boolean; copied_tasks_count: number; id_mapping: Record<string, string> }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase.rpc('copy_tasks_to_step', {
      source_step_id: sourceStepId,
      target_step_id: targetStepId,
      created_by_user: user.email || user.id,
      name_suffix: nameSuffix
    });

    if (error) throw new Error(`Failed to copy tasks: ${error.message}`);
    return data;
  },

  // Copy tasks from one step to a new step
  async copyTasksToNewStep(
    sourceStepId: string,
    targetPhaseId: string,
    newStepName: string,
    nameSuffix: string = 'Copy'
  ): Promise<PhaseStep> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // First create the new step
    const newStep = await phaseStepService.create({
      phase_id: targetPhaseId,
      step_name: newStepName,
      description: 'Created from copy operation'
    });

    // Then copy tasks to the new step
    await this.copyTasksToStep(sourceStepId, newStep.step_id, nameSuffix);

    return newStep;
  }
};

export const stepCopyService = {
  // Copy an entire step with all its tasks to another phase
  async copyStepToPhase(
    sourceStepId: string,
    targetPhaseId: string,
    newStepName?: string,
    taskNameSuffix: string = 'Copy'
  ): Promise<{
    success: boolean;
    new_step_id: string;
    new_step_name: string;
    tasks_result: { success: boolean; copied_tasks_count: number; id_mapping: Record<string, string> };
  }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase.rpc('copy_step_to_phase', {
      source_step_id: sourceStepId,
      target_phase_id: targetPhaseId,
      new_step_name: newStepName,
      created_by_user: user.email || user.id,
      task_name_suffix: taskNameSuffix
    });

    if (error) throw new Error(`Failed to copy step: ${error.message}`);
    return data;
  },

  // Get available target phases for copying (exclude the current phase)
  async getAvailableTargetPhases(templateId: string, excludePhaseId?: string): Promise<TemplatePhase[]> {
    let query = supabase
      .from('template_phases')
      .select('*')
      .eq('template_id', templateId)
      .eq('is_archived', false)
      .order('phase_order');

    if (excludePhaseId) {
      query = query.neq('phase_id', excludePhaseId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // Get available target steps for copying tasks
  async getAvailableTargetSteps(templateId: string): Promise<(PhaseStep & { phase_name: string; phase_order: number })[]> {
    let query = supabase
      .from('phase_steps')
      .select(`
        *,
        template_phases!inner(
          phase_name,
          phase_order,
          template_id
        )
      `)
      .eq('template_phases.template_id', templateId)
      .eq('is_archived', false);

    const { data, error } = await query;
    if (error) throw error;

    const steps = (data || []).map(step => ({
      ...step,
      phase_name: (step.template_phases as unknown as { phase_name: string; phase_order: number }[])[0]?.phase_name || '',
      phase_order: (step.template_phases as unknown as { phase_name: string; phase_order: number }[])[0]?.phase_order || 0
    }));

    // Sort by phase order then step order
    return steps.sort((a, b) => {
      if (a.phase_order !== b.phase_order) {
        return a.phase_order - b.phase_order;
      }
      return a.step_order - b.step_order;
    });
  }
};

// Phase Steps Service with enhanced methods for new UI
export const phaseStepServiceEnhanced = {
  ...phaseStepService,

  // Get steps by phase ID for selection in task creation
  async getByPhaseIdForSelection(phaseId: string): Promise<PhaseStep[]> {
    const { data, error } = await supabase
      .from('phase_steps')
      .select('*')
      .eq('phase_id', phaseId)
      .eq('is_archived', false)
      .order('step_order');

    if (error) throw error;
    return data || [];
  }
};
