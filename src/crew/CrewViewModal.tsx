import { Modal, Avatar, Text, Badge, Group, Stack, Grid, Divider, Tabs } from '@mantine/core';
import { IconUser, IconMail, IconPhone, IconMapPin, IconCalendar, IconBriefcase } from '@tabler/icons-react';
import type { crewType } from './crew.type';

interface CrewViewModalProps {
  opened: boolean;
  onClose: () => void;
  crew: crewType | null;
}

export const CrewViewModal = ({ opened, onClose, crew }: CrewViewModalProps) => {
  if (!crew) return null;

  const getEmploymentStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'inactive': return 'gray';
      case 'terminated': return 'red';
      case 'on_leave': return 'yellow';
      default: return 'gray';
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };


  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Crew Member Details"
      size="lg"
      styles={{
        body: { maxHeight: '80vh', overflowY: 'auto' }
      }}
    >
      <Stack gap="md">
        {/* Header with photo and basic info */}
        <Group align="flex-start">
          <Avatar 
            src={crew.photo_url} 
            size="xl" 
            radius="md"
            style={{ border: '2px solid #e0e0e0' }}
          >
            <IconUser size={40} />
          </Avatar>
          <Stack gap="xs" style={{ flex: 1 }}>
            <Group align="center">
              <Text size="xl" fw={600}>{crew.name}</Text>
              {crew.is_archived && (
                <Badge color="red" variant="outline">Archived</Badge>
              )}
            </Group>
            <Group align="center" gap="xs">
              <IconMail size={16} />
              <Text size="sm" c="dimmed">{crew.email}</Text>
            </Group>
            {crew.phone && (
              <Group align="center" gap="xs">
                <IconPhone size={16} />
                <Text size="sm" c="dimmed">{crew.phone}</Text>
              </Group>
            )}
            <Group>
              <Badge 
                color={crew.status ? 'green' : 'red'} 
                variant="light"
              >
                {crew.status ? 'Active' : 'Inactive'}
              </Badge>
              <Badge 
                color={getEmploymentStatusColor(crew.employment_status || 'active')} 
                variant="light"
              >
                {crew.employment_status?.replace('_', ' ').toUpperCase() || 'ACTIVE'}
              </Badge>
            </Group>
          </Stack>
        </Group>

        <Divider />

        <Tabs defaultValue="professional">
          <Tabs.List>
            <Tabs.Tab value="professional" leftSection={<IconBriefcase size={14} />}>
              Professional
            </Tabs.Tab>
            <Tabs.Tab value="personal" leftSection={<IconUser size={14} />}>
              Personal
            </Tabs.Tab>
            <Tabs.Tab value="contact" leftSection={<IconPhone size={14} />}>
              Contact & Emergency
            </Tabs.Tab>
            <Tabs.Tab value="additional" leftSection={<IconCalendar size={14} />}>
              Additional Info
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="professional" pt="md">
            <Grid>
              <Grid.Col span={6}>
                <Text size="sm" fw={500} mb="xs">Hire Date</Text>
                <Text size="sm" c="dimmed">{formatDate(crew.hire_date)}</Text>
              </Grid.Col>
              
              <Grid.Col span={6}>
                <Text size="sm" fw={500} mb="xs">Employment Status</Text>
                <Badge 
                  color={getEmploymentStatusColor(crew.employment_status || 'active')} 
                  variant="light"
                >
                  {crew.employment_status?.replace('_', ' ').toUpperCase() || 'ACTIVE'}
                </Badge>
              </Grid.Col>

              {crew.education && (
                <Grid.Col span={12}>
                  <Text size="sm" fw={500} mb="xs">Education</Text>
                  <Text size="sm" c="dimmed">{crew.education}</Text>
                </Grid.Col>
              )}

              {crew.experience && (
                <Grid.Col span={12}>
                  <Text size="sm" fw={500} mb="xs">Experience</Text>
                  <Text size="sm" c="dimmed">{crew.experience}</Text>
                </Grid.Col>
              )}

              {crew.skills && (
                <Grid.Col span={12}>
                  <Text size="sm" fw={500} mb="xs">Skills</Text>
                  <Text size="sm" c="dimmed">{crew.skills}</Text>
                </Grid.Col>
              )}

              {crew.certifications && (
                <Grid.Col span={12}>
                  <Text size="sm" fw={500} mb="xs">Certifications</Text>
                  <Text size="sm" c="dimmed">{crew.certifications}</Text>
                </Grid.Col>
              )}

              {crew.languages && (
                <Grid.Col span={12}>
                  <Text size="sm" fw={500} mb="xs">Languages</Text>
                  <Text size="sm" c="dimmed">{crew.languages}</Text>
                </Grid.Col>
              )}
            </Grid>
          </Tabs.Panel>

          <Tabs.Panel value="personal" pt="md">
            <Grid>
              <Grid.Col span={6}>
                <Text size="sm" fw={500} mb="xs">Date of Birth</Text>
                <Text size="sm" c="dimmed">{formatDate(crew.DOB)}</Text>
              </Grid.Col>
              
              <Grid.Col span={6}>
                <Text size="sm" fw={500} mb="xs">Gender</Text>
                <Text size="sm" c="dimmed">{crew.gender ? crew.gender.charAt(0).toUpperCase() + crew.gender.slice(1) : '-'}</Text>
              </Grid.Col>

              <Grid.Col span={6}>
                <Text size="sm" fw={500} mb="xs">Marital Status</Text>
                <Text size="sm" c="dimmed">{crew.marital_status ? crew.marital_status.charAt(0).toUpperCase() + crew.marital_status.slice(1) : '-'}</Text>
              </Grid.Col>

              <Grid.Col span={6}>
                <Text size="sm" fw={500} mb="xs">Nationality</Text>
                <Text size="sm" c="dimmed">{crew.nationality || '-'}</Text>
              </Grid.Col>

              <Grid.Col span={6}>
                <Text size="sm" fw={500} mb="xs">Religion</Text>
                <Text size="sm" c="dimmed">{crew.religion || '-'}</Text>
              </Grid.Col>

              <Grid.Col span={6}>
                <Text size="sm" fw={500} mb="xs">Dietary Preference</Text>
                <Text size="sm" c="dimmed">{crew.dietary_preference ? crew.dietary_preference.charAt(0).toUpperCase() + crew.dietary_preference.slice(1) : '-'}</Text>
              </Grid.Col>

              {crew.address && (
                <Grid.Col span={12}>
                  <Text size="sm" fw={500} mb="xs">Address</Text>
                  <Text size="sm" c="dimmed">{crew.address}</Text>
                </Grid.Col>
              )}

              {crew.medical_conditions && (
                <Grid.Col span={12}>
                  <Text size="sm" fw={500} mb="xs">Medical Conditions</Text>
                  <Text size="sm" c="dimmed">{crew.medical_conditions}</Text>
                </Grid.Col>
              )}

              {crew.allergies && (
                <Grid.Col span={12}>
                  <Text size="sm" fw={500} mb="xs">Allergies</Text>
                  <Text size="sm" c="dimmed">{crew.allergies}</Text>
                </Grid.Col>
              )}

              {crew.disabilities && (
                <Grid.Col span={12}>
                  <Text size="sm" fw={500} mb="xs">Disabilities</Text>
                  <Text size="sm" c="dimmed">{crew.disabilities}</Text>
                </Grid.Col>
              )}
            </Grid>
          </Tabs.Panel>

          <Tabs.Panel value="contact" pt="md">
            <Grid>
              <Grid.Col span={6}>
                <Text size="sm" fw={500} mb="xs">Phone</Text>
                <Text size="sm" c="dimmed">{crew.phone || '-'}</Text>
              </Grid.Col>
              
              <Grid.Col span={6}>
                <Text size="sm" fw={500} mb="xs">WhatsApp</Text>
                <Text size="sm" c="dimmed">{crew.whatsapp || '-'}</Text>
              </Grid.Col>

              <Grid.Col span={6}>
                <Text size="sm" fw={500} mb="xs">Emergency Contact Name</Text>
                <Text size="sm" c="dimmed">{crew.emergency_contact_name || '-'}</Text>
              </Grid.Col>

              <Grid.Col span={6}>
                <Text size="sm" fw={500} mb="xs">Emergency Contact Phone</Text>
                <Text size="sm" c="dimmed">{crew.emergency_contact_phone || '-'}</Text>
              </Grid.Col>

              {crew.address && (
                <Grid.Col span={12}>
                  <Text size="sm" fw={500} mb="xs">Address</Text>
                  <Group align="flex-start" gap="xs">
                    <IconMapPin size={16} style={{ marginTop: 2 }} />
                    <Text size="sm" c="dimmed">{crew.address}</Text>
                  </Group>
                </Grid.Col>
              )}
            </Grid>
          </Tabs.Panel>

          <Tabs.Panel value="additional" pt="md">
            <Grid>
              {crew.interests && (
                <Grid.Col span={12}>
                  <Text size="sm" fw={500} mb="xs">Interests</Text>
                  <Text size="sm" c="dimmed">{crew.interests}</Text>
                </Grid.Col>
              )}

              {crew.hobbies && (
                <Grid.Col span={12}>
                  <Text size="sm" fw={500} mb="xs">Hobbies</Text>
                  <Text size="sm" c="dimmed">{crew.hobbies}</Text>
                </Grid.Col>
              )}

              {crew.achievements && (
                <Grid.Col span={12}>
                  <Text size="sm" fw={500} mb="xs">Achievements</Text>
                  <Text size="sm" c="dimmed">{crew.achievements}</Text>
                </Grid.Col>
              )}

              {crew.awards && (
                <Grid.Col span={12}>
                  <Text size="sm" fw={500} mb="xs">Awards</Text>
                  <Text size="sm" c="dimmed">{crew.awards}</Text>
                </Grid.Col>
              )}

              {crew.other_info && (
                <Grid.Col span={12}>
                  <Text size="sm" fw={500} mb="xs">Other Information</Text>
                  <Text size="sm" c="dimmed">{crew.other_info}</Text>
                </Grid.Col>
              )}

              {crew.notes && (
                <Grid.Col span={12}>
                  <Text size="sm" fw={500} mb="xs">Notes</Text>
                  <Text size="sm" c="dimmed">{crew.notes}</Text>
                </Grid.Col>
              )}

              <Grid.Col span={6}>
                <Text size="sm" fw={500} mb="xs">Created At</Text>
                <Text size="sm" c="dimmed">{formatDate(crew.created_at)}</Text>
              </Grid.Col>

              <Grid.Col span={6}>
                <Text size="sm" fw={500} mb="xs">Last Updated</Text>
                <Text size="sm" c="dimmed">{formatDate(crew.updated_at)}</Text>
              </Grid.Col>

              {crew.last_login && (
                <Grid.Col span={6}>
                  <Text size="sm" fw={500} mb="xs">Last Login</Text>
                  <Text size="sm" c="dimmed">{formatDate(crew.last_login)}</Text>
                </Grid.Col>
              )}
            </Grid>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Modal>
  );
};
