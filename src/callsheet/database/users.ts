// Database User type - matches the actual database schema
export interface DatabaseUser {
  id: string; // UUID
  user_id: number; // bigint identity
  name: string;
  email: string;
  role: string;
  department: string;
  reporting_manager: string | null;
  status: boolean;
  photo_url: string | null;
  last_login: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

// Mapped User type for application use
export interface User {
  userId: string; // Maps from id
  userName: string; // Maps from name
  email: string;
  role: string;
  departmentId: string; // Maps from department (assuming department name)
  departmentName: string; // Also from department
  reportingManager: string | null; // Maps from reporting_manager
  status: boolean;
  photoUrl: string | null; // Maps from photo_url
  lastLogin: string | null; // Maps from last_login
  createdAt: string; // Maps from created_at
  updatedAt: string; // Maps from updated_at
  createdBy: string | null; // Maps from created_by
  updatedBy: string | null; // Maps from updated_by
}

// Utility function to map database user to application user
export function mapDatabaseUserToUser(dbUser: DatabaseUser): User {
  return {
    userId: dbUser.id,
    userName: dbUser.name,
    email: dbUser.email,
    role: dbUser.role,
    departmentId: dbUser.department, // This might need to be a department ID lookup
    departmentName: dbUser.department,
    reportingManager: dbUser.reporting_manager,
    status: dbUser.status,
    photoUrl: dbUser.photo_url,
    lastLogin: dbUser.last_login,
    createdAt: dbUser.created_at,
    updatedAt: dbUser.updated_at,
    createdBy: dbUser.created_by,
    updatedBy: dbUser.updated_by
  };
}
