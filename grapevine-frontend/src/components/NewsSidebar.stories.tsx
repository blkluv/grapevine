import type { Story } from '@ladle/react';
import { NewsSidebar } from './NewsSidebar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a query client for the story
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: Infinity,
    },
  },
});

export const Default: Story = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="p-8">
        <h2 className="text-2xl font-bold mb-4">News Sidebar</h2>
        <p className="text-gray-600 mb-6">
          Switch themes using the dropdown in the sidebar to see different styles.
          Try the <strong>neobrutalist</strong> theme for bold, high-contrast design with 2px borders!
        </p>

        <div className="flex gap-8 justify-center">
          <NewsSidebar />
        </div>
      </div>
    </QueryClientProvider>
  );
};

Default.storyName = 'News Sidebar';
