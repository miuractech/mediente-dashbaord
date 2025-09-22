import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Title,
  Text,
  Group,
  Button,
  Stack,
  Paper,
  Badge,
  Grid,
  Card,
  Loader,
  Center,
  Alert,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconEdit,
  IconDownload,
  IconMovie,
  IconClock,
  IconMapPin,
  IconCalendar,
  IconPhone,
  IconLink,
  IconAlertCircle,
} from '@tabler/icons-react';
import { callSheetService } from '../callsheet/callSheetService';
import type { CallSheetCompleteDB } from '../callsheet/database/callsheet';

export default function CallSheetPreview() {
  const { callSheetId } = useParams<{ callSheetId: string }>();
  const navigate = useNavigate();
  const [callSheet, setCallSheet] = useState<CallSheetCompleteDB | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCallSheet = async () => {
      if (!callSheetId) {
        setError('Call sheet ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await callSheetService.getCallSheetById(callSheetId);
        
        if (response.success && response.data) {
          setCallSheet(response.data);
        } else {
          setError(response.message || 'Call sheet not found');
        }
      } catch (err) {
        console.error('Error loading call sheet:', err);
        setError('Failed to load call sheet');
        notifications.show({
          title: 'Error',
          message: 'Failed to load call sheet',
          color: 'red',
        });
      } finally {
        setLoading(false);
      }
    };

    loadCallSheet();
  }, [callSheetId]);

  const handleEdit = () => {
    if (callSheet) {
      navigate(`/admin/callsheet?edit=${callSheet.id}`);
    }
  };

  const handleBack = () => {
    navigate('/admin/callsheet');
  };

  const getRealTimeStatus = (sheet: CallSheetCompleteDB) => {
    return callSheetService.getCurrentStatus(sheet.date, sheet.time);
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

  if (loading) {
    return (
      <Container size="xl" py="md">
        <Center h="50vh">
          <Stack align="center" gap="md">
            <Loader size="lg" />
            <Text c="dimmed">Loading call sheet...</Text>
          </Stack>
        </Center>
      </Container>
    );
  }

  if (error || !callSheet) {
    return (
      <Container size="xl" py="md">
        <Stack gap="lg">
          <Group>
            <Button
              variant="light"
              leftSection={<IconArrowLeft size={16} />}
              onClick={handleBack}
            >
              Back to Call Sheets
            </Button>
          </Group>
          
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Error"
            color="red"
          >
            {error || 'Call sheet not found'}
          </Alert>
        </Stack>
      </Container>
    );
  }

  const realTimeStatus = getRealTimeStatus(callSheet);

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between">
          <Group>
            <Button
              variant="light"
              leftSection={<IconArrowLeft size={16} />}
              onClick={handleBack}
            >
              Back to Call Sheets
            </Button>
            <Badge color={getStatusColor(realTimeStatus)} variant="light" size="lg">
              {realTimeStatus.toUpperCase()}
            </Badge>
          </Group>
          
          <Group>
            <Button
              variant="outline"
              leftSection={<IconEdit size={16} />}
              onClick={handleEdit}
            >
              Edit
            </Button>
            <Button
              leftSection={<IconDownload size={16} />}
            >
              Export PDF
            </Button>
          </Group>
        </Group>

        {/* Title */}
        <div>
          <Title order={1} c="blue">
            {callSheet.project_name}
          </Title>
          <Text c="dimmed" size="lg">
            Call Sheet Preview
          </Text>
        </div>

        {/* Basic Info */}
        <Paper p="md" withBorder>
          <Title order={4} mb="md" c="blue">
            <IconMovie size={20} style={{ marginRight: 8 }} />
            Production Details
          </Title>
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Text size="sm" c="dimmed">Movie/Project:</Text>
              <Text fw={500} size="lg">{callSheet.project_name}</Text>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Text size="sm" c="dimmed">Assigned Crew:</Text>
              <Text fw={500} size="lg">{callSheet.crew?.length || 0} members</Text>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Text size="sm" c="dimmed">Date:</Text>
              <Text fw={500} size="lg">{new Date(callSheet.date).toLocaleDateString()}</Text>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Text size="sm" c="dimmed">Call Time:</Text>
              <Text fw={500} size="lg">{callSheet.time}</Text>
            </Grid.Col>
            {callSheet.description && (
              <Grid.Col span={12}>
                <Text size="sm" c="dimmed">Description:</Text>
                <Text fw={500}>{callSheet.description}</Text>
              </Grid.Col>
            )}
          </Grid>
        </Paper>

        {/* Time Table */}
        {callSheet.time_table && callSheet.time_table.length > 0 && (
          <Paper p="md" withBorder>
            <Title order={4} mb="md" c="cyan">
              <IconClock size={20} style={{ marginRight: 8 }} />
              Time Table
            </Title>
            <Stack gap="xs">
              {callSheet.time_table.map((item, index: number) => (
                <Group key={index} justify="space-between" p="xs" style={{ backgroundColor: 'var(--mantine-color-gray-0)', borderRadius: '4px' }}>
                  <Text>{item.item}</Text>
                  <Badge variant="light">{item.time}</Badge>
                </Group>
              ))}
            </Stack>
          </Paper>
        )}

        {/* Locations */}
        {callSheet.locations && callSheet.locations.length > 0 && (
          <Paper p="md" withBorder>
            <Title order={4} mb="md" c="orange">
              <IconMapPin size={20} style={{ marginRight: 8 }} />
              Locations
            </Title>
            <Stack gap="md">
              {callSheet.locations.map((loc, index: number) => (
                <Card key={index} p="sm" withBorder>
                  <Text fw={500} mb="xs">{loc.location_title}</Text>
                  <Text size="sm" c="dimmed" mb="xs">{loc.address}</Text>
                  <Group gap="md">
                    <Group gap="xs">
                      <IconPhone size={14} />
                      <Text size="sm">{loc.contact_number}</Text>
                    </Group>
                    {loc.link && (
                      <Group gap="xs">
                        <IconLink size={14} />
                        <Text size="sm" c="blue" component="a" href={loc.link} target="_blank">
                          View Map
                        </Text>
                      </Group>
                    )}
                  </Group>
                </Card>
              ))}
            </Stack>
          </Paper>
        )}

        {/* Schedule */}
        {callSheet.schedule && callSheet.schedule.length > 0 && (
          <Paper p="md" withBorder>
            <Title order={4} mb="md" c="green">
              <IconCalendar size={20} style={{ marginRight: 8 }} />
              Shooting Schedule
            </Title>
            <Stack gap="md">
              {callSheet.schedule.map((scene, index: number) => (
                <Card key={index} p="sm" withBorder>
                  <Group justify="space-between" mb="xs">
                    <Text fw={500}>{scene.scene}</Text>
                    <Badge variant="light">{scene.time}</Badge>
                  </Group>
                  <Text size="sm" c="dimmed">{scene.description}</Text>
                </Card>
              ))}
            </Stack>
          </Paper>
        )}
      </Stack>
    </Container>
  );
}
