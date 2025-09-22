import { useState, useEffect } from 'react';
import {
  Modal,
  TextInput,
  Textarea,
  Button,
  Group,
  Stack,
  Text,
  FileInput,
  Image,
  Box,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconUpload, IconX } from '@tabler/icons-react';
import { useUpdateProject, useUploadProjectImage } from './project.hook';
import type { ProjectWithStats, UpdateProjectInput } from './project.typs';

interface EditProjectModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  project: ProjectWithStats | null;
}

export function EditProjectModal({ opened, onClose, onSuccess, project }: EditProjectModalProps) {
  const { updateProject, loading: updateLoading } = useUpdateProject();
  const { uploadImage, loading: uploadLoading } = useUploadProjectImage();
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const form = useForm<UpdateProjectInput>({
    initialValues: {
      project_name: '',
      project_description: '',
      image_url: '',
    },
    validate: {
      project_name: (value) => (!value ? 'Project name is required' : null),
    },
  });

  useEffect(() => {
    if (project && opened) {
      form.setValues({
        project_name: project.project_name,
        project_description: project.project_description || '',
        image_url: project.image_url || '',
      });
      setImagePreview(project.image_url || null);
      setSelectedImageFile(null);
    }
  }, [project, opened]);

  const handleSubmit = async (values: UpdateProjectInput) => {
    if (!project) return;

    const finalValues = { ...values };

    // Upload new image if selected
    if (selectedImageFile) {
      const imageUrl = await uploadImage(selectedImageFile, project.project_id);
      if (imageUrl) {
        finalValues.image_url = imageUrl;
      }
    } else if (!selectedImageFile && imagePreview === null) {
      // If no new file selected and image preview is cleared, remove image
      finalValues.image_url = null;
    }

    const updatedProject = await updateProject(project.project_id, finalValues);
    if (updatedProject) {
      handleClose();
      onSuccess?.();
    }
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
      // Reset to original image if file is cleared
      setImagePreview(project?.image_url || null);
    }
  };

  const handleClose = () => {
    form.reset();
    setSelectedImageFile(null);
    setImagePreview(null);
    onClose();
  };

  if (!project) return null;

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Edit Project"
      size="md"
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
                placeholder="Select new project image"
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
                    onClick={() => {
                      setSelectedImageFile(null);
                      setImagePreview(null);
                    }}
                  >
                    <IconX size={12} />
                  </Button>
                </Box>
              )}
            </Stack>
          </div>

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={handleClose} disabled={updateLoading || uploadLoading}>
              Cancel
            </Button>
            <Button type="submit" loading={updateLoading || uploadLoading}>
              Update Project
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
