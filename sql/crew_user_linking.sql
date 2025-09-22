-- Function to link existing crew with new user signup
CREATE OR REPLACE FUNCTION link_crew_on_user_signup()
RETURNS TRIGGER AS $$
BEGIN
    -- Update crew table to link user_id when a new user signs up
    UPDATE crew 
    SET user_id = NEW.id,
        updated_at = NOW()
    WHERE email = NEW.email 
    AND user_id IS NULL;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to link existing user with new crew member
CREATE OR REPLACE FUNCTION link_user_on_crew_insert()
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

-- Function to link existing user when crew email is updated
CREATE OR REPLACE FUNCTION link_user_on_crew_email_update()
RETURNS TRIGGER AS $$
DECLARE
    existing_user_id UUID;
BEGIN
    -- Only process if email has changed
    IF OLD.email != NEW.email THEN
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

-- Create trigger for when new user signs up
CREATE OR REPLACE TRIGGER trigger_link_crew_on_user_signup
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION link_crew_on_user_signup();

-- Create trigger for when new crew member is added
CREATE OR REPLACE TRIGGER trigger_link_user_on_crew_insert
    BEFORE INSERT ON crew
    FOR EACH ROW
    EXECUTE FUNCTION link_user_on_crew_insert();

-- Create trigger for when crew email is updated
CREATE OR REPLACE TRIGGER trigger_link_user_on_crew_email_update
    BEFORE UPDATE ON crew
    FOR EACH ROW
    EXECUTE FUNCTION link_user_on_crew_email_update();

-- Manual function to sync existing unlinked records
CREATE OR REPLACE FUNCTION sync_existing_crew_users()
RETURNS TABLE(linked_count INTEGER) AS $$
DECLARE
    link_count INTEGER := 0;
BEGIN
    -- Link existing crew members with existing users
    UPDATE crew 
    SET user_id = auth.users.id,
        updated_at = NOW()
    FROM auth.users
    WHERE crew.email = auth.users.email 
    AND crew.user_id IS NULL;
    
    GET DIAGNOSTICS link_count = ROW_COUNT;
    
    RETURN QUERY SELECT link_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to manually link specific crew member with user
CREATE OR REPLACE FUNCTION link_crew_with_user(
    crew_email TEXT,
    user_email TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    target_user_id UUID;
    crew_exists BOOLEAN := FALSE;
BEGIN
    -- Use crew_email as user_email if not provided
    IF user_email IS NULL THEN
        user_email := crew_email;
    END IF;
    
    -- Check if crew exists
    SELECT EXISTS(SELECT 1 FROM crew WHERE email = crew_email) INTO crew_exists;
    
    IF NOT crew_exists THEN
        RAISE EXCEPTION 'Crew member with email % not found', crew_email;
    END IF;
    
    -- Get user ID
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = user_email
    LIMIT 1;
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found', user_email;
    END IF;
    
    -- Link crew with user
    UPDATE crew 
    SET user_id = target_user_id,
        updated_at = NOW()
    WHERE email = crew_email;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unlink crew from user
CREATE OR REPLACE FUNCTION unlink_crew_from_user(crew_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE crew 
    SET user_id = NULL,
        updated_at = NOW()
    WHERE email = crew_email;
    
    IF FOUND THEN
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View to show crew-user linking status
CREATE OR REPLACE VIEW crew_user_link_status AS
SELECT 
    c.id as crew_id,
    c.name as crew_name,
    c.email as crew_email,
    c.user_id,
    u.email as user_email,
    CASE 
        WHEN c.user_id IS NOT NULL THEN 'linked'
        WHEN EXISTS(SELECT 1 FROM auth.users WHERE email = c.email) THEN 'user_exists_unlinked'
        ELSE 'no_user_account'
    END as link_status,
    c.created_at as crew_created_at,
    u.created_at as user_created_at
FROM crew c
LEFT JOIN auth.users u ON c.user_id = u.id
WHERE c.is_archived = false
ORDER BY c.name;

-- Grant permissions
GRANT EXECUTE ON FUNCTION link_crew_on_user_signup() TO authenticated;
GRANT EXECUTE ON FUNCTION link_user_on_crew_insert() TO authenticated;
GRANT EXECUTE ON FUNCTION link_user_on_crew_email_update() TO authenticated;
GRANT EXECUTE ON FUNCTION sync_existing_crew_users() TO authenticated;
GRANT EXECUTE ON FUNCTION link_crew_with_user(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION unlink_crew_from_user(TEXT) TO authenticated;
GRANT SELECT ON crew_user_link_status TO authenticated;

-- Add comments
COMMENT ON FUNCTION link_crew_on_user_signup() IS 'Automatically links crew members with new user signups based on email';
COMMENT ON FUNCTION link_user_on_crew_insert() IS 'Automatically links new crew members with existing users based on email';
COMMENT ON FUNCTION link_user_on_crew_email_update() IS 'Handles user linking when crew email is updated';
COMMENT ON FUNCTION sync_existing_crew_users() IS 'One-time sync function to link existing unlinked crew-user records';
COMMENT ON FUNCTION link_crew_with_user(TEXT, TEXT) IS 'Manually link specific crew member with user account';
COMMENT ON FUNCTION unlink_crew_from_user(TEXT) IS 'Remove user link from crew member';
COMMENT ON VIEW crew_user_link_status IS 'Shows the linking status between crew members and user accounts';
