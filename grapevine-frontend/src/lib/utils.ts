import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// File utilities
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFileSize(file: File): FileValidationResult {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds 50MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`
    };
  }
  return { valid: true };
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

// Wallet address utilities
export function formatWalletAddress(address: string): string {
  if (!address || address.length < 11) {
    return address;
  }
  // Show first 6 characters and last 4 characters with ... in between
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
