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
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
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
  IconHierarchy,
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
              <Text size="xl" fw={700} c="blue">
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

      <AppShell.Navbar p="md">
        <Box mb="xl">
          <Text size="sm" c="dimmed" mb="md">
            Navigation
          </Text>

          <NavLink
            label="Dashboard"
            className="rounded-lg"
            leftSection={<IconDashboard size="1rem" />}
            active={isActive("/admin/dashboard")}
            onClick={() => navigate("/admin/dashboard")}
          />

          <NavLink
            label="Projects"
            className="rounded-lg"
            leftSection={<IconFolder size="1rem" />}
            active={isActive("/admin/projects")}
            onClick={() => navigate("/admin/projects")}
          />

          <NavLink
            label="Calendar"
            className="rounded-lg"
            leftSection={<IconCalendar size="1rem" />}
            active={isActive("/admin/calendar")}
            onClick={() => navigate("/admin/calendar")}
          />

          <NavLink
            label="Templates"
            className="rounded-lg"
            leftSection={<IconFiles size="1rem" />}
            active={isActive("/admin/templates")}
            onClick={() => navigate("/admin/templates")}
          />

          <NavLink
            label="Call Sheet"
            className="rounded-lg"
            leftSection={<IconClipboardList size="1rem" />}
            active={isActive("/admin/callsheet")}
            onClick={() => navigate("/admin/callsheet")}
          />

          <NavLink
            label="Departments"
            className="rounded-lg"
            leftSection={<IconBuilding size="1rem" />}
            active={isActive("/admin/departments")}
            onClick={() => navigate("/admin/departments")}
          />

          <NavLink
            label="Department Roles"
            className="rounded-lg"
            leftSection={<IconHierarchy size="1rem" />}
            active={isActive("/admin/roles")}
            onClick={() => navigate("/admin/roles")}
          />
          {/*           
          <NavLink
            label="Teams"
              className='rounded-lg'
            leftSection={<IconUsersGroup size="1rem" />}
            active={isActive('/admin/teams')}
            onClick={() => navigate('/admin/teams')}
          /> */}

          <NavLink
            label="Crew"
            className="rounded-lg"
            leftSection={<IconSettings2 size="1rem" />}
            active={isActive("/admin/crew")}
            onClick={() => navigate("/admin/crew")}
          />
        </Box>

        <Box mt="auto">
          <NavLink
            label="Settings"
            className="rounded-lg"
            leftSection={<IconSettings size="1rem" />}
            active={isActive("/admin/settings")}
            onClick={() => navigate("/admin/settings")}
          />

          <NavLink
            label="Logout"
            className="rounded-lg"
            leftSection={<IconLogout size="1rem" />}
            color="red"
            onClick={handleLogout}
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
