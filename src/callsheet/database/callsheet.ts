// =====================================================
// Database Types for Call Sheet System
// =====================================================

export interface CallSheetDB {
  id: string;
  project_name: string;
  date: string; // DATE type from database
  time: string; // TIME type from database
  description?: string;
  status: 'draft' | 'active' | 'upcoming' | 'expired' | 'archived';
  created_by?: string; // UUID reference to crew
  created_at: string; // TIMESTAMPTZ
  updated_at: string; // TIMESTAMPTZ
}

export interface CallSheetTimeTableDB {
  id: string;
  call_sheet_id: string;
  item: string;
  time: string; // TIME type
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CallSheetLocationDB {
  id: string;
  call_sheet_id: string;
  location_title: string;
  address: string;
  link?: string;
  contact_number: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CallSheetScheduleDB {
  id: string;
  call_sheet_id: string;
  time: string; // TIME type
  scene: string;
  description: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Complete call sheet with all relations (matches the database view)
export interface CallSheetCompleteDB extends CallSheetDB {
  time_table: CallSheetTimeTableDB[];
  locations: CallSheetLocationDB[];
  schedule: CallSheetScheduleDB[];
  crew: CallSheetCrewDB[];
}

// =====================================================
// Create/Update Types (without system-generated fields)
// =====================================================

export interface CreateCallSheetDB {
  project_name: string;
  date: string;
  time: string;
  description?: string;
  status?: 'draft' | 'active' | 'upcoming' | 'expired' | 'archived';
  created_by?: string;
}

export interface UpdateCallSheetDB extends Partial<CreateCallSheetDB> {
  id: string;
}

export interface CreateTimeTableItemDB {
  call_sheet_id: string;
  item: string;
  time: string;
  sort_order?: number;
}

export interface UpdateTimeTableItemDB extends Partial<CreateTimeTableItemDB> {
  id: string;
}

export interface CreateLocationDB {
  call_sheet_id: string;
  location_title: string;
  address: string;
  link?: string;
  contact_number: string;
  sort_order?: number;
}

export interface UpdateLocationDB extends Partial<CreateLocationDB> {
  id: string;
}

export interface CreateScheduleItemDB {
  call_sheet_id: string;
  time: string;
  scene: string;
  description: string;
  sort_order?: number;
}

export interface UpdateScheduleItemDB extends Partial<CreateScheduleItemDB> {
  id: string;
}

export interface CallSheetCrewDB {
  id: string;
  call_sheet_id: string;
  crew_id: string;
  created_at: string;
}

export interface CreateCallSheetCrewDB {
  call_sheet_id: string;
  crew_id: string;
}

// =====================================================
// Transformation Types (for converting between DB and Form)
// =====================================================

export interface CallSheetWithRelations {
  callSheet: CallSheetDB;
  timeTable: CallSheetTimeTableDB[];
  locations: CallSheetLocationDB[];
  schedule: CallSheetScheduleDB[];
  crew: CallSheetCrewDB[];
}

// =====================================================
// Database Query Types
// =====================================================

export interface CallSheetFilters {
  status?: 'draft' | 'active' | 'upcoming' | 'expired' | 'archived';
  date_from?: string;
  date_to?: string;
  project_name?: string;
  created_by?: string;
  crew_id?: string; // Filter by assigned crew member
  search?: string; // For general text search
}

export interface CallSheetQueryOptions {
  limit?: number;
  offset?: number;
  order_by?: 'date' | 'created_at' | 'updated_at' | 'project_name';
  order_direction?: 'asc' | 'desc';
  include_relations?: boolean;
}

// =====================================================
// Response Types
// =====================================================

export interface CallSheetListResponse {
  data: CallSheetCompleteDB[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
  total_pages: number;
  offset: number;
}

export interface CallSheetResponse {
  data: CallSheetCompleteDB;
  success: boolean;
  message?: string;
}

export interface CallSheetMutationResponse {
  data: CallSheetDB;
  success: boolean;
  message: string;
}
