export type TimeTableItem = {
  item: string;
  date: Date;
};

export type Location = {
  location_title: string;
  link: string;
  address: string;
  contact_number: string;
};

export type ScheduleItem = {
  time: Date;
  scene: string;
  description: string;
};

export type CallSheet = {
  project_name: string;
  date: Date;
  time: Date;
  time_table: TimeTableItem[];
  description?: string;
  location: Location[];
  schedule: ScheduleItem[];
  crew_ids: string[];
};

// Form types for Mantine form
export type CallSheetFormData = {
  project_name: string;
  date: string;
  time: string;
  time_table: {
    item: string;
    date: string;
  }[];
  description: string;
  location: {
    location_title: string;
    link: string;
    address: string;
    contact_number: string;
  }[];
  schedule: {
    time: string;
    scene: string;
    description: string;
  }[];
  crew_ids: string[];
};

