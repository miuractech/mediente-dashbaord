import type{ MantineThemeOverride } from '@mantine/core';
export const theme: MantineThemeOverride = {
  fontFamily: "'Inter', sans-serif",
  fontSizes: { xs: '12px', sm: '14px', md: '16px', lg: '18px', xl: '20px' },
  colors:{
    primary: [
      '#f3f2fe',
      '#e6e3fd',
      '#d3cdfb',
      '#bfb6f9',
      '#ab9ff7',
      '#9789f5',
      '#7A6EE4',
      '#6b5cdb',
      '#5c4ad2',
      '#4d38c9'
    ],
  },
  primaryColor: 'primary',
  primaryShade: 6,
  defaultRadius: 'lg',
};