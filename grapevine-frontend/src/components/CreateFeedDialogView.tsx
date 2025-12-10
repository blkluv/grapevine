import React from 'react';
import { Button, OriginalDialog } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { CreateFeedFormInput } from '@/hooks/useCreateFeed';

// Neobrutalism styles
const styles = {
  form: 'bg-white',
  warning: 'bg-[#ffff00] border-4 border-black p-2 sm:p-3',
  warningText: 'font-mono font-black uppercase text-xs text-black',
  error: 'bg-white border-4 border-black p-2 sm:p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
  errorText: 'font-mono font-bold text-sm text-black leading-relaxed',
  label: 'block font-mono text-xs font-black uppercase mb-1',
  required: 'text-black',
  input: 'w-full border-4 border-black bg-white p-2 font-mono text-sm focus:outline-none focus:shadow-[inset_2px_2px_0px_0px_rgba(0,0,0,0.2)]',
  textarea: 'w-full border-4 border-black bg-white p-2 font-mono text-sm focus:outline-none focus:shadow-[inset_2px_2px_0px_0px_rgba(0,0,0,0.2)] resize-none',
  select: 'w-full border-4 border-black bg-white p-2 font-mono text-sm font-bold uppercase focus:outline-none',
  uploadArea: 'block w-full border-4 border-dashed border-black bg-white p-3 sm:p-6 text-center cursor-pointer hover:bg-gray-100 transition-colors',
  uploadText: 'font-mono font-black uppercase text-xs',
  uploadSubtext: 'font-mono text-[10px] text-black/60',
  imagePreview: 'relative border-4 border-black p-1 bg-accent-orange',
  tag: 'inline-flex items-center gap-1 bg-accent-aqua border-4 border-black px-2 py-0.5 font-mono text-xs font-black uppercase',
  tagRemove: 'text-black hover:bg-black hover:text-white font-black text-sm leading-none transition-colors px-1',
  loading: 'bg-accent-aqua border-4 border-black p-3 flex justify-center items-center',
  loadingText: 'font-mono font-black uppercase text-xs text-center text-black',
  footer: 'flex gap-2 sm:gap-4 p-2 sm:p-4 border-t-4 border-black bg-white',
};

interface CreateFeedDialogViewProps {
  isOpen: boolean;
  onClose: () => void;
  formData: CreateFeedFormInput;
  onFormDataChange: (data: CreateFeedFormInput) => void;
  tagInput: string;
  onTagInputChange: (value: string) => void;
  error: string | null;
  imageFile: File | null;
  imagePreview: string | null;
  isUploadingImage: boolean;
  isConnected: boolean;
  isPending: boolean;
  categories: Array<{ id: string; name: string }>;
  categoriesLoading: boolean;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function CreateFeedDialogView({
  isOpen,
  onClose,
  formData,
  onFormDataChange,
  tagInput,
  onTagInputChange,
  error,
  imageFile: _imageFile,
  imagePreview,
  isUploadingImage,
  isConnected,
  isPending,
  categories,
  categoriesLoading,
  onImageChange,
  onRemoveImage,
  onSubmit,
  onAddTag,
  onRemoveTag,
  onKeyDown,
}: CreateFeedDialogViewProps) {
  return (
    <OriginalDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Feed"
      disabled={isPending}
      maxWidth="xl"
    >
      <form onSubmit={onSubmit} className={cn('overflow-y-auto flex-1', styles.form)}>
        <div className="p-2 sm:p-4 space-y-3 sm:space-y-4">
          {/* Wallet Connection Warning */}
          {!isConnected && (
            <div className={styles.warning}>
              <p className={styles.warningText}>
                Please connect your wallet to create a feed
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className={styles.error}>
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">⚠️</span>
                <p className={styles.errorText}>{error}</p>
              </div>
            </div>
          )}

          {/* Feed Name */}
          <div>
            <label className={styles.label}>
              Feed Name <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
              className={styles.input}
              placeholder="e.g., BTC/USD Price Feed"
              maxLength={255}
              required
              disabled={isPending}
            />
          </div>

          {/* Description */}
          <div>
            <label className={styles.label}>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => onFormDataChange({ ...formData, description: e.target.value })}
              className={styles.textarea}
              placeholder="Describe your feed..."
              rows={3}
              disabled={isPending}
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className={styles.label}>Feed Image (Optional)</label>
            {!imagePreview ? (
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={onImageChange}
                  className="hidden"
                  id="feed-image-upload"
                  disabled={isPending || isUploadingImage}
                />
                <label htmlFor="feed-image-upload" className={styles.uploadArea}>
                  <div className="space-y-1">
                    <div className="text-2xl">📷</div>
                    <div className={styles.uploadText}>Click to upload image</div>
                    <div className={styles.uploadSubtext}>PNG, JPG, GIF up to 10MB</div>
                  </div>
                </label>
              </div>
            ) : (
              <div className={styles.imagePreview}>
                <div className="w-full max-h-[300px] flex items-center justify-center">
                  <img
                    src={imagePreview}
                    alt="Feed preview"
                    className="max-h-[300px] max-w-full object-contain"
                  />
                </div>
                <div className="absolute top-2 right-2 flex gap-2">
                  <label htmlFor="feed-image-replace" className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onImageChange}
                      className="hidden"
                      id="feed-image-replace"
                      disabled={isPending || isUploadingImage}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={isPending || isUploadingImage}
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById('feed-image-replace')?.click();
                      }}
                    >
                      Replace
                    </Button>
                  </label>
                  <Button
                    type="button"
                    onClick={onRemoveImage}
                    variant="danger"
                    size="sm"
                    disabled={isPending || isUploadingImage}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Category */}
          <div>
            <label className={styles.label}>Category (Optional)</label>
            {categoriesLoading ? (
              <div className={cn(styles.input, 'text-center')}>
                <span className={styles.uploadText}>Loading categories...</span>
              </div>
            ) : (
              <select
                value={formData.category_id}
                onChange={(e) => onFormDataChange({ ...formData, category_id: e.target.value })}
                className={styles.select}
                disabled={isPending}
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className={styles.label}>Tags (Optional)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => onTagInputChange(e.target.value)}
                onKeyDown={onKeyDown}
                className={styles.input}
                placeholder="Add tags..."
                disabled={isPending}
              />
              <Button
                type="button"
                onClick={onAddTag}
                variant="secondary"
                size="sm"
                disabled={isPending || !tagInput.trim()}
              >
                Add
              </Button>
            </div>
            {formData.tags && formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag) => (
                  <span key={tag} className={styles.tag}>
                    {tag}
                    <button
                      type="button"
                      onClick={() => onRemoveTag(tag)}
                      className={styles.tagRemove}
                      disabled={isPending}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Loading State */}
          {(isPending || isUploadingImage) && (
            <div className={styles.loading}>
              {isUploadingImage ? (
                <div className="w-6 h-6 border-4 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <p className={styles.loadingText}>
                  {isPending && !error
                    ? 'Please sign the message in your wallet...'
                    : 'Creating feed...'}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className={styles.footer}>
          <Button
            type="button"
            onClick={onClose}
            disabled={isPending}
            variant="secondary"
            size="lg"
            fullWidth
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending || isUploadingImage || !isConnected}
            variant="primary"
            size="lg"
            fullWidth
          >
            {isUploadingImage ? 'Processing...' : isPending ? 'Creating...' : 'Create Feed'}
          </Button>
        </div>
      </form>
    </OriginalDialog>
  );
}
