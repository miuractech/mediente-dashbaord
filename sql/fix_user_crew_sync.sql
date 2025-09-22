-- Fix user-crew sync trigger errors

-- 1. Create the missing app_role enum type
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'super_admin');
    END IF;
END $$;

-- 2. Create function to handle new user signup and create default user_role
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER AS $$
BEGIN
    -- Create default user_role entry for new user (admin role by default)
    INSERT INTO public.user_roles (user_id, role, project_id)
    VALUES (NEW.id, 'admin'::public.app_role, gen_random_uuid())
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Link crew member if exists with same email
    UPDATE public.crew 
    SET user_id = NEW.id,
        updated_at = NOW()
    WHERE email = NEW.email 
    AND user_id IS NULL;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create function to handle crew insertion with existing user check
CREATE OR REPLACE FUNCTION public.handle_crew_insert()
RETURNS TRIGGER AS $$
DECLARE
    existing_user_id UUID;
BEGIN
    -- Check if user already exists with this email
    SELECT id INTO existing_user_id
    FROM auth.users
    WHERE email = NEW.email
    LIMIT 1;
    
    -- If user exists, link it to the crew member
    IF existing_user_id IS NOT NULL THEN
        NEW.user_id = existing_user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create function to handle crew email updates
CREATE OR REPLACE FUNCTION public.handle_crew_email_update()
RETURNS TRIGGER AS $$
DECLARE
    existing_user_id UUID;
BEGIN
    -- Only process if email has changed
    IF OLD.email IS DISTINCT FROM NEW.email THEN
        -- Clear old user_id if email changed
        NEW.user_id = NULL;
        
        -- Check if user already exists with new email
        SELECT id INTO existing_user_id
        FROM auth.users
        WHERE email = NEW.email
        LIMIT 1;
        
        -- If user exists, link it to the crew member
        IF existing_user_id IS NOT NULL THEN
            NEW.user_id = existing_user_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_link_crew_on_user_signup ON auth.users;
DROP TRIGGER IF EXISTS trigger_link_user_on_crew_insert ON public.crew;
DROP TRIGGER IF EXISTS trigger_link_user_on_crew_email_update ON public.crew;
DROP TRIGGER IF EXISTS trigger_handle_new_user_signup ON auth.users;
DROP TRIGGER IF EXISTS trigger_handle_crew_insert ON public.crew;
DROP TRIGGER IF EXISTS trigger_handle_crew_email_update ON public.crew;

-- 6. Create new triggers
CREATE TRIGGER trigger_handle_new_user_signup
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_signup();

CREATE TRIGGER trigger_handle_crew_insert
    BEFORE INSERT ON public.crew
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_crew_insert();

CREATE TRIGGER trigger_handle_crew_email_update
    BEFORE UPDATE ON public.crew
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_crew_email_update();

-- 7. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user_signup() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_crew_insert() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_crew_email_update() TO authenticated;

-- 8. Update custom access token hook to handle null values gracefully
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  user_role public.app_role;
  dep_id uuid;
  proj_id uuid;
BEGIN
  -- Fetch the user role in the user_roles table
  SELECT role, department_id, project_id
  INTO user_role, dep_id, proj_id
  FROM public.user_roles
  WHERE user_id = (event->>'user_id')::uuid
  LIMIT 1;

  claims := coalesce(event->'claims', '{}'::jsonb);

  -- Set user_role claim (default to admin if null)
  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role::text));
  ELSE
    claims := jsonb_set(claims, '{user_role}', to_jsonb('admin'::text));
  END IF;

  -- Set department_id claim
  IF dep_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{department_id}', to_jsonb(dep_id));
  ELSE
    claims := jsonb_set(claims, '{department_id}', 'null'::jsonb);
  END IF;

  -- Set project_id claim
  IF proj_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{project_id}', to_jsonb(proj_id));
  ELSE
    claims := jsonb_set(claims, '{project_id}', 'null'::jsonb);
  END IF;

  -- Update the 'claims' object in the original event
  event := jsonb_set(event, '{claims}', claims);

  -- Return the modified event
  return event;
END;
$$;

-- 9. Function to sync existing unlinked records
CREATE OR REPLACE FUNCTION public.sync_existing_crew_users()
RETURNS TABLE(linked_count INTEGER) AS $$
DECLARE
    link_count INTEGER := 0;
BEGIN
    -- Link existing crew members with existing users
    UPDATE public.crew 
    SET user_id = auth.users.id,
        updated_at = NOW()
    FROM auth.users
    WHERE crew.email = auth.users.email 
    AND crew.user_id IS NULL;
    
    GET DIAGNOSTICS link_count = ROW_COUNT;
    
    -- Create missing user_roles entries for existing users
    INSERT INTO public.user_roles (user_id, role, project_id)
    SELECT u.id, 'admin'::public.app_role, gen_random_uuid()
    FROM auth.users u
    WHERE NOT EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = u.id
    )
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RETURN QUERY SELECT link_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Grant permissions for sync function
GRANT EXECUTE ON FUNCTION public.sync_existing_crew_users() TO authenticated;

-- 11. Add comments
COMMENT ON FUNCTION public.handle_new_user_signup() IS 'Handles new user signup by creating default user_role and linking with crew';
COMMENT ON FUNCTION public.handle_crew_insert() IS 'Links new crew members with existing users based on email';
COMMENT ON FUNCTION public.handle_crew_email_update() IS 'Handles user linking when crew email is updated';
COMMENT ON FUNCTION public.sync_existing_crew_users() IS 'One-time sync function to link existing unlinked crew-user records and create missing user_roles';
