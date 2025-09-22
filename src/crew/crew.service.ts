import supabase from '../supabase';
import type { crewType } from './crew.type';

export interface CreateCrewData {
  name: string;
  email: string;
  user_id?: string;
  phone?: string;
  whatsapp?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  address?: string;
  dob?: string;
  gender?: 'male' | 'female' | 'other';
  marital_status?: 'single' | 'married' | 'divorced' | 'widowed';
  nationality?: string;
  religion?: string;
  hire_date?: string;
  employment_status?: 'active' | 'inactive' | 'terminated' | 'on_leave';
  education?: string;
  experience?: string;
  skills?: string;
  certifications?: string;
  languages?: string;
  interests?: string;
  hobbies?: string;
  achievements?: string;
  awards?: string;
  dietary_preference?: 'vegan' | 'vegetarian' | 'non-vegetarian';
  medical_conditions?: string;
  allergies?: string;
  disabilities?: string;
  other_info?: string;
  notes?: string;
  status?: boolean;
  created_by: string;
}

export interface UpdateCrewData extends Partial<CreateCrewData> {
  updated_by: string;
}

export const crewService = {
  async getAllCrew(includeArchived = false): Promise<crewType[]> {
    let query = supabase
      .from('crew_with_details')
      .select('*')
      .order('created_at', { ascending: false });

    if (!includeArchived) {
      query = query.eq('is_archived', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching crew:', error);
      throw error;
    }

    return (data as Record<string, unknown>[])?.map(crew => ({
      id: crew.id as string,
      name: crew.name as string,
      email: crew.email as string,
      user_id: crew.user_id as number,
      phone: crew.phone as string | null,
      whatsapp: crew.whatsapp as string | null,
      photo_url: crew.photo_url as string | null,
      emergency_contact_name: crew.emergency_contact_name as string | null,
      emergency_contact_phone: crew.emergency_contact_phone as string | null,
      address: crew.address as string | null,
      DOB: crew.dob as string | null,
      gender: crew.gender as 'male' | 'female' | 'other' | null,
      marital_status: crew.marital_status as 'single' | 'married' | 'divorced' | 'widowed' | null,
      nationality: crew.nationality as string | null,
      religion: crew.religion as string | null,
      hire_date: crew.hire_date as string | null,
      employment_status: crew.employment_status as 'active' | 'inactive' | 'terminated' | 'on_leave' | null,
      education: crew.education as string | null,
      experience: crew.experience as string | null,
      skills: crew.skills as string | null,
      certifications: crew.certifications as string | null,
      languages: crew.languages as string | null,
      interests: crew.interests as string | null,
      hobbies: crew.hobbies as string | null,
      achievements: crew.achievements as string | null,
      awards: crew.awards as string | null,
      dietary_preference: crew.dietary_preference as 'vegan' | 'vegetarian' | 'non-vegetarian' | null,
      medical_conditions: crew.medical_conditions as string | null,
      allergies: crew.allergies as string | null,
      disabilities: crew.disabilities as string | null,
      other_info: crew.other_info as string | null,
      notes: crew.notes as string | null,
      status: crew.status as boolean | null,
      is_archived: crew.is_archived as boolean,
      last_login: crew.last_login as string | null,
      created_at: crew.created_at as string,
      updated_at: crew.updated_at as string,
      created_by: crew.created_by as string | null,
      updated_by: crew.updated_by as string | null,
      roles: (crew.roles as { department_id: string; role_id: string }[])?.filter((role: { department_id: string }) => role.department_id).map(role => ({
        department: role.department_id,
        role: role.role_id
      })) || [],
      reporting_manager: (crew.reporting_manager as { manager_id?: string; department_id?: string; role_id?: string })?.manager_id ? {
        department: (crew.reporting_manager as { manager_id?: string; department_id?: string; role_id?: string }).department_id || '',
        role: (crew.reporting_manager as { manager_id?: string; department_id?: string; role_id?: string }).role_id || ''
      } : null
    })) || [];
  },

  async getCrewById(id: string): Promise<crewType | null> {
    const { data, error } = await supabase
      .from('crew_with_details')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching crew by id:', error);
      throw error;
    }

    if (!data) return null;

    return {
      id: data.id as string,
      name: data.name as string,
      email: data.email as string,
      user_id: data.user_id as number,
      phone: data.phone as string | null,
      whatsapp: data.whatsapp as string | null,
      photo_url: data.photo_url as string | null,
      emergency_contact_name: data.emergency_contact_name as string | null,
      emergency_contact_phone: data.emergency_contact_phone as string | null,
      address: data.address as string | null,
      DOB: data.dob as string | null,
      gender: data.gender as 'male' | 'female' | 'other' | null,
      marital_status: data.marital_status as 'single' | 'married' | 'divorced' | 'widowed' | null,
      nationality: data.nationality as string | null,
      religion: data.religion as string | null,
      hire_date: data.hire_date as string | null,
      employment_status: data.employment_status as 'active' | 'inactive' | 'terminated' | 'on_leave' | null,
      education: data.education as string | null,
      experience: data.experience as string | null,
      skills: data.skills as string | null,
      certifications: data.certifications as string | null,
      languages: data.languages as string | null,
      interests: data.interests as string | null,
      hobbies: data.hobbies as string | null,
      achievements: data.achievements as string | null,
      awards: data.awards as string | null,
      dietary_preference: data.dietary_preference as 'vegan' | 'vegetarian' | 'non-vegetarian' | null,
      medical_conditions: data.medical_conditions as string | null,
      allergies: data.allergies as string | null,
      disabilities: data.disabilities as string | null,
      other_info: data.other_info as string | null,
      notes: data.notes as string | null,
      status: data.status as boolean | null,
      is_archived: data.is_archived as boolean,
      last_login: data.last_login as string | null,
      created_at: data.created_at as string,
      updated_at: data.updated_at as string,
      created_by: data.created_by as string | null,
      updated_by: data.updated_by as string | null,
      roles: (data.roles as { department_id: string; role_id: string }[])?.filter((role: { department_id: string }) => role.department_id).map(role => ({
        department: role.department_id,
        role: role.role_id
      })) || [],
      reporting_manager: (data.reporting_manager as { manager_id?: string; department_id?: string; role_id?: string })?.manager_id ? {
        department: (data.reporting_manager as { manager_id?: string; department_id?: string; role_id?: string }).department_id || '',
        role: (data.reporting_manager as { manager_id?: string; department_id?: string; role_id?: string }).role_id || ''
      } : null
    };
  },

  async createCrew(crewData: CreateCrewData): Promise<crewType> {
    // Create the crew member
    const { data: crew, error: crewError } = await supabase
      .from('crew')
      .insert([{
        ...crewData,
        dob: crewData.dob || null,
        hire_date: crewData.hire_date || null
      }])
      .select()
      .single();

    if (crewError) {
      console.error('Error creating crew:', crewError);
      throw crewError;
    }

    return this.getCrewById(crew.id) as Promise<crewType>;
  },

  async updateCrew(id: string, crewData: UpdateCrewData): Promise<crewType> {
    // Update the crew member
    const { error: crewError } = await supabase
      .from('crew')
      .update({
        ...crewData,
        dob: crewData.dob || null,
        hire_date: crewData.hire_date || null
      })
      .eq('id', id)
      .select()
      .single();

    if (crewError) {
      console.error('Error updating crew:', crewError);
      throw crewError;
    }

    return this.getCrewById(id) as Promise<crewType>;
  },

  async archiveCrew(id: string, updated_by: string): Promise<void> {
    const { error } = await supabase
      .from('crew')
      .update({ 
        is_archived: true,
        status: false,
        updated_by 
      })
      .eq('id', id);

    if (error) {
      console.error('Error archiving crew:', error);
      throw error;
    }
  },

  async unarchiveCrew(id: string, updated_by: string): Promise<void> {
    const { error } = await supabase
      .from('crew')
      .update({ 
        is_archived: false,
        status: true,
        updated_by 
      })
      .eq('id', id);

    if (error) {
      console.error('Error unarchiving crew:', error);
      throw error;
    }
  },

  async uploadProfilePicture(crewId: string, file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${crewId}-${Date.now()}.${fileExt}`;
    const filePath = `crew-profiles/${fileName}`;

    // Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('crew-photos')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading profile picture:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data } = supabase.storage
      .from('crew-photos')
      .getPublicUrl(filePath);

    // Update crew record with photo URL
    const { error: updateError } = await supabase
      .from('crew')
      .update({ photo_url: data.publicUrl })
      .eq('id', crewId);

    if (updateError) {
      console.error('Error updating crew photo URL:', updateError);
      throw updateError;
    }

    return data.publicUrl;
  },

  async deleteProfilePicture(crewId: string): Promise<void> {
    // Get current photo URL
    const { data: crew, error: fetchError } = await supabase
      .from('crew')
      .select('photo_url')
      .eq('id', crewId)
      .single();

    if (fetchError || !crew?.photo_url) {
      return;
    }

    // Extract file path from URL
    const urlParts = crew.photo_url.split('/');
    const filePath = `crew-profiles/${urlParts[urlParts.length - 1]}`;

    // Delete file from storage
    const { error: deleteError } = await supabase.storage
      .from('crew-photos')
      .remove([filePath]);

    if (deleteError) {
      console.error('Error deleting profile picture from storage:', deleteError);
    }

    // Update crew record to remove photo URL
    const { error: updateError } = await supabase
      .from('crew')
      .update({ photo_url: null })
      .eq('id', crewId);

    if (updateError) {
      console.error('Error removing photo URL from crew record:', updateError);
      throw updateError;
    }
  },

  async searchCrew(searchTerm: string, includeArchived = false): Promise<crewType[]> {
    let query = supabase
      .from('crew_with_details')
      .select('*')
      .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false });

    if (!includeArchived) {
      query = query.eq('is_archived', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error searching crew:', error);
      throw error;
    }

    return (data as Record<string, unknown>[])?.map(crew => ({
      id: crew.id as string,
      name: crew.name as string,
      email: crew.email as string,
      user_id: crew.user_id as number,
      phone: crew.phone as string | null,
      whatsapp: crew.whatsapp as string | null,
      photo_url: crew.photo_url as string | null,
      emergency_contact_name: crew.emergency_contact_name as string | null,
      emergency_contact_phone: crew.emergency_contact_phone as string | null,
      address: crew.address as string | null,
      DOB: crew.dob as string | null,
      gender: crew.gender as 'male' | 'female' | 'other' | null,
      marital_status: crew.marital_status as 'single' | 'married' | 'divorced' | 'widowed' | null,
      nationality: crew.nationality as string | null,
      religion: crew.religion as string | null,
      hire_date: crew.hire_date as string | null,
      employment_status: crew.employment_status as 'active' | 'inactive' | 'terminated' | 'on_leave' | null,
      education: crew.education as string | null,
      experience: crew.experience as string | null,
      skills: crew.skills as string | null,
      certifications: crew.certifications as string | null,
      languages: crew.languages as string | null,
      interests: crew.interests as string | null,
      hobbies: crew.hobbies as string | null,
      achievements: crew.achievements as string | null,
      awards: crew.awards as string | null,
      dietary_preference: crew.dietary_preference as 'vegan' | 'vegetarian' | 'non-vegetarian' | null,
      medical_conditions: crew.medical_conditions as string | null,
      allergies: crew.allergies as string | null,
      disabilities: crew.disabilities as string | null,
      other_info: crew.other_info as string | null,
      notes: crew.notes as string | null,
      status: crew.status as boolean | null,
      is_archived: crew.is_archived as boolean,
      last_login: crew.last_login as string | null,
      created_at: crew.created_at as string,
      updated_at: crew.updated_at as string,
      created_by: crew.created_by as string | null,
      updated_by: crew.updated_by as string | null,
      roles: (crew.roles as { department_id: string; role_id: string }[])?.filter((role: { department_id: string }) => role.department_id).map(role => ({
        department: role.department_id,
        role: role.role_id
      })) || [],
      reporting_manager: (crew.reporting_manager as { manager_id?: string; department_id?: string; role_id?: string })?.manager_id ? {
        department: (crew.reporting_manager as { manager_id?: string; department_id?: string; role_id?: string }).department_id || '',
        role: (crew.reporting_manager as { manager_id?: string; department_id?: string; role_id?: string }).role_id || ''
      } : null
    })) || [];
  }
};
