import { useCallback } from "react";
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
  Stack,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconSettings,
  IconLogout,
  IconUser,
  IconChevronDown,
  IconCalendar,
  IconHome,
  IconClipboard,
  IconInbox,
  IconChartBar,
  IconPlus,
  IconFiles,
  IconUsers,
} from "@tabler/icons-react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "./useAuth";

export default function AdminLayout() {
  const [opened, { toggle }] = useDisclosure();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      notifications.show({
        title: "Logged Out",
        message: "You have been successfully logged out.",
        color: "blue",
      });
      navigate("/admin/login");
    } catch (error) {
      console.error("Logout error:", error);
      notifications.show({
        title: "Logout Error",
        message: "Failed to logout. Please try again.",
        color: "red",
      });
    }
  }, [logout, navigate]);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 300, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding="md"
      withBorder={false}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
            />
            <Group gap="xs">
              <Text size="xl" fw={700} c="dark.9">
                MEDIENTE
              </Text>
            </Group>
          </Group>

          <Menu shadow="md" width={200}>
            <Menu.Target>
              <Button
                variant="subtle"
                rightSection={<IconChevronDown size={16} />}
              >
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

      <AppShell.Navbar p="md" style={{ backgroundColor: '#fafafa' }}>
        {/* User Profile Section */}
        <Box mb="xl">
          <Group gap="sm" mb="lg">
            <Avatar size={40} color="primary" gradient={{ from: 'primary.6', to: 'primary.8' }}>
              {user?.name.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Text fw={600} size="sm">{user?.name}</Text>
              <Text size="xs" c="dimmed">Online</Text>
            </Box>
          </Group>
        </Box>

        {/* Main Navigation */}
        <Stack gap="xs" mb="xl">
          <NavLink
            label="Home"
            leftSection={<IconHome size="1.1rem" />}
            active={isActive("/admin/dashboard")}
            onClick={() => navigate("/admin/dashboard")}
            styles={{
              root: {
                borderRadius: '12px',
                fontWeight: 500,
                '&[data-active]': {
                  backgroundColor: 'var(--mantine-color-primary-1)',
                  color: 'var(--mantine-color-primary-8)',
                },
              },
            }}
          />

          <NavLink
            label="Projects"
            leftSection={<IconClipboard size="1.1rem" />}
            active={isActive("/admin/projects")}
            onClick={() => navigate("/admin/projects")}
            styles={{
              root: {
                borderRadius: '12px',
                fontWeight: 500,
                '&[data-active]': {
                  backgroundColor: 'var(--mantine-color-primary-1)',
                  color: 'var(--mantine-color-primary-8)',
                },
              },
            }}
          />

          <NavLink
            label="Call sheets"
            leftSection={<IconInbox size="1.1rem" />}
            // rightSection={<Text size="xs" c="white" bg="primary.6" px={6} py={2} style={{ borderRadius: '10px' }}>3</Text>}
            active={isActive("/admin/callsheet")}
            onClick={() => navigate("/admin/callsheet")}
            styles={{
              root: {
                borderRadius: '12px',
                fontWeight: 500,
                '&[data-active]': {
                  backgroundColor: 'var(--mantine-color-primary-1)',
                  color: 'var(--mantine-color-primary-8)',
                },
              },
            }}
          />

          <NavLink
            label="Calendar"
            leftSection={<IconCalendar size="1.1rem" />}
            active={isActive("/admin/calendar")}
            onClick={() => navigate("/admin/calendar")}
            styles={{
              root: {
                borderRadius: '12px',
                fontWeight: 500,
                '&[data-active]': {
                  backgroundColor: 'var(--mantine-color-primary-1)',
                  color: 'var(--mantine-color-primary-8)',
                },
              },
            }}
          />

          <NavLink
            label="Reports & Analytics"
            leftSection={<IconChartBar size="1.1rem" />}
            active={isActive("/admin/reports")}
            onClick={() => navigate("/admin/reports")}
            styles={{
              root: {
                borderRadius: '12px',
                fontWeight: 500,
                '&[data-active]': {
                  backgroundColor: 'var(--mantine-color-primary-1)',
                  color: 'var(--mantine-color-primary-8)',
                },
              },
            }}
          />
           <NavLink
            label="Templates"
            leftSection={<IconFiles size="1.1rem" />}
            active={isActive("/admin/templates")}
            onClick={() => navigate("/admin/templates")}
            styles={{
              root: {
                borderRadius: '12px',
                fontWeight: 500,
                '&[data-active]': {
                  backgroundColor: 'var(--mantine-color-primary-1)',
                  color: 'var(--mantine-color-primary-8)',
                },
              },
            }}
          />

          <NavLink
            label="Team Management"
            leftSection={<IconUsers size="1.1rem" />}
            active={isActive("/admin/departments") || isActive("/admin/roles") || isActive("/admin/crew")}
            onClick={() => navigate("/admin/departments")}
            styles={{
              root: {
                borderRadius: '12px',
                fontWeight: 500,
                '&[data-active]': {
                  backgroundColor: 'var(--mantine-color-primary-1)',
                  color: 'var(--mantine-color-primary-8)',
                },
              },
            }}
          />
        </Stack>

        {/* My Projects Section */}
        <Box mb="xl">
          <Group justify="space-between" mb="md">
            <Text size="sm" fw={600} c="dark.6">My Projects</Text>
            <Button size="xs" variant="subtle" leftSection={<IconPlus size={14} />} c="primary.6">
              Add
            </Button>
          </Group>
          
          <Stack gap="xs">
            <NavLink
              label="Product Launch"
              leftSection={<Box w={8} h={8} bg="primary.6" style={{ borderRadius: '50%' }} />}
              active={isActive("/admin/projects/1")}
              onClick={() => navigate("/admin/projects/1")}
              styles={{
                root: {
                  borderRadius: '12px',
                  fontWeight: 500,
                  '&[data-active]': {
                    backgroundColor: 'var(--mantine-color-primary-1)',
                    color: 'var(--mantine-color-primary-8)',
                  },
                },
              }}
            />

            <NavLink
              label="Team Brainstorm"
              leftSection={<Box w={8} h={8} bg="blue.6" style={{ borderRadius: '50%' }} />}
              active={isActive("/admin/projects/2")}
              onClick={() => navigate("/admin/projects/2")}
              styles={{
                root: {
                  borderRadius: '12px',
                  fontWeight: 500,
                  '&[data-active]': {
                    backgroundColor: 'var(--mantine-color-primary-1)',
                    color: 'var(--mantine-color-primary-8)',
                  },
                },
              }}
            />

            <NavLink
              label="Branding Launch"
              leftSection={<Box w={8} h={8} bg="teal.6" style={{ borderRadius: '50%' }} />}
              active={isActive("/admin/projects/3")}
              onClick={() => navigate("/admin/projects/3")}
              styles={{
                root: {
                  borderRadius: '12px',
                  fontWeight: 500,
                  '&[data-active]': {
                    backgroundColor: 'var(--mantine-color-primary-1)',
                    color: 'var(--mantine-color-primary-8)',
                  },
                },
              }}
            />
          </Stack>
        </Box>

        {/* Settings at bottom */}
        <Box mt="auto">
          <NavLink
            label="Settings"
            leftSection={<IconSettings size="1.1rem" />}
            active={isActive("/admin/settings")}
            onClick={() => navigate("/admin/settings")}
            styles={{
              root: {
                borderRadius: '12px',
                fontWeight: 500,
                '&[data-active]': {
                  backgroundColor: 'var(--mantine-color-primary-1)',
                  color: 'var(--mantine-color-primary-8)',
                },
              },
            }}
          />
        </Box>
      </AppShell.Navbar>

      <AppShell.Main
        style={{
          backgroundColor: "#FAF9FF",
          borderRadius: "40px",
        }}
      >
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
