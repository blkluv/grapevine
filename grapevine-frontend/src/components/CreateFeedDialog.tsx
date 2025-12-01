import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCreateFeed, type CreateFeedFormInput } from '@/hooks/useCreateFeed';
import { useCategories } from '@/hooks/useCategories';
import { useWallet } from '@/context/WalletContext';
import { useToast } from '@/context/ToastContext';
import { fileToBase64 } from '@/lib/utils';
import { CreateFeedDialogView } from './CreateFeedDialogView';

interface CreateFeedDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateFeedDialog({ isOpen, onClose }: CreateFeedDialogProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isConnected } = useWallet();
  const toast = useToast();
  const createFeed = useCreateFeed();
  const { data: categoriesResponse, isLoading: categoriesLoading } = useCategories();

  const [formData, setFormData] = useState<CreateFeedFormInput>({
    name: '',
    description: '',
    category_id: '',
    tags: [],
  });
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        description: '',
        category_id: '',
        tags: [],
      });
      setTagInput('');
      setError(null);
      setImageFile(null);
      setImagePreview(null);
      setIsUploadingImage(false);
    }
  }, [isOpen]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        const errorMsg = 'Please select an image file';
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        const errorMsg = 'Image size must be less than 10MB';
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      setImageFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const convertImageToBase64 = async (file: File): Promise<string> => {
    try {
      const base64 = await fileToBase64(file);
      // Return data URL format (backend will handle it)
      return `data:${file.type};base64,${base64}`;
    } catch (error) {
      console.error('Error converting image to base64:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isConnected) {
      const errorMsg = 'Please connect your wallet first';
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    if (!formData.name.trim()) {
      const errorMsg = 'Feed name is required';
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    try {
      // Convert image to base64 if selected
      let imageBase64: string | undefined;
      if (imageFile) {
        setIsUploadingImage(true);
        try {
          imageBase64 = await convertImageToBase64(imageFile);
          console.log('Image converted to base64 successfully');
        } catch (convertError) {
          console.error('Image conversion error:', convertError);
          setIsUploadingImage(false);
          const errorMsg = 'Failed to process image. Please try again.';
          setError(errorMsg);
          toast.error(errorMsg);
          return;
        }
        setIsUploadingImage(false);
      }

      // Create feed with base64 image in image_url field
      const feedData = {
        ...formData,
        ...(imageBase64 && { image_url: imageBase64 }),
      };

      const createdFeed = await createFeed.mutateAsync(feedData);
      toast.success('Feed created successfully!');
      onClose();

      // Navigate to the feed detail page (entries page)
      // Encode the current full path (pathname + search) so back button returns to exact location
      if (createdFeed?.id) {
        const fullPath = location.pathname + location.search;
        const encodedFrom = encodeURIComponent(fullPath);
        navigate(`/feeds/${createdFeed.id}/entries?from=${encodedFrom}`);
      }
    } catch (err) {
      console.log('🔴 [CreateFeed] Error:', err);

      let errorMsg = 'Failed to create feed';

      // Check for x402 payment errors in the response property
      const responseStr = (err as any)?.response;
      if (responseStr && typeof responseStr === 'string') {
        try {
          const responseData = JSON.parse(responseStr);
          if (responseData.error) {
            // Map x402 error codes to user-friendly messages
            const errorMessages: Record<string, string> = {
              insufficient_funds: 'Insufficient USDC balance to complete this payment',
              payment_failed: 'Payment failed. Please try again.',
              invalid_payment: 'Invalid payment. Please try again.',
              expired: 'Payment request expired. Please try again.',
            };
            errorMsg = errorMessages[responseData.error] || `Payment error: ${responseData.error}`;
          }
        } catch {
          // Response is not valid JSON, fall through to default handling
        }
      }

      // Fall back to standard error handling if no x402 error was found
      if (errorMsg === 'Failed to create feed' && err instanceof Error) {
        if (err.message.includes('rejected')) {
          errorMsg = 'Signature request was rejected';
        } else if (!err.message.includes('402')) {
          // Don't show generic 402 message, we want the specific error above
          errorMsg = err.message;
        }
      }

      setError(errorMsg);
      toast.error(errorMsg);
    }
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
    <CreateFeedDialogView
      isOpen={isOpen}
      onClose={onClose}
      formData={formData}
      onFormDataChange={setFormData}
      tagInput={tagInput}
      onTagInputChange={setTagInput}
      error={error}
      imageFile={imageFile}
      imagePreview={imagePreview}
      isUploadingImage={isUploadingImage}
      isConnected={isConnected}
      isPending={createFeed.isPending}
      categories={categoriesResponse || []}
      categoriesLoading={categoriesLoading}
      onImageChange={handleImageChange}
      onRemoveImage={handleRemoveImage}
      onSubmit={handleSubmit}
      onAddTag={handleAddTag}
      onRemoveTag={handleRemoveTag}
      onKeyDown={handleKeyDown}
    />
  );
}
