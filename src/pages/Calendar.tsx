import { Container, Title, SegmentedControl, Card, Text, Group, Badge, Stack, Box } from '@mantine/core';
import { Calendar as BigCalendar, momentLocalizer, Views } from 'react-big-calendar';
import type { View } from 'react-big-calendar';
import { Gantt, ViewMode } from 'gantt-task-react';
import type { Task } from 'gantt-task-react';
import { useState } from 'react';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'gantt-task-react/dist/index.css';

// Setup the localizer for react-big-calendar
const localizer = momentLocalizer(moment);

// Movie production project data
const movieProjects = [
  {
    id: '1',
    name: 'The Last Frontier - Feature Film',
    type: 'Feature Film',
    status: 'active',
    startDate: new Date('2024-01-15'),
    endDate: new Date('2024-08-30'),
    progress: 35,
    budget: '$12M',
    director: 'Sarah Chen',
    producer: 'Michael Rodriguez',
    tasks: [
      { 
        id: 't1', 
        name: 'Script Finalization', 
        startDate: new Date('2024-01-15'), 
        endDate: new Date('2024-02-15'), 
        status: 'completed',
        department: 'Development',
        assignee: 'Script Writer',
        priority: 'High'
      },
      { 
        id: 't2', 
        name: 'Legal Documentation & Contracts', 
        startDate: new Date('2024-02-01'), 
        endDate: new Date('2024-03-01'), 
        status: 'completed',
        department: 'Legal',
        assignee: 'Legal Team',
        priority: 'High'
      },
      { 
        id: 't3', 
        name: 'Cast Auditions', 
        startDate: new Date('2024-02-15'), 
        endDate: new Date('2024-03-30'), 
        status: 'ongoing',
        department: 'Casting',
        assignee: 'Casting Director',
        priority: 'High'
      },
      { 
        id: 't4', 
        name: 'Location Scouting', 
        startDate: new Date('2024-03-01'), 
        endDate: new Date('2024-04-15'), 
        status: 'ongoing',
        department: 'Production',
        assignee: 'Location Manager',
        priority: 'Medium'
      },
      { 
        id: 't5', 
        name: 'Crew Hiring', 
        startDate: new Date('2024-03-15'), 
        endDate: new Date('2024-04-30'), 
        status: 'pending',
        department: 'Production',
        assignee: 'Unit Production Manager',
        priority: 'High'
      },
      { 
        id: 't6', 
        name: 'Equipment & Set Design', 
        startDate: new Date('2024-04-01'), 
        endDate: new Date('2024-05-15'), 
        status: 'pending',
        department: 'Art Department',
        assignee: 'Production Designer',
        priority: 'Medium'
      },
      { 
        id: 't7', 
        name: 'Principal Photography', 
        startDate: new Date('2024-05-01'), 
        endDate: new Date('2024-07-15'), 
        status: 'pending',
        department: 'Production',
        assignee: 'Director of Photography',
        priority: 'Critical'
      },
      { 
        id: 't8', 
        name: 'Post-Production & Editing', 
        startDate: new Date('2024-07-01'), 
        endDate: new Date('2024-08-30'), 
        status: 'pending',
        department: 'Post-Production',
        assignee: 'Editor',
        priority: 'High'
      }
    ]
  },
  {
    id: '2',
    name: 'City Lights - Documentary Series',
    type: 'Documentary Series',
    status: 'active',
    startDate: new Date('2024-02-01'),
    endDate: new Date('2024-09-30'),
    progress: 60,
    budget: '$3.5M',
    director: 'Alex Thompson',
    producer: 'Jennifer Park',
    tasks: [
      { 
        id: 't9', 
        name: 'Research & Story Development', 
        startDate: new Date('2024-02-01'), 
        endDate: new Date('2024-03-15'), 
        status: 'completed',
        department: 'Development',
        assignee: 'Research Team',
        priority: 'High'
      },
      { 
        id: 't10', 
        name: 'Interview Scheduling & Coordination', 
        startDate: new Date('2024-03-01'), 
        endDate: new Date('2024-04-30'), 
        status: 'completed',
        department: 'Production',
        assignee: 'Production Coordinator',
        priority: 'Medium'
      },
      { 
        id: 't11', 
        name: 'Travel Arrangements', 
        startDate: new Date('2024-03-15'), 
        endDate: new Date('2024-05-01'), 
        status: 'ongoing',
        department: 'Production',
        assignee: 'Travel Coordinator',
        priority: 'Medium'
      },
      { 
        id: 't12', 
        name: 'Documentary Filming - Episodes 1-3', 
        startDate: new Date('2024-04-01'), 
        endDate: new Date('2024-06-30'), 
        status: 'ongoing',
        department: 'Production',
        assignee: 'Camera Crew',
        priority: 'High'
      },
      { 
        id: 't13', 
        name: 'Archive Footage Licensing', 
        startDate: new Date('2024-05-01'), 
        endDate: new Date('2024-07-15'), 
        status: 'pending',
        department: 'Legal',
        assignee: 'Rights Manager',
        priority: 'Medium'
      },
      { 
        id: 't14', 
        name: 'Rough Cut Assembly', 
        startDate: new Date('2024-06-15'), 
        endDate: new Date('2024-08-15'), 
        status: 'pending',
        department: 'Post-Production',
        assignee: 'Assistant Editor',
        priority: 'Medium'
      },
      { 
        id: 't15', 
        name: 'Final Edit & Color Correction', 
        startDate: new Date('2024-08-01'), 
        endDate: new Date('2024-09-30'), 
        status: 'pending',
        department: 'Post-Production',
        assignee: 'Senior Editor',
        priority: 'High'
      }
    ]
  },
  {
    id: '3',
    name: 'Midnight Express - Short Film',
    type: 'Short Film',
    status: 'active',
    startDate: new Date('2024-01-10'),
    endDate: new Date('2024-04-20'),
    progress: 85,
    budget: '$150K',
    director: 'Maria Santos',
    producer: 'David Kim',
    tasks: [
      { 
        id: 't16', 
        name: 'Script & Storyboard Completion', 
        startDate: new Date('2024-01-10'), 
        endDate: new Date('2024-01-25'), 
        status: 'completed',
        department: 'Development',
        assignee: 'Writer/Director',
        priority: 'High'
      },
      { 
        id: 't17', 
        name: 'Permit Applications', 
        startDate: new Date('2024-01-20'), 
        endDate: new Date('2024-02-10'), 
        status: 'completed',
        department: 'Legal',
        assignee: 'Location Manager',
        priority: 'High'
      },
      { 
        id: 't18', 
        name: 'Cast & Crew Assembly', 
        startDate: new Date('2024-02-01'), 
        endDate: new Date('2024-02-20'), 
        status: 'completed',
        department: 'Production',
        assignee: 'Casting Director',
        priority: 'High'
      },
      { 
        id: 't19', 
        name: 'Production Filming', 
        startDate: new Date('2024-02-25'), 
        endDate: new Date('2024-03-10'), 
        status: 'completed',
        department: 'Production',
        assignee: 'Film Crew',
        priority: 'Critical'
      },
      { 
        id: 't20', 
        name: 'Sound Design & Music', 
        startDate: new Date('2024-03-05'), 
        endDate: new Date('2024-04-01'), 
        status: 'ongoing',
        department: 'Post-Production',
        assignee: 'Sound Designer',
        priority: 'Medium'
      },
      { 
        id: 't21', 
        name: 'Festival Submission Preparation', 
        startDate: new Date('2024-03-20'), 
        endDate: new Date('2024-04-20'), 
        status: 'pending',
        department: 'Distribution',
        assignee: 'Festival Coordinator',
        priority: 'Medium'
      }
    ]
  }
];

// Enhanced Calendar View with React Big Calendar
function CalendarView() {
  const [view, setView] = useState<View>(Views.MONTH);

  // Convert tasks to calendar events
  const calendarEvents = movieProjects.flatMap(project =>
    project.tasks.map(task => ({
      id: task.id,
      title: `${task.name} (${project.name})`,
      start: task.startDate,
      end: task.endDate,
      resource: {
        project: project.name,
        department: task.department,
        assignee: task.assignee,
        status: task.status,
        priority: task.priority,
        projectType: project.type
      }
    }))
  );

  // Event style getter for color coding
  const eventStyleGetter = (event: { resource: { status: string; priority: string } }) => {
    const { status, priority } = event.resource;
    let backgroundColor = '#3174ad';
    
    if (status === 'completed') backgroundColor = '#28a745';
    else if (status === 'ongoing') backgroundColor = '#007bff';
    else if (status === 'pending' && priority === 'Critical') backgroundColor = '#dc3545';
    else if (status === 'pending' && priority === 'High') backgroundColor = '#fd7e14';
    else if (status === 'pending') backgroundColor = '#6c757d';

    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    };
  };

  return (
    <Box>
      <Title order={3} mb="md">Production Calendar</Title>
      <Box style={{ height: '600px' }}>
        <BigCalendar
          localizer={localizer}
          events={calendarEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          eventPropGetter={eventStyleGetter}
          views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
          view={view}
          onView={(newView: View) => setView(newView)}
          popup
          tooltipAccessor={(event: { title: string; resource: { department: string; assignee: string; priority: string } }) => 
            `${event.title}\nDepartment: ${event.resource.department}\nAssignee: ${event.resource.assignee}\nPriority: ${event.resource.priority}`
          }
        />
      </Box>
      
      {/* Legend */}
      <Group mt="md" gap="md">
        <Badge color="green">Completed</Badge>
        <Badge color="blue">Ongoing</Badge>
        <Badge color="red">Critical Pending</Badge>
        <Badge color="orange">High Priority Pending</Badge>
        <Badge color="gray">Pending</Badge>
      </Group>
    </Box>
  );
}

// Enhanced Gantt View with gantt-task-react
function GanttView() {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Month);

  // Convert movie projects to Gantt tasks
  const ganttTasks: Task[] = movieProjects.flatMap(project => {
    const projectTask: Task = {
      start: project.startDate,
      end: project.endDate,
      name: `${project.name} (${project.type})`,
      id: project.id,
      progress: project.progress,
      type: 'project',
      hideChildren: false,
      displayOrder: parseInt(project.id)
    };

    const childTasks: Task[] = project.tasks.map((task, index) => ({
      start: task.startDate,
      end: task.endDate,
      name: task.name,
      id: task.id,
      progress: task.status === 'completed' ? 100 : task.status === 'ongoing' ? 50 : 0,
      type: 'task',
      project: project.id,
      displayOrder: parseInt(project.id) * 100 + index,
      dependencies: index > 0 ? [project.tasks[index - 1].id] : undefined,
      styles: {
        backgroundColor: 
          task.status === 'completed' ? '#28a745' :
          task.status === 'ongoing' ? '#007bff' :
          task.priority === 'Critical' ? '#dc3545' :
          task.priority === 'High' ? '#fd7e14' : '#6c757d',
        backgroundSelectedColor: '#aeb4b7',
        progressColor: '#ffbb54',
        progressSelectedColor: '#ff9e0d',
      }
    }));

    return [projectTask, ...childTasks];
  });

  const handleTaskChange = (task: Task) => {
    console.log('Task changed:', task);
  };

  const handleTaskDelete = (task: Task) => {
    console.log('Task deleted:', task);
  };

  const handleProgressChange = (task: Task) => {
    console.log('Progress changed:', task);
  };

  const handleDblClick = (task: Task) => {
    console.log('Task double clicked:', task);
  };

  return (
    <Box>
      <Group justify="space-between" mb="md">
        <Title order={3}>Production Timeline - Gantt Chart</Title>
        <SegmentedControl
          value={viewMode}
          onChange={(value) => setViewMode(value as ViewMode)}
          data={[
            { label: 'Day', value: ViewMode.Day },
            { label: 'Week', value: ViewMode.Week },
            { label: 'Month', value: ViewMode.Month },
            { label: 'Year', value: ViewMode.Year }
          ]}
        />
      </Group>

      <Box style={{ height: '600px', overflowX: 'auto' }}>
        <Gantt
          tasks={ganttTasks}
          viewMode={viewMode}
          onDateChange={handleTaskChange}
          onDelete={handleTaskDelete}
          onProgressChange={handleProgressChange}
          onDoubleClick={handleDblClick}
          listCellWidth="200px"
          columnWidth={viewMode === ViewMode.Month ? 65 : viewMode === ViewMode.Week ? 100 : 50}
          rowHeight={50}
          barCornerRadius={3}
          handleWidth={8}
          fontFamily="Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
          fontSize="14"
          barFill={60}
          arrowColor="#999"
          arrowIndent={20}
          todayColor="#ff6b6b"
          TooltipContent={({ task, fontSize, fontFamily }) => (
            <Box p="sm" bg="white" style={{ border: '1px solid #ccc', borderRadius: '4px', fontSize, fontFamily }}>
              <Text fw={500}>{task.name}</Text>
              <Text size="sm">Start: {task.start.toLocaleDateString()}</Text>
              <Text size="sm">End: {task.end.toLocaleDateString()}</Text>
              <Text size="sm">Progress: {task.progress}%</Text>
              {task.type === 'task' && (
                <>
                  <Text size="sm">Department: {movieProjects.find(p => p.id === task.project)?.tasks.find(t => t.id === task.id)?.department}</Text>
                  <Text size="sm">Assignee: {movieProjects.find(p => p.id === task.project)?.tasks.find(t => t.id === task.id)?.assignee}</Text>
                  <Text size="sm">Priority: {movieProjects.find(p => p.id === task.project)?.tasks.find(t => t.id === task.id)?.priority}</Text>
                </>
              )}
            </Box>
          )}
        />
      </Box>

      {/* Project Summary Cards */}
      <Stack gap="md" mt="xl">
        <Title order={4}>Project Summary</Title>
        <Group gap="md">
          {movieProjects.map(project => (
            <Card key={project.id} padding="md" withBorder style={{ minWidth: '300px' }}>
              <Stack gap="xs">
                <Group justify="space-between">
                  <Badge color={project.type === 'Feature Film' ? 'blue' : project.type === 'Documentary Series' ? 'green' : 'orange'}>
                    {project.type}
                  </Badge>
                  <Badge color="gray">{project.progress}%</Badge>
                </Group>
                <Text fw={600}>{project.name}</Text>
                <Text size="sm" c="dimmed">Director: {project.director}</Text>
                <Text size="sm" c="dimmed">Producer: {project.producer}</Text>
                <Text size="sm" c="dimmed">Budget: {project.budget}</Text>
                <Text size="sm">
                  {project.startDate.toLocaleDateString()} - {project.endDate.toLocaleDateString()}
                </Text>
              </Stack>
            </Card>
          ))}
        </Group>
      </Stack>
    </Box>
  );
}

export default function Calendar() {
  const [activeView, setActiveView] = useState('calendar');

  return (
    <Container size="xl" py="md">
      <Group justify="space-between" mb="xl">
        <Box>
          <Title order={1}>Movie Production Calendar</Title>
          <Text size="sm" c="dimmed">Manage your film projects, schedules, and production timelines</Text>
        </Box>
        <SegmentedControl
          value={activeView}
          onChange={setActiveView}
          data={[
            { label: '📅 Calendar View', value: 'calendar' },
            { label: '📊 Gantt Chart', value: 'gantt' },
          ]}
        />
      </Group>

      {/* Quick Stats */}
      <Group mb="xl" gap="md">
        <Card padding="sm" withBorder style={{ minWidth: '150px' }}>
          <Text size="sm" c="dimmed">Active Projects</Text>
          <Text fw={700} size="xl">{movieProjects.length}</Text>
        </Card>
        <Card padding="sm" withBorder style={{ minWidth: '150px' }}>
          <Text size="sm" c="dimmed">Total Tasks</Text>
          <Text fw={700} size="xl">{movieProjects.reduce((acc, p) => acc + p.tasks.length, 0)}</Text>
        </Card>
        <Card padding="sm" withBorder style={{ minWidth: '150px' }}>
          <Text size="sm" c="dimmed">Completed</Text>
          <Text fw={700} size="xl" c="green">
            {movieProjects.reduce((acc, p) => acc + p.tasks.filter(t => t.status === 'completed').length, 0)}
          </Text>
        </Card>
        <Card padding="sm" withBorder style={{ minWidth: '150px' }}>
          <Text size="sm" c="dimmed">In Progress</Text>
          <Text fw={700} size="xl" c="blue">
            {movieProjects.reduce((acc, p) => acc + p.tasks.filter(t => t.status === 'ongoing').length, 0)}
          </Text>
        </Card>
      </Group>

      {activeView === 'calendar' ? <CalendarView /> : <GanttView />}
    </Container>
  );
}
