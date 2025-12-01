import type { Story } from '@ladle/react';
import { CategoriesSidebarView } from './CategoriesSidebar';
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

export const Default: Story = () => {
  return (
    <BrowserRouter>
      <div className="p-8">
        <h2 className="text-2xl font-bold mb-4">Categories Sidebar</h2>
        <p className="text-gray-600 mb-6">
          Switch themes using the dropdown in the sidebar to see different styles.
          Try the <strong>neobrutalism</strong> theme for bold, high-contrast design!
        </p>

        <div className="flex gap-8">
          {/* With categories */}
          <div>
            <h3 className="text-lg font-semibold mb-4">With Categories</h3>
            <CategoriesSidebarView
              categories={mockCategories}
              categoriesLoading={false}
            />
          </div>

          {/* Loading state */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Loading State</h3>
            <CategoriesSidebarView
              categories={[]}
              categoriesLoading={true}
            />
          </div>

          {/* Empty state */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Empty State</h3>
            <CategoriesSidebarView
              categories={[]}
              categoriesLoading={false}
            />
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
};

Default.storyName = 'Categories Sidebar';
