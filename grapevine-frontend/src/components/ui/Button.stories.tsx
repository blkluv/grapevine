import type { Story } from '@ladle/react';
import { Button } from './Button';

// All variants grid - the only story needed
export const AllVariants: Story = () => {
  const variants = ['primary', 'secondary', 'success', 'warning', 'danger', 'ghost', 'outline'] as const;
  const sizes = ['sm', 'md', 'lg'] as const;

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Button Variants</h2>
      <p className="text-gray-600 mb-6">
        Switch themes using the sidebar dropdown to see different styles.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left p-2">Variant</th>
              {sizes.map(size => (
                <th key={size} className="text-center p-2 capitalize">{size}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {variants.map(variant => (
              <tr key={variant}>
                <td className="p-2 capitalize font-medium">{variant}</td>
                {sizes.map(size => (
                  <td key={size} className="p-2 text-center">
                    <Button variant={variant} size={size}>
                      Button
                    </Button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

AllVariants.storyName = 'Button';