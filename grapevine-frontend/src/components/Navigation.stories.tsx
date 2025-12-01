import type { Story } from '@ladle/react';
import { Navigation } from './Navigation';
import { BrowserRouter } from 'react-router-dom';

export const Default: Story = () => {
  return (
    <BrowserRouter>
      <div className="p-8">
        <h2 className="text-2xl font-bold mb-4">Navigation</h2>
        <p className="text-gray-600 mb-8">
          Switch themes using the dropdown in the sidebar to see different styles.
          The default theme shows a 90s Windows style while modern shows a dark, contemporary design.
        </p>

        {/* Navigation Component */}
        <div className="mb-12">
          <Navigation />
        </div>

        {/* Description */}
        <div className="mt-8 space-y-4 text-sm text-gray-600">
          <h3 className="text-lg font-semibold text-gray-800">Theme Variations:</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Default:</strong> Yellow background with beveled borders and hard shadows, classic 90s Windows aesthetic</li>
            <li><strong>Modern:</strong> Dark translucent background with subtle borders and smooth transitions, contemporary 2025 design</li>
          </ul>
          <p className="mt-4">
            The buttons inside the navigation automatically adapt to the selected theme,
            maintaining consistency across all interactive elements.
          </p>
        </div>
      </div>
    </BrowserRouter>
  );
};

Default.storyName = 'Navigation';
