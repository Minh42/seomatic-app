'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      // Delay hiding to allow exit animation
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isVisible) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: 'text-red-600',
          background: 'bg-red-50',
          border: 'border-red-200',
          confirmButton: 'bg-red-600 hover:bg-red-700 text-white',
        };
      case 'warning':
        return {
          icon: 'text-yellow-600',
          background: 'bg-yellow-50',
          border: 'border-yellow-200',
          confirmButton: 'bg-yellow-600 hover:bg-yellow-700 text-white',
        };
      default:
        return {
          icon: 'text-blue-600',
          background: 'bg-blue-50',
          border: 'border-blue-200',
          confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 transition-opacity duration-200 ${
        isOpen ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onCancel}
    >
      <div
        className={`max-w-md w-full bg-white rounded-lg shadow-xl transform transition-all duration-200 ${
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <div className={`p-6 ${styles.background} ${styles.border} border-b`}>
          <div className="flex items-start space-x-3">
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-full ${styles.background} flex items-center justify-center`}
            >
              <AlertTriangle className={`w-5 h-5 ${styles.icon}`} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900">{title}</h3>
              <p className="mt-1 text-sm text-gray-600">{message}</p>
            </div>
          </div>
        </div>

        <div className="p-6 flex justify-end space-x-3">
          <Button
            onClick={onCancel}
            variant="outline"
            className="text-gray-700 border-gray-300 hover:bg-gray-50"
          >
            {cancelText}
          </Button>
          <Button onClick={onConfirm} className={styles.confirmButton}>
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
