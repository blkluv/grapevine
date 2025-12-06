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
        <h2 className="mb-4 text-2xl font-bold">Categories Sidebar</h2>
        <p className="mb-6 text-gray-600">
          Switch themes using the dropdown in the sidebar to see different styles.
          Try the <strong>neobrutalism</strong> theme for bold, high-contrast design!
        </p>

        <div className="flex gap-8">
          {/* With categories */}
          <div>
            <h3 className="mb-4 text-lg font-semibold">With Categories</h3>
            <CategoriesSidebarView
              categories={mockCategories}
              categoriesLoading={false}
            />
          </div>

          {/* Loading state */}
          <div>
            <h3 className="mb-4 text-lg font-semibold">Loading State</h3>
            <CategoriesSidebarView
              categories={[]}
              categoriesLoading={true}
            />
          </div>

          {/* Empty state */}
          <div>
            <h3 className="mb-4 text-lg font-semibold">Empty State</h3>
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
