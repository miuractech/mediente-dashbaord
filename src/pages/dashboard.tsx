
import { Container, Stack, Group, Text, Title, Box, Avatar } from '@mantine/core';
import { SimpleTaskOverview } from '../projects/SimpleTaskOverview';
import { useAuth } from '../auth/useAuth';

export default function Dashboard() {
  const { user } = useAuth();
  
  const getCurrentDate = () => {
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const dayName = days[now.getDay()];
    const month = months[now.getMonth()];
    const day = now.getDate();
    
    return `${dayName}, ${month} ${day}`;
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Greeting Section */}
        <Box mb="lg">
          <Text size="md" c="dimmed" mb="xs">
            {getCurrentDate()}
          </Text>
          <Group gap="lg" align="center">
            <Box>
              <Title 
                order={1} 
                size="3rem" 
                fw={700} 
                c="dark.8"
                style={{ 
                  background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                Hello, admin
              </Title>
              <Text 
                size="xl" 
                fw={400}
                mt="xs"
                style={{ 
                  background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #06b6d4 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                Here are some things you should focus on today!
              </Text>
            </Box>
            <Avatar 
              size={80} 
              radius="xl" 
              color="primary" 
              gradient={{ from: 'primary.5', to: 'primary.7' }}
              style={{ 
                boxShadow: '0 10px 30px rgba(124, 110, 228, 0.3)',
                border: '4px solid #f8fafc'
              }}
            >
              {user?.name.charAt(0).toUpperCase()}
            </Avatar>
          </Group>
        </Box>

        <SimpleTaskOverview />
      </Stack>
    </Container>
  );
}