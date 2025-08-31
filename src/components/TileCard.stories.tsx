import type { Meta, StoryObj } from '@storybook/react';
import { TileCard } from './TileCard';
import { DashboardProvider } from './DashboardContext';

const meta: Meta<typeof TileCard> = {
  title: 'Components/TileCard',
  component: TileCard,
  parameters: { layout: 'centered' }
};

export default meta;
type Story = StoryObj<typeof TileCard>;

export const Default: Story = {
  decorators: [
    (Story) => (
      <DashboardProvider>
        <div style={{ width: 360 }}>
          <Story />
        </div>
      </DashboardProvider>
    )
  ],
  args: {
    groupId: 'g1',
    tile: {
      id: 't1',
      title: 'OpenAI',
      url: 'https://openai.com',
      icon: '✨',
      favorite: false,
      tags: ['ai','docs']
    } as any
  }
};

