export type crewType = {
    id: string; // UUID
    name: string;
    email: string;
    roles?: {        
        department: string; // uuid from departments table
        role: string; // uuid from department_roles table
    }[] | null; 
    reporting_manager?: {
        department: string;
        role: string;
    } | null;
    status?: boolean | null;
    is_archived: boolean ; // default false
    last_login?: string | null; // ISO timestamp string
    created_at?: string; // ISO timestamp string
    updated_at?: string; // ISO timestamp string
    created_by?: string | null; // UUID
    updated_by?: string | null; // UUID
    photo_url?: string | null;
    user_id: number; // uuid from auth.users table
    phone?: string | null;
    whatsapp?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
    address?: string | null;
    notes?: string | null;
    hire_date?: string | null; // ISO date string
    employment_status?: 'active' | 'inactive' | 'terminated' | 'on_leave' | null;
    DOB?: string | null; // ISO date string
    gender?: 'male' | 'female' | 'other' | null;
    marital_status?: 'single' | 'married' | 'divorced' | 'widowed' | null;
    nationality?: string | null;
    religion?: string | null;
    education?: string | null;
    experience?: string | null;
    skills?: string | null;
    certifications?: string | null;
    languages?: string | null;
    interests?: string | null;
    hobbies?: string | null;
    achievements?: string | null;
    awards?: string | null;
    dietary_preference: "vegan" | "vegetarian" | "non-vegetarian" | null;
    medical_conditions?: string | null;
    allergies?: string | null;
    disabilities?: string | null;
    other_info?: string | null;
  };
  