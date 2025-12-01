import React from 'react';
import { Button, OriginalDialog, Loader } from '@/components/ui';
import { cn } from '@/lib/utils';

// Neobrutalism styles
const styles = {
  form: 'bg-white',
  label: 'block font-mono font-black uppercase text-xs mb-2',
  fileUploadArea: 'border-4 border-dashed border-black p-4 sm:p-8 text-center transition-colors',
  fileUploadAreaActive: 'border-[#00f0ff] bg-[#00f0ff]/10',
  fileInfo: 'font-mono text-sm text-black/60 mb-4',
  input: 'w-full px-2 sm:px-4 py-2 border-4 border-black bg-white font-mono text-sm focus:outline-none focus:shadow-[inset_2px_2px_0px_0px_rgba(0,0,0,0.2)]',
  textarea: 'w-full px-2 sm:px-4 py-2 border-4 border-black bg-white font-mono text-sm focus:outline-none focus:shadow-[inset_2px_2px_0px_0px_rgba(0,0,0,0.2)] min-h-[100px]',
  tag: 'px-2 sm:px-3 py-1 bg-[#00f0ff] border-4 border-black font-mono font-bold flex items-center gap-2 text-xs sm:text-sm',
  tagRemove: 'text-lg leading-none hover:bg-black hover:text-white transition-colors px-1',
  checkbox: 'w-5 h-5 border-4 border-black',
  checkboxLabel: 'flex items-center gap-2 cursor-pointer',
  checkboxText: 'font-mono font-black uppercase text-sm',
  priceLabel: 'block font-mono font-black uppercase text-xs mb-2',
  required: 'text-black',
  priceInput: 'flex-1 px-2 sm:px-4 py-2 border-4 border-black bg-white font-mono text-sm focus:outline-none focus:shadow-[inset_2px_2px_0px_0px_rgba(0,0,0,0.2)]',
  priceInfo: 'mt-2 font-mono text-sm text-black/60',
  error: 'p-2 sm:p-4 border-4 border-black bg-white font-mono font-bold text-black',
  uploadIndicator: 'p-2 sm:p-4 border-4 border-black bg-[#00f0ff]',
  uploadIndicatorText: 'font-mono font-black uppercase text-sm',
  uploadIndicatorSubtext: 'font-mono text-xs text-black/60 mt-1',
  footer: 'flex gap-2 sm:gap-4 p-3 sm:p-6 border-t-4 border-black bg-white',
};

interface UploadEntryModalViewProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFile: File | null;
  title: string;
  onTitleChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  tagInput: string;
  onTagInputChange: (value: string) => void;
  tags: string[];
  isFree: boolean;
  onIsFreeChange: (value: boolean) => void;
  priceUsd: string;
  onPriceUsdChange: (value: string) => void;
  error: string | null;
  isUploading: boolean;
  dragActive: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelect: (file: File) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrag: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  usdToGwei: (usd: string) => string;
}

export function UploadEntryModalView({
  isOpen,
  onClose,
  selectedFile,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  tagInput,
  onTagInputChange,
  tags,
  isFree,
  onIsFreeChange,
  priceUsd,
  onPriceUsdChange,
  error,
  isUploading,
  dragActive,
  fileInputRef,
  onFileChange,
  onDrag,
  onDrop,
  onAddTag,
  onRemoveTag,
  onSubmit,
  usdToGwei,
}: UploadEntryModalViewProps) {
  return (
    <OriginalDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Entry"
      disabled={isUploading}
      maxWidth="2xl"
    >
      <form onSubmit={onSubmit} className={cn('overflow-y-auto flex-1', styles.form)}>
        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
          {/* File Upload Area */}
          <div>
            <label className={styles.label}>File (Max 50MB)</label>
            <div
              className={cn(
                styles.fileUploadArea,
                dragActive && styles.fileUploadAreaActive
              )}
              onDragEnter={onDrag}
              onDragLeave={onDrag}
              onDragOver={onDrag}
              onDrop={onDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={onFileChange}
                className="hidden"
                id="file-upload"
              />
              {selectedFile ? (
                <div>
                  <p className="font-mono font-bold mb-2">{selectedFile.name}</p>
                  <p className={styles.fileInfo}>
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    variant="secondary"
                    size="md"
                  >
                    Change File
                  </Button>
                </div>
              ) : (
                <div>
                  <p className="font-mono mb-4">Drag and drop a file here, or click to select</p>
                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    variant="primary"
                    size="lg"
                  >
                    Select File
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="title" className={styles.label}>
              Title (Optional)
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              className={styles.input}
              placeholder="Enter entry title"
              maxLength={500}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className={styles.label}>
              Description (Optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              className={styles.textarea}
              placeholder="Describe your entry"
            />
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="tags" className={styles.label}>
              Tags (Optional)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                id="tags"
                value={tagInput}
                onChange={(e) => onTagInputChange(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onAddTag();
                  }
                }}
                className={styles.input}
                placeholder="Add a tag"
              />
              <Button
                type="button"
                onClick={onAddTag}
                variant="secondary"
                size="md"
              >
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span key={tag} className={styles.tag}>
                    {tag}
                    <button
                      type="button"
                      onClick={() => onRemoveTag(tag)}
                      className={styles.tagRemove}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Is Free Checkbox */}
          <div>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={isFree}
                onChange={(e) => onIsFreeChange(e.target.checked)}
                className={styles.checkbox}
              />
              <span className={styles.checkboxText}>Make this entry free</span>
            </label>
          </div>

          {/* Price Input (only shown if not free) */}
          {!isFree && (
            <div>
              <label htmlFor="price" className={styles.priceLabel}>
                Price (USD) <span className={styles.required}>*</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xl font-bold">$</span>
                <input
                  type="number"
                  id="price"
                  value={priceUsd}
                  onChange={(e) => onPriceUsdChange(e.target.value)}
                  className={styles.priceInput}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required={!isFree}
                />
              </div>
              {priceUsd && parseFloat(priceUsd) >= 0 && (
                <p className={styles.priceInfo}>
                  = {usdToGwei(priceUsd)} gwei (USDC)
                </p>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          {/* Upload Indicator */}
          {isUploading && (
            <div className={styles.uploadIndicator}>
              <div className="flex items-center gap-3">
                <Loader size="sm" />
                <div className="flex-1">
                  <p className={styles.uploadIndicatorText}>Uploading...</p>
                  {selectedFile && (
                    <p className={styles.uploadIndicatorSubtext}>
                      {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className={styles.footer}>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isUploading}
            fullWidth
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isUploading || !selectedFile}
            fullWidth
          >
            {isUploading ? 'Uploading...' : 'Upload Entry'}
          </Button>
        </div>
      </form>
    </OriginalDialog>
  );
}
