import type { Story } from '@ladle/react';
import { HamburgerMenuView } from './HamburgerMenu';
import React, { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';

const mockCategories = [
  { id: '1', name: 'Technology' },
  { id: '2', name: 'Sports' },
  { id: '3', name: 'Entertainment' },
  { id: '4', name: 'Politics' },
  { id: '5', name: 'Science' },
  { id: '6', name: 'Health' },
  { id: '7', name: 'Business' },
  { id: '8', name: 'Travel' },
];

const MockWalletPill = () => {
  const [currentTheme, setCurrentTheme] = React.useState('default');

  React.useEffect(() => {
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme') || 'default';
      setCurrentTheme(theme);
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  const themeKey = currentTheme === 'modern' ? 'modern' : 'default';

  if (themeKey === 'modern') {
    return (
      <div className="px-4 py-2 text-sm text-gray-300 bg-gray-800 border border-gray-700 rounded-lg">
        0x1234...5678
      </div>
    );
  }

  return (
    <div className="bg-white border-4 border-black px-4 py-2 shadow-[2px_2px_0px_0px_#000] font-mono">
      0x1234...5678
    </div>
  );
};

export const Default: Story = () => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <BrowserRouter>
      <div className="p-8">
        <h2 className="mb-4 text-2xl font-bold">Hamburger Menu (Mobile)</h2>
        <p className="mb-6 text-gray-600">
          Switch themes using the dropdown in the sidebar to see different styles.
          The menu is shown open by default in this story for demonstration.
        </p>

        <div className="mb-8">
          <h3 className="mb-2 text-lg font-semibold">Theme Variations:</h3>
          <ul className="pl-6 space-y-2 text-sm text-gray-600 list-disc">
            <li><strong>Default:</strong> 90s Windows style with hard borders, black shadows, and CategoriesSidebar component</li>
            <li><strong>Modern:</strong> Dark theme with subtle borders, smooth transitions, and themed CategoriesSidebar</li>
          </ul>
          <p className="mt-4 text-sm text-gray-600">
            Note: The CategoriesSidebar component inside the hamburger menu automatically adapts to the theme,
            providing consistency across both mobile and desktop views.
          </p>
        </div>

        {/* Interactive Controls */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setIsOpen(true)}
            className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600"
          >
            Open Menu
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 text-white bg-gray-500 rounded hover:bg-gray-600"
          >
            Close Menu
          </button>
        </div>

        <HamburgerMenuView
          isOpen={isOpen}
          onOpen={() => setIsOpen(true)}
          onClose={() => setIsOpen(false)}
          categories={mockCategories}
          categoriesLoading={false}
          walletComponent={<MockWalletPill />}
        />
      </div>
    </BrowserRouter>
  );
};

Default.storyName = 'Hamburger Menu';
