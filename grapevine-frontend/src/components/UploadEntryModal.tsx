import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@/context/WalletContext';
import { useToast } from '@/context/ToastContext';
import { validateFileSize, fileToBase64 } from '@/lib/utils';
import { UploadEntryModalView } from './UploadEntryModalView';
import type { CreateEntryInput } from '@pinata/grapevine-sdk';

interface UploadEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedId?: string;
  onUpload: (data: CreateEntryInput) => Promise<void>;
}

export function UploadEntryModal({ isOpen, onClose, onUpload }: UploadEntryModalProps) {
  const { isConnected } = useWallet();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [metadata, setMetadata] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isFree, setIsFree] = useState(false);
  const [priceUsd, setPriceUsd] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Convert USD to gwei (USDC has 6 decimals)
  const usdToGwei = (usd: string): string => {
    const usdFloat = parseFloat(usd);
    if (isNaN(usdFloat) || usdFloat < 0) return '0';
    return Math.floor(usdFloat * 1_000_000).toString();
  };

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setTitle('');
      setDescription('');
      setMetadata('');
      setTagInput('');
      setTags([]);
      setIsFree(false);
      setPriceUsd('');
      setError(null);
      setIsUploading(false);
    }
  }, [isOpen]);

  const handleFileSelect = (file: File) => {
    setError(null);

    const validation = validateFileSize(file);
    if (!validation.valid) {
      const errorMsg = validation.error || 'Invalid file';
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    console.log('[UploadEntryModal] 🎬 ===== UPLOAD ENTRY STARTED =====');
    console.log('[UploadEntryModal] - isConnected:', isConnected);
    console.log('[UploadEntryModal] - selectedFile:', selectedFile?.name);

    if (!isConnected) {
      console.error('[UploadEntryModal] ❌ Wallet not connected');
      const errorMsg = 'Please connect your wallet first';
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    if (!selectedFile) {
      console.error('[UploadEntryModal] ❌ No file selected');
      const errorMsg = 'Please select a file to upload';
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    try {
      // Convert file to base64
      console.log('[UploadEntryModal] 📄 Converting file to base64...');
      const base64Content = await fileToBase64(selectedFile);
      console.log('[UploadEntryModal] ✅ File converted to base64');

      // Validate price if not free
      if (!isFree && (priceUsd === '' || parseFloat(priceUsd) < 0)) {
        const errorMsg = 'Please enter a valid price in USD for paid entries (0 or greater)';
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      // Determine if entry should be free: either checkbox is checked OR price is 0
      const shouldBeFree = isFree || (!isFree && priceUsd !== '' && parseFloat(priceUsd) === 0);

      const uploadData: CreateEntryInput = {
        content_base64: base64Content,
        mime_type: selectedFile.type || 'application/octet-stream',
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        metadata: metadata.trim() ? JSON.parse(metadata.trim()) : undefined,
        tags: tags.length > 0 ? tags : undefined,
        is_free: shouldBeFree,
        price: !shouldBeFree && priceUsd && parseFloat(priceUsd) > 0 ? {
          amount: usdToGwei(priceUsd),
          currency: 'USDC',
        } : undefined,
      };

      console.log('[UploadEntryModal] 📦 Upload data prepared:', {
        mime_type: uploadData.mime_type,
        title: uploadData.title,
        is_free: uploadData.is_free,
        price: uploadData.price,
        tags: uploadData.tags
      });

      setIsUploading(true);
      console.log('[UploadEntryModal] 🚀 Calling onUpload callback...');
      console.log('[UploadEntryModal] - This will trigger useCreateEntry mutation');
      await onUpload(uploadData);
      console.log('[UploadEntryModal] ✅ Upload completed successfully');
      toast.success('Entry uploaded successfully!');
      onClose();
    } catch (err) {
      console.log('🔴 [UploadEntry] Error:', err);

      let errorMsg = 'Failed to upload entry';

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
      if (errorMsg === 'Failed to upload entry' && err instanceof Error) {
        if (err.message.includes('rejected')) {
          errorMsg = 'Signature request was rejected';
        } else if (!err.message.includes('402')) {
          errorMsg = err.message;
        }
      }

      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <UploadEntryModalView
      isOpen={isOpen}
      onClose={onClose}
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
      error={error}
      isUploading={isUploading}
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
  );
}
