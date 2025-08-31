import type { Meta, StoryObj } from '@storybook/react';
import { Toolbar } from './Toolbar';
import { DashboardProvider } from './DashboardContext';
import { Providers } from './Providers';

const meta: Meta<typeof Toolbar> = {
  title: 'Components/Toolbar',
  component: Toolbar,
  parameters: {
    a11y: { disable: false },
    layout: 'fullscreen'
  },
  decorators: [
    (Story) => (
      <Providers>
        <DashboardProvider>
          <div style={{ padding: 16 }}>
            <Story />
          </div>
        </DashboardProvider>
      </Providers>
    )
  ]
};

export default meta;
type Story = StoryObj<typeof Toolbar>;

export const Default: Story = {};

