import { useState, useEffect } from 'react';
import { useUpdateFeed, type UpdateFeedFormInput } from '@/hooks/useUpdateFeed';
import { useWallet } from '@/context/WalletContext';
import { Button, OriginalDialog } from '@/components/ui';
import { fileToBase64 } from '@/lib/utils';
import type { Feed } from '@pinata/grapevine-sdk/dist/types';

interface EditFeedDialogProps {
  isOpen: boolean;
  onClose: () => void;
  feed: Feed | null;
}

const PINATA_GATEWAY = import.meta.env.VITE_PINATA_GATEWAY

export function EditFeedDialog({ isOpen, onClose, feed }: EditFeedDialogProps) {
  const { isConnected } = useWallet();
  const updateFeed = useUpdateFeed();

  const [formData, setFormData] = useState<UpdateFeedFormInput>({
    name: '',
    description: '',
    tags: [],
  });
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Load feed data when dialog opens
  useEffect(() => {
    if (isOpen && feed) {
      setFormData({
        name: feed.name,
        description: feed.description || '',
        tags: feed.tags || [],
      });
      setTagInput('');
      setError(null);
      setImageFile(null);

      // Construct image URL from image_cid
      const imageUrl = feed.image_cid
        ? `https://${PINATA_GATEWAY}/ipfs/${feed.image_cid}`
        : null;
      setImagePreview(imageUrl);

      setIsUploadingImage(false);
    }
  }, [isOpen, feed]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('Image size must be less than 10MB');
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
      setError('Please connect your wallet first');
      return;
    }

    if (!feed) {
      setError('No feed to update');
      return;
    }

    if (!formData.name?.trim()) {
      setError('Feed name is required');
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
          setError('Failed to process image. Please try again.');
          return;
        }
        setIsUploadingImage(false);
      }

      // Update feed with base64 image in image_url field
      const feedData = {
        ...formData,
        ...(imageBase64 && { image_url: imageBase64 }),
      };

      await updateFeed.mutateAsync({ feedId: feed.id, data: feedData });
      onClose();
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('rejected')) {
          setError('Signature request was rejected');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to update feed');
      }
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
      tags: formData.tags?.filter((tag: string) => tag !== tagToRemove) || [],
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  if (!feed) return null;

  return (
    <OriginalDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Feed"
      disabled={updateFeed.isPending}
      maxWidth="xl"
    >
      {/* Form */}
      <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 bg-[#c0c0c0]">
        <div className="p-4 space-y-4">
          {/* Wallet Connection Warning */}
          {!isConnected && (
            <div className="bg-win95-btnWarning border-2 border-win95-btnWarningDark p-3">
              <p className="font-bold uppercase text-xs">
                Please connect your wallet to edit this feed
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-win95-btnDanger border-2 border-black p-3">
              <p className="font-bold uppercase text-xs text-white">{error}</p>
            </div>
          )}

          {/* Feed Name */}
          <div>
            <label className="block text-xs font-bold uppercase mb-1">
              Feed Name <span className="text-win95-btnDanger">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border-2 border-win95-borderDark bg-white p-2 text-sm focus:outline-none focus:border-win95-btnPrimary"
              placeholder="e.g., BTC/USD Price Feed"
              maxLength={255}
              required
              disabled={updateFeed.isPending}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border-2 border-win95-borderDark bg-white p-2 text-sm focus:outline-none focus:border-win95-btnPrimary resize-none"
              placeholder="Describe your feed..."
              rows={3}
              disabled={updateFeed.isPending}
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Feed Image (Optional)</label>
            {!imagePreview ? (
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="feed-image-upload"
                  disabled={updateFeed.isPending || isUploadingImage}
                />
                <label
                  htmlFor="feed-image-upload"
                  className="block w-full border-2 border-dashed border-win95-borderDark bg-white p-6 text-center cursor-pointer hover:bg-win95-paper transition-colors"
                >
                  <div className="space-y-1">
                    <div className="text-2xl">📷</div>
                    <div className="font-bold uppercase text-xs">
                      Click to upload image
                    </div>
                    <div className="text-[10px] text-foreground/60">
                      PNG, JPG, GIF up to 10MB
                    </div>
                  </div>
                </label>
              </div>
            ) : (
              <div className="relative border-2 border-black p-1 bg-white">
                <img
                  src={imagePreview}
                  alt="Feed preview"
                  className="w-full h-32 object-cover"
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <label
                    htmlFor="feed-image-replace-edit"
                    className="cursor-pointer"
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="feed-image-replace-edit"
                      disabled={updateFeed.isPending || isUploadingImage}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={updateFeed.isPending || isUploadingImage}
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById('feed-image-replace-edit')?.click();
                      }}
                    >
                      Replace
                    </Button>
                  </label>
                  <Button
                    type="button"
                    onClick={handleRemoveImage}
                    variant="danger"
                    size="sm"
                    disabled={updateFeed.isPending || isUploadingImage}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Tags (Optional)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 border-2 border-win95-borderDark bg-white p-2 text-sm focus:outline-none focus:border-win95-btnPrimary"
                placeholder="Add tags..."
                disabled={updateFeed.isPending}
              />
              <Button
                type="button"
                onClick={handleAddTag}
                variant="secondary"
                size="sm"
                disabled={updateFeed.isPending || !tagInput.trim()}
              >
                Add
              </Button>
            </div>
            {formData.tags && formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 bg-win95-paper border-2 border-black px-2 py-0.5 text-xs font-bold uppercase"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-win95-btnDanger hover:text-win95-btnDangerDark font-black text-sm leading-none"
                      disabled={updateFeed.isPending}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Loading State */}
          {(updateFeed.isPending || isUploadingImage) && (
            <div className="bg-win95-btnPrimary border-2 border-black p-3 flex justify-center items-center">
              {isUploadingImage ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <p className="font-bold uppercase text-xs text-center text-white">
                  {updateFeed.isPending && !error
                    ? 'Please sign the message in your wallet...'
                    : 'Updating feed...'}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex gap-4 p-4 border-t-2 border-[#808080] bg-[#c0c0c0]">
          <button
            type="button"
            onClick={onClose}
            disabled={updateFeed.isPending}
            className="flex-1 px-6 py-3 border-4 border-black bg-white hover:bg-gray-100 font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[4px_4px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={updateFeed.isPending || isUploadingImage || !isConnected}
            className="flex-1 px-6 py-3 border-4 border-t-[var(--btn-primary-light)] border-l-[var(--btn-primary-light)] border-b-[var(--btn-primary-dark)] border-r-[var(--btn-primary-dark)] bg-[var(--btn-primary)] hover:bg-[var(--btn-primary-light)] text-white font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[4px_4px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
          >
            {isUploadingImage ? 'Processing...' : updateFeed.isPending ? 'Updating...' : 'Update Feed'}
          </button>
        </div>
      </form>
    </OriginalDialog>
  );
}
