import {
  Modal,
  Text,
  Button,
  Group,
  Stack,
  Alert
} from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

interface GenericConfirmationDialogProps {
  opened: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmColor?: string;
  cancelLabel?: string;
}

export default function GenericConfirmationDialog({
  opened,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel = 'Confirm',
  confirmColor = 'red',
  cancelLabel = 'Cancel'
}: GenericConfirmationDialogProps) {
  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      title={title}
      size="sm"
    >
      <Stack gap="md">
        <Group justify="center">
          <IconAlertTriangle 
            size={48} 
            color={confirmColor === 'orange' 
              ? "var(--mantine-color-orange-6)" 
              : "var(--mantine-color-red-6)"
            } 
          />
        </Group>
        
        <Text size="sm" ta="center">
          {message}
        </Text>

        <Alert color={confirmColor === 'orange' ? 'orange' : 'red'} title="Warning">
          {confirmColor === 'orange' 
            ? 'This item will be archived and hidden from active use, but can be restored later.'
            : 'This action cannot be undone.'
          }
        </Alert>

        <Group justify="flex-end" gap="xs">
          <Button variant="outline" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button color={confirmColor} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
