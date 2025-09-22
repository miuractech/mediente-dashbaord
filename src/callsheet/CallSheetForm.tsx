import { useState, useEffect, useMemo } from 'react';
import {
  Paper,
  Title,
  Grid,
  TextInput,
  Textarea,
  Button,
  Group,
  Box,
  Divider,
  ActionIcon,
  Stack,
  Text,
  Card,
  Badge,
  Alert,
  Accordion,
  ScrollArea,
  MultiSelect,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { yupResolver } from 'mantine-form-yup-resolver';
import {
  IconPlus,
  IconTrash,
  IconCalendar,
  IconClock,
  IconMapPin,
  IconPhone,
  IconLink,
  IconMovie,
  IconUsers,
  IconAlertCircle,
  IconCheck,
} from '@tabler/icons-react';
import { callSheetSchema } from './callsheetSchema';
import type { CallSheetFormData } from './callsheet';
import { useCrewList } from '../crew/crew.hook';

const defaultFormValues: CallSheetFormData = {
  project_name: '',
  date: '',
  time: '',
  description: '',
  time_table: [], // Start with empty array - optional
  location: [], // Start with empty array - optional
  schedule: [{ time: '', scene: '', description: '' }], // Schedule still required
  crew_ids: [],
};

interface CallSheetFormProps {
  onSubmit?: (data: CallSheetFormData) => void;
  initialData?: Partial<CallSheetFormData>;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

export default function CallSheetForm({ 
  onSubmit, 
  initialData, 
  isLoading = false,
  mode = 'create'
}: CallSheetFormProps) {
  const [activeAccordion, setActiveAccordion] = useState<string | null>('basic');
  const { crew, loading: crewLoading } = useCrewList();

  // Prepare crew data for MultiSelect - memoize to prevent re-renders
  const crewSelectData = useMemo(() => crew.map(member => ({
    value: member.id,
    label: `${member.name} - ${member.email}`,
  })), [crew]);

  const form = useForm<CallSheetFormData>({
    initialValues: { ...defaultFormValues, ...initialData },
    validate: yupResolver(callSheetSchema),
    validateInputOnBlur: true,
    validateInputOnChange: true,
  });

  // Update form values when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData && mode === 'edit') {
      form.setValues({
        ...defaultFormValues,
        ...initialData
      });
    } else if (mode === 'create') {
      form.reset();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, mode]); // Remove form from dependencies to prevent infinite loop

  const handleSubmit = (values: CallSheetFormData) => {
    try {
      notifications.show({
        title: mode === 'edit' ? 'Call Sheet Updated' : 'Call Sheet Created',
        message: mode === 'edit' 
          ? 'Call sheet has been successfully updated!' 
          : 'Call sheet has been successfully created!',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
      onSubmit?.(values);
    } catch {
      notifications.show({
        title: 'Error',
        message: mode === 'edit' 
          ? 'Failed to update call sheet. Please try again.'
          : 'Failed to create call sheet. Please try again.',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    }
  };

  const addTimeTableItem = () => {
    form.insertListItem('time_table', { item: '', date: '' });
  };

  const addLocation = () => {
    form.insertListItem('location', { 
      location_title: '', 
      link: '', 
      address: '', 
      contact_number: '' 
    });
  };

  const addScheduleItem = () => {
    form.insertListItem('schedule', { time: '', scene: '', description: '' });
  };

  const removeTimeTableItem = (index: number) => {
    form.removeListItem('time_table', index);
  };

  const removeLocation = (index: number) => {
    form.removeListItem('location', index);
  };

  const removeScheduleItem = (index: number) => {
    form.removeListItem('schedule', index);
  };

  return (
    <Box p="md">
      <Paper shadow="sm" p="xl" radius="md">
        <Group justify="space-between" mb="xl">
          <Title order={2} c="blue">
            <IconMovie size={28} style={{ marginRight: 8 }} />
            Call Sheet Form
          </Title>
          <Badge size="lg" color="blue" variant="light">
            Production Planning
          </Badge>
        </Group>

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Accordion 
            value={activeAccordion} 
            onChange={setActiveAccordion}
            variant="separated"
            radius="md"
          >
            {/* Basic Information */}
            <Accordion.Item value="basic">
              <Accordion.Control icon={<IconMovie size={20} />}>
                <Text fw={500}>Basic Information</Text>
              </Accordion.Control>
              <Accordion.Panel>
                <Grid>
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <TextInput
                      label="Project Name"
                      placeholder="Enter movie/project name"
                      required
                      leftSection={<IconMovie size={16} />}
                      {...form.getInputProps('project_name')}
                    />
                  </Grid.Col>
                  <Grid.Col span={12}>
                    <MultiSelect
                      label="Assign Crew Members"
                      placeholder="Select crew members for this call sheet"
                      data={crewSelectData}
                      searchable
                      clearable
                      required
                      disabled={crewLoading}
                      leftSection={<IconUsers size={16} />}
                      {...form.getInputProps('crew_ids')}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <TextInput
                      type="date"
                      label="Date"
                      required
                      leftSection={<IconCalendar size={16} />}
                      {...form.getInputProps('date')}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <TextInput
                      type="time"
                      label="Call Time"
                      required
                      leftSection={<IconClock size={16} />}
                      {...form.getInputProps('time')}
                    />
                  </Grid.Col>
                  <Grid.Col span={12}>
                    <Textarea
                      label="General Description"
                      placeholder="Additional notes or instructions..."
                      rows={3}
                      {...form.getInputProps('description')}
                    />
                  </Grid.Col>
                </Grid>
              </Accordion.Panel>
            </Accordion.Item>

            {/* Time Table */}
            <Accordion.Item value="timetable">
              <Accordion.Control icon={<IconClock size={20} />}>
                <Text fw={500}>Time Table</Text>
                <Badge size="sm" color="cyan" ml="xs">
                  {form.values.time_table.length} items
                </Badge>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Add schedule items for the production day (optional)
                    </Text>
                    <Button 
                      leftSection={<IconPlus size={16} />} 
                      variant="light" 
                      size="sm"
                      onClick={addTimeTableItem}
                    >
                      Add Item
                    </Button>
                  </Group>
                  
                  <ScrollArea.Autosize mah={400}>
                    <Stack gap="sm">
                      {form.values.time_table.length === 0 ? (
                        <Text size="sm" c="dimmed" ta="center" p="md">
                          No time table items added yet. Click "Add Item" to get started.
                        </Text>
                      ) : (
                        form.values.time_table.map((_, index) => (
                        <Card key={index} p="md" withBorder>
                          <Group justify="space-between" mb="xs">
                            <Text size="sm" fw={500} c="blue">
                              Item #{index + 1}
                            </Text>
                            {form.values.time_table.length > 1 && (
                              <ActionIcon
                                color="red"
                                variant="light"
                                onClick={() => removeTimeTableItem(index)}
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            )}
                          </Group>
                          <Grid>
                            <Grid.Col span={{ base: 12, md: 8 }}>
                              <TextInput
                                label="Item/Activity"
                                placeholder="e.g., Breakfast, Makeup, Shooting..."
                                required
                                {...form.getInputProps(`time_table.${index}.item`)}
                              />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, md: 4 }}>
                              <TextInput
                                type="time"
                                label="Time"
                                required
                                {...form.getInputProps(`time_table.${index}.date`)}
                              />
                            </Grid.Col>
                          </Grid>
                        </Card>
                        ))
                      )}
                    </Stack>
                  </ScrollArea.Autosize>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>

            {/* Locations */}
            <Accordion.Item value="locations">
              <Accordion.Control icon={<IconMapPin size={20} />}>
                <Text fw={500}>Locations</Text>
                <Badge size="sm" color="orange" ml="xs">
                  {form.values.location.length} locations
                </Badge>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Add shooting locations with contact details (optional)
                    </Text>
                    <Button 
                      leftSection={<IconPlus size={16} />} 
                      variant="light" 
                      size="sm"
                      onClick={addLocation}
                    >
                      Add Location
                    </Button>
                  </Group>
                  
                  <ScrollArea.Autosize mah={500}>
                    <Stack gap="sm">
                      {form.values.location.length === 0 ? (
                        <Text size="sm" c="dimmed" ta="center" p="md">
                          No locations added yet. Click "Add Location" to get started.
                        </Text>
                      ) : (
                        form.values.location.map((_, index) => (
                        <Card key={index} p="md" withBorder>
                          <Group justify="space-between" mb="xs">
                            <Text size="sm" fw={500} c="orange">
                              Location #{index + 1}
                            </Text>
                            {form.values.location.length > 1 && (
                              <ActionIcon
                                color="red"
                                variant="light"
                                onClick={() => removeLocation(index)}
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            )}
                          </Group>
                          <Grid>
                            <Grid.Col span={{ base: 12, md: 6 }}>
                              <TextInput
                                label="Location Title"
                                placeholder="Studio A, Outdoor Set, etc."
                                required
                                leftSection={<IconMapPin size={16} />}
                                {...form.getInputProps(`location.${index}.location_title`)}
                              />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, md: 6 }}>
                              <TextInput
                                label="Maps Link"
                                placeholder="https://maps.google.com/..."
                                leftSection={<IconLink size={16} />}
                                {...form.getInputProps(`location.${index}.link`)}
                              />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, md: 8 }}>
                              <Textarea
                                label="Address"
                                placeholder="Full address with landmarks..."
                                required
                                rows={2}
                                {...form.getInputProps(`location.${index}.address`)}
                              />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, md: 4 }}>
                              <TextInput
                                label="Contact Number"
                                placeholder="+1 234 567 8900"
                                required
                                leftSection={<IconPhone size={16} />}
                                {...form.getInputProps(`location.${index}.contact_number`)}
                              />
                            </Grid.Col>
                          </Grid>
                        </Card>
                        ))
                      )}
                    </Stack>
                  </ScrollArea.Autosize>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>

            {/* Schedule */}
            <Accordion.Item value="schedule">
              <Accordion.Control icon={<IconCalendar size={20} />}>
                <Text fw={500}>Shooting Schedule</Text>
                <Badge size="sm" color="green" ml="xs">
                  {form.values.schedule.length} scenes
                </Badge>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Detailed shooting schedule with scenes and descriptions
                    </Text>
                    <Button 
                      leftSection={<IconPlus size={16} />} 
                      variant="light" 
                      size="sm"
                      onClick={addScheduleItem}
                    >
                      Add Scene
                    </Button>
                  </Group>
                  
                  <ScrollArea.Autosize mah={500}>
                    <Stack gap="sm">
                      {form.values.schedule.map((_, index) => (
                        <Card key={index} p="md" withBorder>
                          <Group justify="space-between" mb="xs">
                            <Text size="sm" fw={500} c="green">
                              Scene #{index + 1}
                            </Text>
                            {form.values.schedule.length > 1 && (
                              <ActionIcon
                                color="red"
                                variant="light"
                                onClick={() => removeScheduleItem(index)}
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            )}
                          </Group>
                          <Grid>
                            <Grid.Col span={{ base: 12, md: 3 }}>
                              <TextInput
                                type="time"
                                label="Time"
                                required
                                leftSection={<IconClock size={16} />}
                                {...form.getInputProps(`schedule.${index}.time`)}
                              />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, md: 4 }}>
                              <TextInput
                                label="Scene"
                                placeholder="Scene 1A, Ext. Office, etc."
                                required
                                {...form.getInputProps(`schedule.${index}.scene`)}
                              />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, md: 5 }}>
                              <Textarea
                                label="Description"
                                placeholder="Detailed scene description..."
                                required
                                rows={2}
                                {...form.getInputProps(`schedule.${index}.description`)}
                              />
                            </Grid.Col>
                          </Grid>
                        </Card>
                      ))}
                    </Stack>
                  </ScrollArea.Autosize>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>

          <Divider my="xl" />

          <Group justify="center" mt="xl">
            <Button 
              type="submit" 
              size="lg" 
              loading={isLoading}
              leftSection={<IconCheck size={20} />}
            >
              {mode === 'edit' ? 'Update Call Sheet' : 'Create Call Sheet'}
            </Button>
          </Group>

          {Object.keys(form.errors).length > 0 && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              title="Form Validation Errors"
              color="red"
              mt="md"
            >
              <Stack gap="xs">
                <Text size="sm">Please fix the following errors before submitting:</Text>
                {Object.entries(form.errors).map(([field, error]) => {
                  // Handle nested errors for arrays
                  if (typeof error === 'object' && error !== null) {
                    return Object.entries(error).map(([index, nestedError]) => {
                      if (typeof nestedError === 'object' && nestedError !== null) {
                        return Object.entries(nestedError).map(([subField, subError]) => (
                          <Text key={`${field}.${index}.${subField}`} size="xs" c="red">
                            • {field.replace('_', ' ')} #{parseInt(index) + 1}: {String(subError)}
                          </Text>
                        ));
                      }
                      return (
                        <Text key={`${field}.${index}`} size="xs" c="red">
                          • {field.replace('_', ' ')}: {String(nestedError)}
                        </Text>
                      );
                    });
                  }
                  return (
                    <Text key={field} size="xs" c="red">
                      • {field.replace('_', ' ')}: {String(error)}
                    </Text>
                  );
                })}
              </Stack>
            </Alert>
          )}
        </form>
      </Paper>
    </Box>
  );
}
