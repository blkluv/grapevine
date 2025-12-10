import { useState, useRef } from 'react';
import type { Story } from '@ladle/react';
import { UploadEntryModalView } from './UploadEntryModalView';

export const Default: Story = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isFree, setIsFree] = useState(false);
  const [priceUsd, setPriceUsd] = useState('');
  const [hasExpiration, setHasExpiration] = useState(false);
  const [expirationDate, setExpirationDate] = useState('');
  const [expirationTime, setExpirationTime] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const usdToGwei = (usd: string): string => {
    const usdFloat = parseFloat(usd);
    if (isNaN(usdFloat) || usdFloat < 0) return '0';
    return Math.floor(usdFloat * 1_000_000).toString();
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Upload submitted:', {
      selectedFile,
      title,
      description,
      tags,
      isFree,
      priceUsd,
    });
    setIsOpen(false);
  };

  return (
    <div className="min-h-screen p-8">
      <h2 className="text-2xl font-bold mb-4">Upload Entry Modal View</h2>
      <p className="text-gray-600 mb-6">
        Switch themes using the dropdown in the sidebar to see different styles.
      </p>

      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Open Modal
      </button>

      <UploadEntryModalView
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        selectedFile={selectedFile}
        title={title}
        onTitleChange={setTitle}
        description={description}
        onDescriptionChange={setDescription}
        tagInput={tagInput}
        onTagInputChange={setTagInput}
        tags={tags}
        isFree={isFree}
        onIsFreeChange={setIsFree}
        priceUsd={priceUsd}
        onPriceUsdChange={setPriceUsd}
        hasExpiration={hasExpiration}
        onHasExpirationChange={setHasExpiration}
        expirationDate={expirationDate}
        onExpirationDateChange={setExpirationDate}
        expirationTime={expirationTime}
        onExpirationTimeChange={setExpirationTime}
        error={null}
        isUploading={false}
        dragActive={dragActive}
        fileInputRef={fileInputRef}
        onFileSelect={handleFileSelect}
        onFileChange={handleFileChange}
        onDrag={handleDrag}
        onDrop={handleDrop}
        onAddTag={handleAddTag}
        onRemoveTag={handleRemoveTag}
        onSubmit={handleSubmit}
        usdToGwei={usdToGwei}
      />
    </div>
  );
};

Default.storyName = 'Upload Entry Modal View';
