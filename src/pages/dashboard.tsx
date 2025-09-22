
import { Container } from '@mantine/core';
import { SimpleTaskOverview } from '../projects/SimpleTaskOverview';

export default function Dashboard() {
  return (
    <Container size="xl" py="xl">
      <SimpleTaskOverview />
    </Container>
  );
}