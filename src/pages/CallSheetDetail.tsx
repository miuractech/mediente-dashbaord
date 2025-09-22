import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Center, Loader, Text, Alert, Stack } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import CallSheetView from '../callsheet/CallSheetView';
import { callSheetService } from '../callsheet/callSheetService';
import type { CallSheetCompleteDB } from '../callsheet/database/callsheet';

export default function CallSheetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [callSheet, setCallSheet] = useState<CallSheetCompleteDB | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCallSheet = async () => {
      if (!id) {
        setError('Call sheet ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await callSheetService.getCallSheetById(id);
        
        if (response.success && response.data) {
          setCallSheet(response.data);
        } else {
          setError(response.message || 'Call sheet not found');
        }
      } catch (err) {
        console.error('Error loading call sheet:', err);
        setError('Failed to load call sheet');
      } finally {
        setLoading(false);
      }
    };

    loadCallSheet();
  }, [id]);

  const handleBack = () => {
    navigate('/admin/callsheet');
  };

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Center>
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
      <Container size="xl" py="xl">
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Error"
          color="red"
        >
          {error || 'Call sheet not found'}
        </Alert>
      </Container>
    );
  }

  return <CallSheetView callSheet={callSheet} onBack={handleBack} />;
}


