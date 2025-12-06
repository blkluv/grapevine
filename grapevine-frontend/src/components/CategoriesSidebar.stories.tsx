import type { Story } from '@ladle/react';
import { CategoriesSidebarView } from './CategoriesSidebar';
import { BrowserRouter } from 'react-router-dom';

const mockCategories = [
  { id: '1', name: 'food' },
  { id: '2', name: 'healxyz' },
  { id: '3', name: 'musik' },
  { id: '4', name: 'sex' },
  { id: '5', name: 'magic' },
  { id: '6', name: 'reviews' },
  { id: '7', name: 'truth' },
  { id: '8', name: 'money' },
  { id: '9', name: 'relationships' },
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