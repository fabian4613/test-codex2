import type { Preview } from "@storybook/react";

const preview: Preview = {
  parameters: {
    a11y: {
      // Fail on serious+ a11y issues by default
      manual: false,
    },
    controls: { expanded: true },
    viewport: {
      viewports: {
        mobile: { name: 'Mobile', styles: { width: '375px', height: '812px' } },
        tablet: { name: 'Tablet', styles: { width: '768px', height: '1024px' } },
        desktop: { name: 'Desktop', styles: { width: '1280px', height: '800px' } },
      }
    }
  }
};

export default preview;

