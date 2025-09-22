import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Modal,
  TextInput,
  Textarea,
  Button,
  Group,
  Stack,
  Text,
  Card,
  Badge,
  SimpleGrid,
  Loader,
  Center,
  FileInput,
  Image,
  Box,
  ScrollArea,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { DateInput } from '@mantine/dates';
import { IconUpload, IconX, IconSearch } from '@tabler/icons-react';
import { useDebouncedValue } from '@mantine/hooks';
import { useAvailableTemplates, useCreateProject, useUpdateProject, useUploadProjectImage } from './project.hook';
import type { CreateProjectInput, TemplateOption } from './project.typs';

interface ProjectFormModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ProjectFormModal({ opened, onClose, onSuccess }: ProjectFormModalProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebouncedValue(searchTerm, 300);
  const { templates, loading: templatesLoading, hasMore, loadMore } = useAvailableTemplates(debouncedSearchTerm, 5);
  const { createProject, loading: createLoading } = useCreateProject();
  const { updateProject, loading: updateLoading } = useUpdateProject();
  const { uploadImage, loading: uploadLoading } = useUploadProjectImage();
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const form = useForm<CreateProjectInput>({
    initialValues: {
      project_name: '',
      project_description: '',
      image_url: '',
      project_start_date: '',
      template_id: '',
    },
    validate: {
      project_name: (value) => (!value ? 'Project name is required' : null),
      template_id: (value) => (!value ? 'Please select a template' : null),
    },
  });

  const handleSubmit = async (values: CreateProjectInput) => {
    let createdProject;
    
    // If there's a selected image file, upload it first and include URL in project creation
    if (selectedImageFile) {
      // Create a temporary project to get an ID for the upload path
      const tempProject = await createProject(values);
      if (tempProject) {
        // Upload image with the project ID
        const imageUrl = await uploadImage(selectedImageFile, tempProject.project_id);
        if (imageUrl) {
          // Update the project record with the image URL
          await updateProject(tempProject.project_id, { image_url: imageUrl });
        }
        createdProject = tempProject;
      }
    } else {
      // No image selected, create project normally
      createdProject = await createProject(values);
    }
    
    if (createdProject) {
      // Success - clean up and close
      form.reset();
      setSelectedTemplate(null);
      setSelectedImageFile(null);
      setImagePreview(null);
      onSuccess?.();
      onClose();
      
      // Redirect to crew management page for role assignment
      navigate(`/admin/projects/${createdProject.project_id}/crew-management`);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    form.setFieldValue('template_id', templateId);
    const template = templates.find(t => t.template_id === templateId);
    setSelectedTemplate(template || null);
  };

  const handleImageChange = (file: File | null) => {
    setSelectedImageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const handleClose = () => {
    form.reset();
    setSelectedTemplate(null);
    setSelectedImageFile(null);
    setImagePreview(null);
    setSearchTerm('');
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Create New Project"
      size="lg"
      centered
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Project Name"
            placeholder="Enter project name"
            required
            {...form.getInputProps('project_name')}
          />

          <Textarea
            label="Description"
            placeholder="Enter project description"
            rows={3}
            {...form.getInputProps('project_description')}
          />

          <div>
            <Text size="sm" fw={500} mb="xs">
              Project Image
            </Text>
            
            <Stack gap="sm">
              <FileInput
                placeholder="Select project image"
                accept="image/*"
                value={selectedImageFile}
                onChange={handleImageChange}
                leftSection={<IconUpload size={16} />}
                clearable
              />
              
              {imagePreview && (
                <Box pos="relative" w="fit-content">
                  <Image
                    src={imagePreview}
                    alt="Project preview"
                    h={300}
                    w="auto"
                    radius="md"
                  />
                  <Button
                    size="xs"
                    variant="filled"
                    color="red"
                    pos="absolute"
                    top={4}
                    right={4}
                    onClick={() => handleImageChange(null)}
                  >
                    <IconX size={12} />
                  </Button>
                </Box>
              )}
            </Stack>
          </div>

          <DateInput
            label="Start Date"
            placeholder="Select start date"
            value={form.values.project_start_date ? new Date(form.values.project_start_date) : null}
            onChange={(date) => 
              form.setFieldValue('project_start_date', date ? new Date(date).toISOString().split('T')[0] : '')
            }
          />

          <div>
            <Text size="sm" fw={500} mb="xs">
              Select Template *
            </Text>
            
            <TextInput
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftSection={<IconSearch size={16} />}
              mb="md"
            />
            
            {templatesLoading ? (
              <Center h={100}>
                <Loader size="sm" />
              </Center>
            ) : (
              <ScrollArea h={300}>
                <SimpleGrid cols={1} spacing="sm">
                  {templates.map((template) => (
                    <Card
                      key={template.template_id}
                      p="sm"
                      withBorder
                      style={{
                        cursor: 'pointer',
                        backgroundColor: selectedTemplate?.template_id === template.template_id 
                          ? 'var(--mantine-color-blue-light)' 
                          : undefined,
                        borderColor: selectedTemplate?.template_id === template.template_id 
                          ? 'var(--mantine-color-blue-filled)' 
                          : undefined,
                      }}
                      onClick={() => handleTemplateSelect(template.template_id)}
                    >
                      <Group justify="space-between" mb="xs">
                        <Text fw={500} size="sm">
                          {template.template_name}
                        </Text>
                        <Group gap="xs">
                          <Badge variant="light" size="xs">
                            {template.phase_count} phases
                          </Badge>
                          <Badge variant="light" size="xs">
                            {template.task_count} tasks
                          </Badge>
                        </Group>
                      </Group>
                      
                      {template.description && (
                        <Text size="xs" c="dimmed" mb="xs">
                          {template.description}
                        </Text>
                      )}
                      
                      <Group gap="md">
                        <Text size="xs" c="dimmed">
                          {template.step_count} steps
                        </Text>
                        <Text size="xs" c="dimmed">
                          {template.total_estimated_hours}h estimated
                        </Text>
                        <Text size="xs" c="dimmed">
                          {template.roles_involved} roles
                        </Text>
                      </Group>
                    </Card>
                  ))}
                  
                  {hasMore && (
                    <Center mt="md">
                      <Button variant="subtle" onClick={loadMore} loading={templatesLoading}>
                        Load More Templates
                      </Button>
                    </Center>
                  )}
                </SimpleGrid>
              </ScrollArea>
            )}
            
            {form.errors.template_id && (
              <Text size="xs" c="red" mt="xs">
                {form.errors.template_id}
              </Text>
            )}
          </div>

          {selectedTemplate && (
            <Card withBorder p="sm" bg="gray.0">
              <Text size="sm" fw={500} mb="xs">
                Selected Template: {selectedTemplate.template_name}
              </Text>
              <Group gap="md">
                <Badge variant="outline" size="sm">
                  {selectedTemplate.phase_count} Phases
                </Badge>
                <Badge variant="outline" size="sm">
                  {selectedTemplate.step_count} Steps
                </Badge>
                <Badge variant="outline" size="sm">
                  {selectedTemplate.task_count} Tasks
                </Badge>
                <Badge variant="outline" size="sm">
                  {selectedTemplate.total_estimated_hours}h Total
                </Badge>
              </Group>
            </Card>
          )}

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={handleClose} disabled={createLoading || updateLoading || uploadLoading}>
              Cancel
            </Button>
            <Button type="submit" loading={createLoading || updateLoading || uploadLoading}>
              Create Project
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
