import { useRef } from 'react';
import { useMediaQuery } from '@mantine/hooks';
import { useReactToPrint } from 'react-to-print';
import './callsheet-print.css';
import {
  Container,
  Paper,
  Title,
  Text,
  Group,
  Stack,
  Badge,
  Card,
  Grid,
  Divider,
  Button,
  ActionIcon,
  Box,
  Center,
  Avatar,
} from '@mantine/core';
import {
  IconCalendar,
  IconClock,
  IconMapPin,
  IconPhone,
  IconUsers,
  IconMovie,
  IconPrinter,
  IconArrowLeft,
} from '@tabler/icons-react';
import CallSheetMobile from './CallSheetMobile';
import type { CallSheetCompleteDB } from './database/callsheet';

interface CallSheetViewProps {
  callSheet: CallSheetCompleteDB;
  onBack?: () => void;
}

export default function CallSheetView({ callSheet, onBack }: CallSheetViewProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${callSheet.project_name} - Call Sheet`,
  });

  // Use mobile layout for smaller screens
  if (isMobile) {
    return <CallSheetMobile callSheet={callSheet} onBack={onBack} />;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes}${ampm}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'green';
      case 'active': return 'blue';
      case 'expired': return 'red';
      case 'draft': return 'orange';
      case 'archived': return 'gray';
      default: return 'blue';
    }
  };

  return (
    <Container size="xl" py="md">
      {/* Header Actions - Desktop Only */}
      <Group justify="space-between" mb="lg" visibleFrom="md" className="no-print">
        <Button 
          variant="subtle" 
          leftSection={<IconArrowLeft size={16} />}
          onClick={onBack}
        >
          Back to Call Sheets
        </Button>
        <Button 
          variant="light" 
          leftSection={<IconPrinter size={16} />}
          onClick={handlePrint}
        >
          Print Call Sheet
        </Button>
      </Group>

      {/* Mobile Header Actions */}
      <Group justify="space-between" mb="lg" hiddenFrom="md" className="no-print">
        <ActionIcon variant="subtle" onClick={onBack}>
          <IconArrowLeft size={18} />
        </ActionIcon>
        <Text fw={600}>Call Sheet</Text>
        <ActionIcon variant="light" onClick={handlePrint}>
          <IconPrinter size={18} />
        </ActionIcon>
      </Group>

      {/* Main Call Sheet */}
      <Paper ref={printRef} shadow="sm" radius="md" p={0} style={{ overflow: 'hidden' }}>
        {/* Header Section */}
        <Box bg="blue.0" p="xl">
          <Grid align="center">
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Group align="center" gap="md">
                <Avatar size="lg" color="blue">
                  <IconMovie size={24} />
                </Avatar>
                <div>
                  <Title order={1} size="h2" c="blue.8">
                    {callSheet.project_name}
                  </Title>
                  <Text size="lg" c="blue.6" fw={500}>
                    {formatDate(callSheet.date)}
                  </Text>
                </div>
              </Group>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Stack align="flex-end" gap="xs">
                <Badge size="lg" color={getStatusColor(callSheet.status)} variant="filled">
                  {callSheet.status.toUpperCase()}
                </Badge>
                <Text size="sm" c="blue.6">
                  Created {new Date(callSheet.created_at).toLocaleDateString()}
                </Text>
              </Stack>
            </Grid.Col>
          </Grid>
        </Box>

        <Box p="xl">
          {/* General Crew Call - Prominent Display */}
          <Card bg="blue.1" p="xl" mb="xl" radius="md">
            <Center>
              <Stack align="center" gap="xs">
                <Text size="lg" fw={500} c="blue.7">
                  General Crew Call
                </Text>
                <Title order={1} size="3rem" c="blue.8">
                  {formatTime(callSheet.time)}
                </Title>
                <Group gap="lg">
                  <Group gap="xs">
                    <IconCalendar size={16} color="var(--mantine-color-blue-6)" />
                    <Text size="md" c="blue.6">
                      {formatDate(callSheet.date)}
                    </Text>
                  </Group>
                  <Group gap="xs">
                    <IconUsers size={16} color="var(--mantine-color-blue-6)" />
                    <Text size="md" c="blue.6">
                      {callSheet.crew?.length || 0} Crew Members
                    </Text>
                  </Group>
                </Group>
              </Stack>
            </Center>
          </Card>

          <Grid gutter="xl">
            {/* Left Column */}
            <Grid.Col span={{ base: 12, lg: 6 }}>
              {/* Time Table */}
              {callSheet.time_table && callSheet.time_table.length > 0 && (
                <Card withBorder mb="xl">
                  <Card.Section p="md" bg="gray.0">
                    <Group gap="xs">
                      <IconClock size={20} color="var(--mantine-color-gray-7)" />
                      <Title order={3} c="gray.8">
                        Schedule
                      </Title>
                    </Group>
                  </Card.Section>
                  <Card.Section p="md">
                    <Stack gap="md">
                      {callSheet.time_table.map((item, index) => (
                        <Group key={index} justify="space-between" p="sm" bg="gray.0" style={{ borderRadius: 8 }}>
                          <Text fw={500}>{item.item}</Text>
                          <Badge variant="light" color="blue">
                            {formatTime(item.time)}
                          </Badge>
                        </Group>
                      ))}
                    </Stack>
                  </Card.Section>
                </Card>
              )}

              {/* Locations */}
              {callSheet.locations && callSheet.locations.length > 0 && (
                <Card withBorder mb="xl">
                  <Card.Section p="md" bg="orange.0">
                    <Group gap="xs">
                      <IconMapPin size={20} color="var(--mantine-color-orange-7)" />
                      <Title order={3} c="orange.8">
                        Locations
                      </Title>
                    </Group>
                  </Card.Section>
                  <Card.Section p="md">
                    <Stack gap="lg">
                      {callSheet.locations.map((location, index) => (
                        <Box key={index}>
                          <Group justify="space-between" mb="xs">
                            <Text fw={600} size="lg">
                              {location.location_title}
                            </Text>
                            <Badge variant="light" color="orange">
                              #{index + 1}
                            </Badge>
                          </Group>
                          <Stack gap="xs">
                            <Group gap="xs">
                              <IconMapPin size={14} color="var(--mantine-color-gray-6)" />
                              <Text size="sm" c="dimmed">
                                {location.address}
                              </Text>
                            </Group>
                            <Group gap="xs">
                              <IconPhone size={14} color="var(--mantine-color-gray-6)" />
                              <Text size="sm" c="dimmed">
                                {location.contact_number}
                              </Text>
                            </Group>
                            {location.link && (
                              <Button 
                                variant="light" 
                                size="xs" 
                                component="a" 
                                href={location.link} 
                                target="_blank"
                              >
                                View on Maps
                              </Button>
                            )}
                          </Stack>
                          {index < callSheet.locations.length - 1 && <Divider my="md" />}
                        </Box>
                      ))}
                    </Stack>
                  </Card.Section>
                </Card>
              )}
            </Grid.Col>

            {/* Right Column */}
            <Grid.Col span={{ base: 12, lg: 6 }}>
              {/* Shooting Schedule */}
              {callSheet.schedule && callSheet.schedule.length > 0 && (
                <Card withBorder mb="xl">
                  <Card.Section p="md" bg="green.0">
                    <Group gap="xs">
                      <IconMovie size={20} color="var(--mantine-color-green-7)" />
                      <Title order={3} c="green.8">
                        Shooting Schedule
                      </Title>
                      <Badge size="sm" color="green" variant="light">
                        {callSheet.schedule.length} scenes
                      </Badge>
                    </Group>
                  </Card.Section>
                  <Card.Section p="md">
                    <Stack gap="lg">
                      {callSheet.schedule.map((scene, index) => (
                        <Box key={index}>
                          <Group justify="space-between" mb="xs">
                            <Badge color="green" variant="light">
                              {formatTime(scene.time)}
                            </Badge>
                            <Text size="xs" c="dimmed">
                              Scene #{index + 1}
                            </Text>
                          </Group>
                          <Text fw={600} mb="xs">
                            {scene.scene}
                          </Text>
                          <Text size="sm" c="dimmed">
                            {scene.description}
                          </Text>
                          {index < callSheet.schedule.length - 1 && <Divider my="md" />}
                        </Box>
                      ))}
                    </Stack>
                  </Card.Section>
                </Card>
              )}

              {/* Additional Notes */}
              {callSheet.description && (
                <Card withBorder mb="xl">
                  <Card.Section p="md" bg="gray.0">
                    <Title order={3} c="gray.8">
                      Additional Notes
                    </Title>
                  </Card.Section>
                  <Card.Section p="md">
                    <Text>{callSheet.description}</Text>
                  </Card.Section>
                </Card>
              )}

              {/* Crew Information */}
              {callSheet.crew && callSheet.crew.length > 0 && (
                <Card withBorder>
                  <Card.Section p="md" bg="blue.0">
                    <Group gap="xs">
                      <IconUsers size={20} color="var(--mantine-color-blue-7)" />
                      <Title order={3} c="blue.8">
                        Crew Members
                      </Title>
                      <Badge size="sm" color="blue" variant="light">
                        {callSheet.crew.length} assigned
                      </Badge>
                    </Group>
                  </Card.Section>
                  <Card.Section p="md">
                    <Text c="dimmed">
                      {callSheet.crew.length} crew member{callSheet.crew.length !== 1 ? 's' : ''} assigned to this call sheet.
                    </Text>
                  </Card.Section>
                </Card>
              )}
            </Grid.Col>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
}
