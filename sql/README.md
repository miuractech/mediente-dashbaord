# Crew Module SQL Setup for Supabase

## Prerequisites
Before running the crew module SQL, ensure these tables exist:
- `departments` table (from department module)
- `department_roles` table (from roles module)
- `auth.users` table (Supabase auth)

## Setup Instructions

### Option 1: Complete Setup (Recommended)
Run the complete setup file that includes everything:
```sql
-- Execute this file in Supabase SQL Editor
-- File: complete_crew_setup.sql
```

### Option 2: Individual Files
If you prefer to run individual files:

1. **Create Tables and Basic Setup**
   ```sql
   -- File: crew.sql
   ```

2. **Setup Storage Bucket**
   ```sql
   -- File: crew_storage.sql
   ```

## What Gets Created

### Tables
- `crew` - Main crew member information
- `crew_roles` - Junction table for crew-department-role relationships
- `crew_reporting` - Manager-subordinate relationships

### Views
- `crew_with_details` - Comprehensive crew view with roles and managers
- `active_crew` - Active (non-archived) crew members only

### Storage
- `crew-photos` bucket for profile pictures (5MB limit, images only)

### Indexes
- Performance indexes on commonly queried fields
- Foreign key indexes for joins

### Security
- Row Level Security (RLS) enabled
- Policies for authenticated users
- Storage policies for profile pictures

## Verification

After running the SQL, verify the setup:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('crew', 'crew_roles', 'crew_reporting');

-- Check views exist  
SELECT table_name FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name IN ('crew_with_details', 'active_crew');

-- Check storage bucket exists
SELECT * FROM storage.buckets WHERE id = 'crew-photos';
```

## Notes

- All tables have RLS enabled with policies for authenticated users
- The `crew-photos` storage bucket allows public read access for displaying profile pictures
- Automatic timestamp updates are handled by triggers
- Foreign key constraints ensure data integrity
- Check constraints validate enum values (gender, marital_status, etc.)

## Troubleshooting

If you encounter errors:

1. **Foreign key constraint errors**: Ensure `departments` and `department_roles` tables exist
2. **Permission errors**: Make sure you're running as a superuser or have appropriate permissions
3. **Storage bucket errors**: Check if storage is enabled in your Supabase project

## Data Migration

If you have existing crew data, create migration scripts to:
1. Map existing data to new schema
2. Handle role assignments through `crew_roles` junction table
3. Set up reporting relationships in `crew_reporting` table
