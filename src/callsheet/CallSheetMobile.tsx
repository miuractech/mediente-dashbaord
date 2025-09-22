import { useRef } from 'react';
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
  Divider,
  Button,
  ActionIcon,
  Box,
  Avatar,
  Anchor,
} from '@mantine/core';
import {
  IconCalendar,
  IconClock,
  IconMapPin,
  IconPhone,
  IconUsers,
  IconMovie,
  IconArrowLeft,
  IconPrinter,
  IconHome,
  IconBell,
  IconUser,
} from '@tabler/icons-react';
import type { CallSheetCompleteDB } from './database/callsheet';

interface CallSheetMobileProps {
  callSheet: CallSheetCompleteDB;
  onBack?: () => void;
}

export default function CallSheetMobile({ callSheet, onBack }: CallSheetMobileProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${callSheet.project_name} - Call Sheet`,
  });
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'pm' : 'am';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes}${ampm}`;
  };

  return (
    <Box style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Header */}
      <Paper p="md" shadow="sm" style={{ borderRadius: 0 }} className="no-print">
        <Group justify="space-between" align="center">
          <ActionIcon variant="subtle" onClick={onBack}>
            <IconArrowLeft size={20} />
          </ActionIcon>
          <Text fw={600} size="lg">Call Sheet</Text>
          <ActionIcon variant="subtle" onClick={handlePrint}>
            <IconPrinter size={20} />
          </ActionIcon>
        </Group>
      </Paper>

      <Container ref={printRef} size="sm" p="md" className="print-mobile">
        {/* Company Header */}
        <Card p="lg" mb="md" bg="blue.6" c="white">
          <Group justify="space-between" align="center" mb="xs">
            <Title order={2} c="white" fw={700}>
              MEDIENTE
            </Title>
          </Group>
          <Text c="blue.1" size="sm" mb="sm">
            {formatDate(callSheet.date)}
          </Text>
          <Text c="blue.1" size="xs">
            929 Colorado Ave,
          </Text>
          <Text c="blue.1" size="xs">
            Santa Monica, CA
          </Text>
          <Text c="blue.1" size="xs">
            90401
          </Text>
          <Text c="blue.1" size="xs" mt="xs">
            (123) 456-7890
          </Text>
        </Card>

        {/* Project Title */}
        <Card p="lg" mb="md">
          <Title order={2} ta="center" c="gray.8" mb="xs">
            {callSheet.project_name}
          </Title>
          <Text ta="center" c="gray.6" size="sm">
            General Crew Call
          </Text>
        </Card>

        {/* Main Call Time */}
        <Card p="xl" mb="md" bg="blue.0">
          <Text ta="center" size="6rem" fw={300} c="blue.8" lh={1}>
            {formatTime(callSheet.time)}
          </Text>
        </Card>

        {/* Schedule */}
        {callSheet.time_table && callSheet.time_table.length > 0 && (
          <Card p="lg" mb="md">
            <Stack gap="md">
              {callSheet.time_table.map((item, index) => (
                <Group key={index} justify="space-between" align="center">
                  <Group gap="xs">
                    <IconClock size={16} color="var(--mantine-color-gray-6)" />
                    <Text fw={500}>{item.item}:</Text>
                  </Group>
                  <Text c="gray.7">{formatTime(item.time)}</Text>
                </Group>
              ))}
            </Stack>
          </Card>
        )}

        {/* Shooting Schedule */}
        {callSheet.schedule && callSheet.schedule.length > 0 && (
          <Card p="lg" mb="md">
            <Text fw={600} mb="md" c="gray.8">
              SCHEDULE ({callSheet.schedule.length} scenes)
            </Text>
            <Stack gap="lg">
              {callSheet.schedule.map((scene, index) => (
                <Box key={index}>
                  <Group justify="space-between" mb="xs">
                    <Text fw={600} c="blue.7">{formatTime(scene.time)}</Text>
                    <Text size="sm" c="gray.6">Scene #{index + 1}</Text>
                  </Group>
                  <Text fw={500} mb="xs">{scene.scene}</Text>
                  <Text size="sm" c="gray.7">{scene.description}</Text>
                  {index < callSheet.schedule.length - 1 && <Divider my="md" />}
                </Box>
              ))}
            </Stack>
          </Card>
        )}

        {/* Additional Notes */}
        {callSheet.description && (
          <Card p="lg" mb="md" bg="orange.0">
            <Text size="sm" c="orange.8">
              {callSheet.description}
            </Text>
          </Card>
        )}

        {/* Locations */}
        {callSheet.locations && callSheet.locations.length > 0 && (
          <>
            {callSheet.locations.map((location, index) => (
              <Card key={index} p="lg" mb="md">
                <Group gap="xs" mb="sm">
                  <Badge color="green" size="sm">{index + 1}</Badge>
                  <Text fw={600} c="green.8">{location.location_title}</Text>
                </Group>
                <Text size="sm" mb="xs">{location.address}</Text>
                <Text size="sm" c="gray.6" mb="sm">({location.contact_number})</Text>
                
                <Text fw={600} size="sm" c="gray.8" mb="xs">Parking & Notes</Text>
                <Text size="sm" c="gray.7" mb="md">
                  Parking is available North of Wilshire. If you have equipment with you, unload on set and then park your vehicle.
                </Text>
                
                <Text fw={600} size="sm" c="gray.8" mb="xs">Nearest Hospital</Text>
                <Text size="sm" c="gray.7" mb="xs">UCLA Medical Center</Text>
                <Text size="sm" c="gray.7">757 Westwood Plaza, Los Angeles, CA 90095</Text>
                <Text size="sm" c="gray.7" mb="sm">(310) 825-9111</Text>
                
                {location.link && (
                  <Anchor href={location.link} target="_blank" size="sm">
                    View on Maps
                  </Anchor>
                )}
              </Card>
            ))}
          </>
        )}

        {/* Made with branding */}
        <Box ta="center" py="lg">
          <Text size="xs" c="gray.5">Made with ❤️</Text>
        </Box>
      </Container>

      {/* Bottom Navigation */}
      <Paper 
        p="md" 
        shadow="lg" 
        className="no-print"
        style={{ 
          position: 'fixed', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          borderRadius: 0,
          borderTop: '1px solid var(--mantine-color-gray-3)'
        }}
      >
        <Group justify="space-around">
          <ActionIcon variant="subtle" size="lg">
            <IconHome size={24} />
          </ActionIcon>
          <ActionIcon variant="subtle" size="lg">
            <IconCalendar size={24} />
          </ActionIcon>
          <ActionIcon variant="subtle" size="lg">
            <IconBell size={24} />
          </ActionIcon>
          <ActionIcon variant="subtle" size="lg">
            <IconUser size={24} />
          </ActionIcon>
        </Group>
      </Paper>
    </Box>
  );
}
