import supabase from '../supabase';
import type { 
  CallSheetDB, 
  CallSheetCompleteDB,
  CreateCallSheetDB,
  CreateTimeTableItemDB,
  CreateLocationDB,
  CreateScheduleItemDB,
  CallSheetFilters,
  CallSheetQueryOptions,
  CallSheetListResponse,
  CallSheetResponse,
  CallSheetMutationResponse
} from './database/callsheet';
import type { CallSheetFormData } from './callsheet';

export class CallSheetService {
  // =====================================================
  // CRUD Operations for Call Sheets
  // =====================================================

  /**
   * Create a new call sheet with all related data
   */
  async createCallSheet(formData: CallSheetFormData, userId?: string): Promise<CallSheetMutationResponse> {
    try {
      // Start a transaction by creating the main call sheet first
      const callSheetData: CreateCallSheetDB = {
        project_name: formData.project_name,
        date: formData.date,
        time: formData.time,
        description: formData.description || undefined,
        status: this.determineStatus(formData.date),
        created_by: userId,
      };

      const { data: callSheet, error: callSheetError } = await supabase
        .from('call_sheets')
        .insert(callSheetData)
        .select()
        .single();

      if (callSheetError) {
        throw new Error(`Failed to create call sheet: ${callSheetError.message}`);
      }

      // Insert related data
      await Promise.all([
        this.insertTimeTableItems(callSheet.id, formData.time_table),
        this.insertLocations(callSheet.id, formData.location),
        this.insertScheduleItems(callSheet.id, formData.schedule),
        this.insertCrewAssignments(callSheet.id, formData.crew_ids),
      ]);

      return {
        data: callSheet,
        success: true,
        message: 'Call sheet created successfully',
      };
    } catch (error) {
      console.error('Error creating call sheet:', error);
      return {
        data: {} as CallSheetDB,
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create call sheet',
      };
    }
  }

  /**
   * Update an existing call sheet
   */
  async updateCallSheet(id: string, formData: CallSheetFormData): Promise<CallSheetMutationResponse> {
    try {
      // Update main call sheet
      const updateData: Partial<CreateCallSheetDB> = {
        project_name: formData.project_name,
        date: formData.date,
        time: formData.time,
        description: formData.description || undefined,
        status: this.determineStatus(formData.date),
      };

      const { data: callSheet, error: updateError } = await supabase
        .from('call_sheets')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update call sheet: ${updateError.message}`);
      }

      // Delete existing related data and insert new ones
      await Promise.all([
        this.deleteRelatedData(id),
      ]);

      await Promise.all([
        this.insertTimeTableItems(id, formData.time_table),
        this.insertLocations(id, formData.location),
        this.insertScheduleItems(id, formData.schedule),
        this.insertCrewAssignments(id, formData.crew_ids),
      ]);

      return {
        data: callSheet,
        success: true,
        message: 'Call sheet updated successfully',
      };
    } catch (error) {
      console.error('Error updating call sheet:', error);
      return {
        data: {} as CallSheetDB,
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update call sheet',
      };
    }
  }

  /**
   * Get call sheet by ID with all related data
   */
  async getCallSheetById(id: string): Promise<CallSheetResponse> {
    try {
      const { data, error } = await supabase
        .from('call_sheets_complete')
        .select('*')
        .eq('id', id)
        .single();

      // Handle case where view doesn't exist
      if (error && error.message.includes('does not exist')) {
        console.warn('call_sheets_complete view does not exist');
        return {
          data: {} as CallSheetCompleteDB,
          success: false,
          message: 'Call sheet view not available',
        };
      }

      if (error) {
        throw new Error(`Call sheet not found: ${error.message}`);
      }

      return {
        data,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching call sheet:', error);
      return {
        data: {} as CallSheetCompleteDB,
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch call sheet',
      };
    }
  }

  /**
   * Get list of call sheets with filtering and pagination
   */
  async getCallSheets(
    filters: CallSheetFilters = {},
    options: CallSheetQueryOptions = {}
  ): Promise<CallSheetListResponse> {
    try {
      const {
        limit = 20,
        offset = 0,
        order_by = 'created_at',
        order_direction = 'desc',
        include_relations = true,
      } = options;

      // Use count query for better performance on large datasets
      let countQuery = supabase
        .from('call_sheets')
        .select('*', { count: 'exact', head: true });

      let dataQuery = supabase
        .from(include_relations ? 'call_sheets_complete' : 'call_sheets')
        .select('*');

      // Apply filters to both queries
      const applyFilters = (query: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (filters.status) {
          query = query.eq('status', filters.status);
        }
        if (filters.date_from) {
          query = query.gte('date', filters.date_from);
        }
        if (filters.date_to) {
          query = query.lte('date', filters.date_to);
        }
        if (filters.project_name) {
          query = query.ilike('project_name', `%${filters.project_name}%`);
        }
        if (filters.created_by) {
          query = query.eq('created_by', filters.created_by);
        }
        if (filters.crew_id) {
          // This would need a join or subquery in a real implementation
          // For now, we'll handle this in a separate method if needed
        }
        if (filters.search) {
          // Use full-text search for better performance
          query = query.or(`project_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
        }
        return query;
      };

      // Apply filters
      countQuery = applyFilters(countQuery);
      dataQuery = applyFilters(dataQuery);

      // Apply sorting and pagination to data query
      dataQuery = dataQuery
        .order(order_by, { ascending: order_direction === 'asc' })
        .range(offset, offset + limit - 1);

      // Execute queries in parallel for better performance
      const [countResult, dataResult] = await Promise.all([
        countQuery,
        dataQuery
      ]);

      // Handle case where view doesn't exist - fallback to empty results
      if (dataResult.error && dataResult.error.message.includes('does not exist')) {
        console.warn('call_sheets_complete view does not exist, returning empty results');
        return {
          data: [],
          total: 0,
          page: 1,
          limit,
          has_more: false,
          total_pages: 0,
          offset,
        };
      }

      if (countResult.error) {
        throw new Error(`Failed to count call sheets: ${countResult.error.message}`);
      }

      if (dataResult.error) {
        throw new Error(`Failed to fetch call sheets: ${dataResult.error.message}`);
      }

      const total = countResult.count || 0;
      const page = Math.floor(offset / limit) + 1;
      const has_more = offset + limit < total;
      const total_pages = Math.ceil(total / limit);

      return {
        data: dataResult.data || [],
        total,
        page,
        limit,
        has_more,
        total_pages,
        offset,
      };
    } catch (error) {
      console.error('Error fetching call sheets:', error);
      return {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        has_more: false,
        total_pages: 0,
        offset: 0,
      };
    }
  }

  /**
   * Delete a call sheet and all related data
   */
  async deleteCallSheet(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase
        .from('call_sheets')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete call sheet: ${error.message}`);
      }

      return {
        success: true,
        message: 'Call sheet deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting call sheet:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete call sheet',
      };
    }
  }

  // =====================================================
  // Helper Methods
  // =====================================================

  /**
   * Insert time table items for a call sheet
   */
  private async insertTimeTableItems(callSheetId: string, timeTable: CallSheetFormData['time_table']) {
    if (!timeTable || timeTable.length === 0) return; // Allow empty arrays

    // Filter out empty items
    const validItems = timeTable.filter(item => item.item.trim() !== '' && item.date.trim() !== '');
    if (validItems.length === 0) return;

    const items: CreateTimeTableItemDB[] = validItems.map((item, index) => ({
      call_sheet_id: callSheetId,
      item: item.item,
      time: item.date, // Note: 'date' field in form contains time value
      sort_order: index + 1,
    }));

    const { error } = await supabase
      .from('call_sheet_time_table')
      .insert(items);

    if (error) {
      throw new Error(`Failed to insert time table items: ${error.message}`);
    }
  }

  /**
   * Insert locations for a call sheet
   */
  private async insertLocations(callSheetId: string, locations: CallSheetFormData['location']) {
    if (!locations || locations.length === 0) return; // Allow empty arrays

    // Filter out empty locations
    const validLocations = locations.filter(loc => 
      loc.location_title.trim() !== '' && 
      loc.address.trim() !== '' && 
      loc.contact_number.trim() !== ''
    );
    if (validLocations.length === 0) return;

    const items: CreateLocationDB[] = validLocations.map((location, index) => ({
      call_sheet_id: callSheetId,
      location_title: location.location_title,
      address: location.address,
      link: location.link || undefined,
      contact_number: location.contact_number,
      sort_order: index + 1,
    }));

    const { error } = await supabase
      .from('call_sheet_locations')
      .insert(items);

    if (error) {
      throw new Error(`Failed to insert locations: ${error.message}`);
    }
  }

  /**
   * Insert schedule items for a call sheet
   */
  private async insertScheduleItems(callSheetId: string, schedule: CallSheetFormData['schedule']) {
    if (!schedule || schedule.length === 0) return;

    const items: CreateScheduleItemDB[] = schedule.map((item, index) => ({
      call_sheet_id: callSheetId,
      time: item.time,
      scene: item.scene,
      description: item.description,
      sort_order: index + 1,
    }));

    const { error } = await supabase
      .from('call_sheet_schedule')
      .insert(items);

    if (error) {
      throw new Error(`Failed to insert schedule items: ${error.message}`);
    }
  }

  /**
   * Insert crew assignments for a call sheet
   */
  private async insertCrewAssignments(callSheetId: string, crewIds: string[]) {
    if (!crewIds || crewIds.length === 0) return;

    const items = crewIds.map(crewId => ({
      call_sheet_id: callSheetId,
      crew_id: crewId,
    }));

    const { error } = await supabase
      .from('call_sheet_crew')
      .insert(items);

    if (error) {
      throw new Error(`Failed to insert crew assignments: ${error.message}`);
    }
  }

  /**
   * Delete all related data for a call sheet
   */
  private async deleteRelatedData(callSheetId: string) {
    await Promise.all([
      supabase.from('call_sheet_time_table').delete().eq('call_sheet_id', callSheetId),
      supabase.from('call_sheet_locations').delete().eq('call_sheet_id', callSheetId),
      supabase.from('call_sheet_schedule').delete().eq('call_sheet_id', callSheetId),
      supabase.from('call_sheet_crew').delete().eq('call_sheet_id', callSheetId),
    ]);
  }

  /**
   * Determine call sheet status based on date
   */
  private determineStatus(date: string): 'upcoming' | 'expired' | 'active' {
    const callSheetDate = new Date(date);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    if (date === todayStr) {
      return 'active';
    } else if (callSheetDate > today) {
      return 'upcoming';
    } else {
      return 'expired';
    }
  }

  // =====================================================
  // Data Transformation Methods
  // =====================================================

  /**
   * Convert database call sheet to form data format
   */
  dbToFormData(dbData: CallSheetCompleteDB): CallSheetFormData {
    return {
      project_name: dbData.project_name,
      date: dbData.date,
      time: dbData.time,
      description: dbData.description || '',
      time_table: dbData.time_table?.map(item => ({
        item: item.item,
        date: item.time, // Note: mapping time back to 'date' field for form compatibility
      })) || [], // Empty array instead of default item
      location: dbData.locations?.map(loc => ({
        location_title: loc.location_title,
        link: loc.link || '',
        address: loc.address,
        contact_number: loc.contact_number,
      })) || [], // Empty array instead of default item
      schedule: dbData.schedule?.map(sch => ({
        time: sch.time,
        scene: sch.scene,
        description: sch.description,
      })) || [{ time: '', scene: '', description: '' }],
      crew_ids: dbData.crew?.map(crew => crew.crew_id) || [],
    };
  }

  /**
   * Get recent call sheets (upcoming and active only)
   */
  async getRecentCallSheets(limit = 20, offset = 0): Promise<CallSheetListResponse> {
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM format

      // Skip status update to prevent infinite loops
      // await this.updateExpiredStatuses();

      // Get call sheets that are still upcoming or active
      const query = supabase
        .from('call_sheets_complete')
        .select('*')
        .or(`date.gt.${today},and(date.eq.${today},time.gte.${currentTime})`)
        .in('status', ['upcoming', 'active'])
        .order('date', { ascending: true })
        .order('time', { ascending: true })
        .range(offset, offset + limit - 1);

      // Get count for pagination
      const countQuery = supabase
        .from('call_sheets')
        .select('*', { count: 'exact', head: true })
        .or(`date.gt.${today},and(date.eq.${today},time.gte.${currentTime})`)
        .in('status', ['upcoming', 'active']);

      const [dataResult, countResult] = await Promise.all([query, countQuery]);

      // Handle case where view doesn't exist - fallback to empty results
      if (dataResult.error && dataResult.error.message.includes('does not exist')) {
        console.warn('call_sheets_complete view does not exist, returning empty results');
        return {
          data: [],
          total: 0,
          page: 1,
          limit,
          has_more: false,
          total_pages: 0,
          offset,
        };
      }

      if (dataResult.error) {
        throw new Error(`Failed to fetch recent call sheets: ${dataResult.error.message}`);
      }

      if (countResult.error) {
        throw new Error(`Failed to count recent call sheets: ${countResult.error.message}`);
      }

      const total = countResult.count || 0;
      const page = Math.floor(offset / limit) + 1;
      const has_more = offset + limit < total;
      const total_pages = Math.ceil(total / limit);

      return {
        data: dataResult.data || [],
        total,
        page,
        limit,
        has_more,
        total_pages,
        offset,
      };
    } catch (error) {
      console.error('Error fetching recent call sheets:', error);
      return {
        data: [],
        total: 0,
        page: 1,
        limit,
        has_more: false,
        total_pages: 0,
        offset,
      };
    }
  }

  /**
   * Get expired call sheets
   */
  async getExpiredCallSheets(limit = 20, offset = 0): Promise<CallSheetListResponse> {
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM format

      console.log('Expired query params:', { today, currentTime });

      // Skip status update to prevent infinite loops
      // await this.updateExpiredStatuses();

      // Get call sheets that have expired (past date or past time today)
      // Don't filter by status - include all sheets that should be expired by time
      const query = supabase
        .from('call_sheets_complete')
        .select('*')
        .or(`date.lt.${today},and(date.eq.${today},time.lt.${currentTime})`)
        .order('date', { ascending: false })
        .order('time', { ascending: false })
        .range(offset, offset + limit - 1);

      // Get count for pagination
      const countQuery = supabase
        .from('call_sheets')
        .select('*', { count: 'exact', head: true })
        .or(`date.lt.${today},and(date.eq.${today},time.lt.${currentTime})`);

      const [dataResult, countResult] = await Promise.all([query, countQuery]);

      // Handle case where view doesn't exist - fallback to empty results
      if (dataResult.error && dataResult.error.message.includes('does not exist')) {
        console.warn('call_sheets_complete view does not exist, returning empty results');
        return {
          data: [],
          total: 0,
          page: 1,
          limit,
          has_more: false,
          total_pages: 0,
          offset,
        };
      }

      if (dataResult.error) {
        console.error('Expired query error:', dataResult.error);
        throw new Error(`Failed to fetch expired call sheets: ${dataResult.error.message}`);
      }

      if (countResult.error) {
        console.error('Expired count error:', countResult.error);
        throw new Error(`Failed to count expired call sheets: ${countResult.error.message}`);
      }

      const total = countResult.count || 0;
      const page = Math.floor(offset / limit) + 1;
      const has_more = offset + limit < total;
      const total_pages = Math.ceil(total / limit);

      console.log('Expired call sheets result:', { total, dataCount: dataResult.data?.length });

      return {
        data: dataResult.data || [],
        total,
        page,
        limit,
        has_more,
        total_pages,
        offset,
      };
    } catch (error) {
      console.error('Error fetching expired call sheets:', error);
      return {
        data: [],
        total: 0,
        page: 1,
        limit,
        has_more: false,
        total_pages: 0,
        offset,
      };
    }
  }

  /**
   * Search call sheets with advanced filtering
   */
  async searchCallSheets(
    searchTerm: string,
    filters: Omit<CallSheetFilters, 'search'> = {},
    options: CallSheetQueryOptions = {}
  ): Promise<CallSheetListResponse> {
    return this.getCallSheets(
      {
        ...filters,
        search: searchTerm,
      },
      {
        limit: 20,
        ...options,
      }
    );
  }

  /**
   * Get call sheets by status with pagination
   */
  async getCallSheetsByStatus(
    status: 'draft' | 'active' | 'upcoming' | 'expired' | 'archived',
    limit = 20,
    offset = 0
  ): Promise<CallSheetListResponse> {
    return this.getCallSheets(
      { status },
      {
        limit,
        offset,
        order_by: 'date',
        order_direction: status === 'expired' ? 'desc' : 'asc',
      }
    );
  }

  /**
   * Update expired call sheet statuses based on current date/time
   */
  async updateExpiredStatuses(): Promise<{ updated: number; success: boolean }> {
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM format

      // First check if table exists by doing a simple select
      const { error: tableCheckError } = await supabase
        .from('call_sheets')
        .select('id')
        .limit(1);

      if (tableCheckError) {
        console.warn('Call sheets table not accessible:', tableCheckError.message);
        return {
          updated: 0,
          success: false,
        };
      }

      // Update call sheets that have passed their date/time
      const { data, error } = await supabase
        .from('call_sheets')
        .update({ status: 'expired' })
        .or(`date.lt.${today},and(date.eq.${today},time.lt.${currentTime})`)
        .in('status', ['upcoming', 'active'])
        .select('id');

      if (error) {
        console.warn(`Failed to update expired statuses: ${error.message}`);
        return {
          updated: 0,
          success: false,
        };
      }

      // Update today's call sheets to active if they haven't started yet
      const { data: activeData, error: activeError } = await supabase
        .from('call_sheets')
        .update({ status: 'active' })
        .eq('date', today)
        .gte('time', currentTime)
        .eq('status', 'upcoming')
        .select('id');

      if (activeError) {
        console.warn('Warning updating active statuses:', activeError.message);
      }

      const totalUpdated = (data?.length || 0) + (activeData?.length || 0);

      return {
        updated: totalUpdated,
        success: true,
      };
    } catch (error) {
      console.warn('Error updating expired statuses:', error);
      return {
        updated: 0,
        success: false,
      };
    }
  }

  /**
   * Get accurate status based on current date and time
   */
  getCurrentStatus(date: string, time: string): 'upcoming' | 'active' | 'expired' {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM format

    if (date < today) {
      return 'expired';
    } else if (date === today) {
      if (time < currentTime) {
        return 'expired';
      } else {
        return 'active';
      }
    } else {
      return 'upcoming';
    }
  }

  /**
   * Get statistics for dashboard (optimized for large datasets)
   */
  async getCallSheetStats(): Promise<{
    total: number;
    active: number;
    upcoming: number;
    expired: number;
    recent: number;
  }> {
    try {
      // First update expired statuses to ensure accurate counts
      await this.updateExpiredStatuses();

      // Use aggregation query for better performance on large datasets
      const { data, error } = await supabase
        .from('call_sheets')
        .select('status, created_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days for recent stats

      if (error) throw error;

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const stats = {
        total: data.length,
        active: data.filter(cs => cs.status === 'active').length,
        upcoming: data.filter(cs => cs.status === 'upcoming').length,
        expired: data.filter(cs => cs.status === 'expired').length,
        recent: data.filter(cs => new Date(cs.created_at) >= weekAgo).length,
      };

      return stats;
    } catch (error) {
      console.error('Error fetching call sheet stats:', error);
      return { total: 0, active: 0, upcoming: 0, expired: 0, recent: 0 };
    }
  }
}

// Export a singleton instance
export const callSheetService = new CallSheetService();
