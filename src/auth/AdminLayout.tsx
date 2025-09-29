import { useState, useEffect, useCallback } from 'react';
import {
  AppShell,
  Burger,
  Group,
  Text,
  NavLink,
  Button,
  Avatar,
  Menu,
  Box,
  Center,
  Loader,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { 
  IconDashboard, 
  IconSettings, 
  IconLogout,
  IconUser,
  IconChevronDown,
  IconFolder,
  IconCalendar,
  IconFiles,
  IconBuilding,

  IconSettings2,
  IconClipboardList,
  IconHierarchy
} from '@tabler/icons-react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import authService from './authService';
import type { AdminUser } from './auth';


export default function AdminLayout() {
  const [opened, { toggle }] = useDisclosure();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const loadCurrentUser = useCallback(async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        navigate('/admin/login');
        return;
      }
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to load user:', error);
      navigate('/admin/login');
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  const handleLogout = async () => {
    try {
      await authService.logout();
      notifications.show({
        title: 'Logged Out',
        message: 'You have been successfully logged out.',
        color: 'blue',
      });
      navigate('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
      notifications.show({
        title: 'Logout Error',
        message: 'Failed to logout. Please try again.',
        color: 'red',
      });
    }
  };

  if (isLoading) {
    return (
      <Center h="100vh" w="100vw">
        <Loader size="xl" color="blue" />
      </Center>
    );
  }

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Group gap="xs">
              <Text size="xl" fw={700} c="blue">MEDIENTE</Text>
            </Group>
          </Group>

          <Menu shadow="md" width={200}>
            <Menu.Target>
              <Button variant="subtle" rightSection={<IconChevronDown size={16} />}>
                <Group gap="xs">
                  <Avatar size="sm" color="blue">
                    {user?.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <Text size="sm">{user?.name}</Text>
                </Group>
              </Button>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>Account</Menu.Label>
              <Menu.Item leftSection={<IconUser size={14} />}>
                Profile
              </Menu.Item>
              <Menu.Item leftSection={<IconSettings size={14} />}>
                Settings
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item 
                leftSection={<IconLogout size={14} />}
                color="red"
                onClick={handleLogout}
              >
                Logout
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Box mb="xl">
          <Text size="sm" c="dimmed" mb="md">Navigation</Text>
          
          <NavLink
            label="Dashboard"
          
            leftSection={<IconDashboard size="1rem" />}
            active={isActive('/admin/dashboard')}
            onClick={() => navigate('/admin/dashboard')}
          />
          
          <NavLink
            label="Projects"
          
            leftSection={<IconFolder size="1rem" />}
            active={isActive('/admin/projects')}
            onClick={() => navigate('/admin/projects')}
          />
          
          <NavLink
            label="Calendar"
          
            leftSection={<IconCalendar size="1rem" />}
            active={isActive('/admin/calendar')}
            onClick={() => navigate('/admin/calendar')}
          />
          
          <NavLink
            label="Templates"
          
            leftSection={<IconFiles size="1rem" />}
            active={isActive('/admin/templates')}
            onClick={() => navigate('/admin/templates')}
          />
          
          <NavLink
            label="Call Sheet"
            className='rounded-3xl'
            leftSection={<IconClipboardList size="1rem" />}
            active={isActive('/admin/callsheet')}
            onClick={() => navigate('/admin/callsheet')}
          />
          
          <NavLink
            label="Departments"
          
            leftSection={<IconBuilding size="1rem" />}
            active={isActive('/admin/departments')}
            onClick={() => navigate('/admin/departments')}
          />
          
          <NavLink
            label="Department Roles"
  
            leftSection={<IconHierarchy size="1rem" />}
            active={isActive('/admin/roles')}
            onClick={() => navigate('/admin/roles')}
          />
{/*           
          <NavLink
            label="Teams"
            className='rounded-3xl'
            leftSection={<IconUsersGroup size="1rem" />}
            active={isActive('/admin/teams')}
            onClick={() => navigate('/admin/teams')}
          /> */}
          
          <NavLink
            label="Crew"
  
            leftSection={<IconSettings2 size="1rem" />}
            active={isActive('/admin/crew')}
            onClick={() => navigate('/admin/crew')}
          />
        </Box>

        <Box mt="auto">
          <NavLink

            label="Settings"
            leftSection={<IconSettings size="1rem" />}
            active={isActive('/admin/settings')}
            onClick={() => navigate('/admin/settings')}
          />
          
          <NavLink
            label="Logout"
          
            leftSection={<IconLogout size="1rem" />}
            color="red"
            onClick={handleLogout}
          />
        </Box>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
