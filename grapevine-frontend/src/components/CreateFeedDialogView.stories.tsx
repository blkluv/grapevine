import { useState } from 'react';
import type { Story } from '@ladle/react';
import { CreateFeedDialogView } from './CreateFeedDialogView';
import type { CreateFeedFormInput } from '@/hooks/useCreateFeed';

export const Default: Story = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<CreateFeedFormInput>({
    name: '',
    description: '',
    category_id: '',
    tags: [],
  });
  const [tagInput, setTagInput] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const mockCategories = [
    { id: '1', name: 'Technology' },
    { id: '2', name: 'Finance' },
    { id: '3', name: 'Sports' },
    { id: '4', name: 'Entertainment' },
  ];

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    setIsOpen(false);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((tag) => tag !== tagToRemove) || [],
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="min-h-screen p-8">
      <h2 className="text-2xl font-bold mb-4">Create Feed Dialog View</h2>
      <p className="text-gray-600 mb-6">
        Switch themes using the dropdown in the sidebar to see different styles.
      </p>

      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Open Dialog
      </button>

      <CreateFeedDialogView
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        formData={formData}
        onFormDataChange={setFormData}
        tagInput={tagInput}
        onTagInputChange={setTagInput}
        error={null}
        imageFile={null}
        imagePreview={imagePreview}
        isUploadingImage={false}
        isConnected={true}
        isPending={false}
        categories={mockCategories}
        categoriesLoading={false}
        onImageChange={handleImageChange}
        onRemoveImage={handleRemoveImage}
        onSubmit={handleSubmit}
        onAddTag={handleAddTag}
        onRemoveTag={handleRemoveTag}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
};

Default.storyName = 'Create Feed Dialog View';
