import { Modal, TextInput, Textarea, Select, Button, Group, Grid, FileInput, Avatar, ActionIcon, Tabs, Box } from '@mantine/core';
import { useForm } from '@mantine/form';
import { DateInput } from '@mantine/dates';
import { IconTrash, IconUpload, IconUser } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import type { crewType } from './crew.type';
import type { CreateCrewData, UpdateCrewData } from './crew.service';
import { useCrewMutations } from './crew.hook';

interface CrewFormModalProps {
  opened: boolean;
  onClose: () => void;
  crew?: crewType | null;
  onSuccess: () => void;
  currentUserId: string;
}

export const CrewFormModal = ({ 
  opened, 
  onClose, 
  crew, 
  onSuccess, 
  currentUserId 
}: CrewFormModalProps) => {
  const { createCrew, updateCrew, uploadProfilePicture, deleteProfilePicture, loading } = useCrewMutations();
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const form = useForm({
    initialValues: {
      name: '',
      email: '',
      phone: '',
      whatsapp: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      address: '',
      dob: null as Date | null,
      gender: '',
      marital_status: '',
      nationality: '',
      religion: '',
      hire_date: null as Date | null,
      employment_status: 'active',
      education: '',
      experience: '',
      skills: '',
      certifications: '',
      languages: '',
      interests: '',
      hobbies: '',
      achievements: '',
      awards: '',
      dietary_preference: '',
      medical_conditions: '',
      allergies: '',
      disabilities: '',
      other_info: '',
      notes: '',
      status: true,
    },
    validate: {
      name: (value) => (!value ? 'Name is required' : null),
      email: (value) => (!value ? 'Email is required' : !/^\S+@\S+$/.test(value) ? 'Invalid email' : null)
    }
  });

  useEffect(() => {
    if (crew) {
      form.setValues({
        name: crew.name,
        email: crew.email,
        phone: crew.phone || '',
        whatsapp: crew.whatsapp || '',
        emergency_contact_name: crew.emergency_contact_name || '',
        emergency_contact_phone: crew.emergency_contact_phone || '',
        address: crew.address || '',
        dob: crew.DOB ? new Date(crew.DOB) : null,
        gender: crew.gender || '',
        marital_status: crew.marital_status || '',
        nationality: crew.nationality || '',
        religion: crew.religion || '',
        hire_date: crew.hire_date ? new Date(crew.hire_date) : null,
        employment_status: crew.employment_status || 'active',
        education: crew.education || '',
        experience: crew.experience || '',
        skills: crew.skills || '',
        certifications: crew.certifications || '',
        languages: crew.languages || '',
        interests: crew.interests || '',
        hobbies: crew.hobbies || '',
        achievements: crew.achievements || '',
        awards: crew.awards || '',
        dietary_preference: crew.dietary_preference || '',
        medical_conditions: crew.medical_conditions || '',
        allergies: crew.allergies || '',
        disabilities: crew.disabilities || '',
        other_info: crew.other_info || '',
        notes: crew.notes || '',
        status: crew.status ?? true
      });
      setPreviewUrl(crew.photo_url || null);
    } else {
      form.reset();
      setPreviewUrl(null);
    }
    setProfileFile(null);
  }, [crew]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileChange = (file: File | null) => {
    setProfileFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleDeletePhoto = async () => {
    if (crew?.id && crew.photo_url) {
      try {
        await deleteProfilePicture(crew.id);
        setPreviewUrl(null);
        onSuccess();
      } catch (error) {
        console.error('Failed to delete photo:', error);
      }
    } else {
      setPreviewUrl(null);
      setProfileFile(null);
    }
  };

  const handleSubmit = async (values: typeof form.values) => {
    try {
      const baseData = {
        name: values.name,
        email: values.email,
        phone: values.phone || undefined,
        whatsapp: values.whatsapp || undefined,
        emergency_contact_name: values.emergency_contact_name || undefined,
        emergency_contact_phone: values.emergency_contact_phone || undefined,
        address: values.address || undefined,
        dob: values.dob instanceof Date ? values.dob.toISOString().split('T')[0] : undefined,
        gender: (values.gender as 'male' | 'female' | 'other') || undefined,
        marital_status: (values.marital_status as 'single' | 'married' | 'divorced' | 'widowed') || undefined,
        nationality: values.nationality || undefined,
        religion: values.religion || undefined,
        hire_date: values.hire_date instanceof Date ? values.hire_date.toISOString().split('T')[0] : undefined,
        employment_status: values.employment_status as 'active' | 'inactive' | 'terminated' | 'on_leave',
        education: values.education || undefined,
        experience: values.experience || undefined,
        skills: values.skills || undefined,
        certifications: values.certifications || undefined,
        languages: values.languages || undefined,
        interests: values.interests || undefined,
        hobbies: values.hobbies || undefined,
        achievements: values.achievements || undefined,
        awards: values.awards || undefined,
        dietary_preference: (values.dietary_preference as 'vegan' | 'vegetarian' | 'non-vegetarian') || undefined,
        medical_conditions: values.medical_conditions || undefined,
        allergies: values.allergies || undefined,
        disabilities: values.disabilities || undefined,
        other_info: values.other_info || undefined,
        notes: values.notes || undefined,
        status: values.status
      };

      let savedCrew: crewType;
      
      if (crew) {
        const updateData: UpdateCrewData = {
          ...baseData,
          updated_by: currentUserId
        };
        savedCrew = await updateCrew(crew.id, updateData);
      } else {
        const createData: CreateCrewData = {
          ...baseData,
          created_by: currentUserId
        };
        savedCrew = await createCrew(createData);
      }

      // Upload profile picture if selected
      if (profileFile && savedCrew.id) {
        await uploadProfilePicture(savedCrew.id, profileFile);
      }

      onSuccess();
      onClose();
      form.reset();
    } catch (error) {
      console.error('Failed to save crew:', error);
    }
  };


  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={crew ? 'Edit Crew Member' : 'Add Crew Member'}
      size="xl"
      styles={{
        body: { maxHeight: '80vh', overflowY: 'auto' }
      }}
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Tabs defaultValue="basic">
          <Tabs.List>
            <Tabs.Tab value="basic">Basic Info</Tabs.Tab>
            <Tabs.Tab value="personal">Personal</Tabs.Tab>
            <Tabs.Tab value="professional">Professional</Tabs.Tab>
            <Tabs.Tab value="additional">Additional</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="basic" pt="md">
            <Grid>
              <Grid.Col span={12}>
                <Box style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                  <Avatar 
                    src={previewUrl} 
                    size="xl" 
                    radius="md"
                    style={{ border: '2px solid #e0e0e0' }}
                  >
                    <IconUser size={40} />
                  </Avatar>
                  <div>
                    <FileInput
                      placeholder="Upload profile picture"
                      accept="image/*"
                      leftSection={<IconUpload size={14} />}
                      onChange={handleFileChange}
                      clearable
                    />
                    {previewUrl && (
                      <ActionIcon 
                        color="red" 
                        variant="subtle" 
                        onClick={handleDeletePhoto}
                        style={{ marginTop: 8 }}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    )}
                  </div>
                </Box>
              </Grid.Col>
              
              <Grid.Col span={6}>
                <TextInput
                  label="Name"
                  placeholder="Full name"
                  required
                  {...form.getInputProps('name')}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="Email"
                  placeholder="email@example.com"
                  required
                  {...form.getInputProps('email')}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="Phone"
                  placeholder="Phone number"
                  {...form.getInputProps('phone')}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="WhatsApp"
                  placeholder="WhatsApp number"
                  {...form.getInputProps('whatsapp')}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Select
                  label="Employment Status"
                  data={[
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                    { value: 'terminated', label: 'Terminated' },
                    { value: 'on_leave', label: 'On Leave' }
                  ]}
                  {...form.getInputProps('employment_status')}
                />
              </Grid.Col>
            </Grid>
          </Tabs.Panel>

          <Tabs.Panel value="personal" pt="md">
            <Grid>
              <Grid.Col span={6}>
                <DateInput
                  label="Date of Birth"
                  placeholder="Select date"
                  {...form.getInputProps('dob')}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Select
                  label="Gender"
                  data={[
                    { value: 'male', label: 'Male' },
                    { value: 'female', label: 'Female' },
                    { value: 'other', label: 'Other' }
                  ]}
                  {...form.getInputProps('gender')}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Select
                  label="Marital Status"
                  data={[
                    { value: 'single', label: 'Single' },
                    { value: 'married', label: 'Married' },
                    { value: 'divorced', label: 'Divorced' },
                    { value: 'widowed', label: 'Widowed' }
                  ]}
                  {...form.getInputProps('marital_status')}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="Nationality"
                  placeholder="Nationality"
                  {...form.getInputProps('nationality')}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="Religion"
                  placeholder="Religion"
                  {...form.getInputProps('religion')}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="Emergency Contact Name"
                  placeholder="Contact name"
                  {...form.getInputProps('emergency_contact_name')}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="Emergency Contact Phone"
                  placeholder="Contact phone"
                  {...form.getInputProps('emergency_contact_phone')}
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <Textarea
                  label="Address"
                  placeholder="Full address"
                  {...form.getInputProps('address')}
                />
              </Grid.Col>
            </Grid>
          </Tabs.Panel>

          <Tabs.Panel value="professional" pt="md">
            <Grid>
              <Grid.Col span={6}>
                <DateInput
                  label="Hire Date"
                  placeholder="Select date"
                  {...form.getInputProps('hire_date')}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Select
                  label="Dietary Preference"
                  data={[
                    { value: 'vegan', label: 'Vegan' },
                    { value: 'vegetarian', label: 'Vegetarian' },
                    { value: 'non-vegetarian', label: 'Non-Vegetarian' }
                  ]}
                  {...form.getInputProps('dietary_preference')}
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <Textarea
                  label="Education"
                  placeholder="Educational background"
                  {...form.getInputProps('education')}
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <Textarea
                  label="Experience"
                  placeholder="Work experience"
                  {...form.getInputProps('experience')}
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <Textarea
                  label="Skills"
                  placeholder="Skills and competencies"
                  {...form.getInputProps('skills')}
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <Textarea
                  label="Certifications"
                  placeholder="Certifications and licenses"
                  {...form.getInputProps('certifications')}
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <Textarea
                  label="Languages"
                  placeholder="Languages spoken"
                  {...form.getInputProps('languages')}
                />
              </Grid.Col>
            </Grid>
          </Tabs.Panel>

          <Tabs.Panel value="additional" pt="md">
            <Grid>
              <Grid.Col span={12}>
                <Textarea
                  label="Interests"
                  placeholder="Personal interests"
                  {...form.getInputProps('interests')}
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <Textarea
                  label="Hobbies"
                  placeholder="Hobbies"
                  {...form.getInputProps('hobbies')}
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <Textarea
                  label="Achievements"
                  placeholder="Notable achievements"
                  {...form.getInputProps('achievements')}
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <Textarea
                  label="Awards"
                  placeholder="Awards and recognition"
                  {...form.getInputProps('awards')}
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <Textarea
                  label="Medical Conditions"
                  placeholder="Medical conditions"
                  {...form.getInputProps('medical_conditions')}
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <Textarea
                  label="Allergies"
                  placeholder="Known allergies"
                  {...form.getInputProps('allergies')}
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <Textarea
                  label="Disabilities"
                  placeholder="Disabilities or special needs"
                  {...form.getInputProps('disabilities')}
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <Textarea
                  label="Other Information"
                  placeholder="Additional information"
                  {...form.getInputProps('other_info')}
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <Textarea
                  label="Notes"
                  placeholder="Internal notes"
                  {...form.getInputProps('notes')}
                />
              </Grid.Col>
            </Grid>
          </Tabs.Panel>
        </Tabs>

        <Group justify="flex-end" mt="xl">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {crew ? 'Update' : 'Create'} Crew Member
          </Button>
        </Group>
      </form>
    </Modal>
  );
};
