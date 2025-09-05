import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { AuthErrorHandler, type AuthError } from '@/lib/auth/error-handler';

interface UseAuthFormOptions<T> {
  defaultValues: T;
  onSubmit: (values: T) => Promise<void>;
}

export function useAuthForm<T>({
  defaultValues,
  onSubmit,
}: UseAuthFormOptions<T>) {
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      setIsLoading(true);
      try {
        await onSubmit(value);
      } finally {
        setIsLoading(false);
      }
    },
  });

  const handleAuthError = (error: AuthError) => {
    AuthErrorHandler.displayError(error, setEmailError, setPasswordError);
  };

  const clearErrors = () => {
    setEmailError(null);
    setPasswordError(null);
  };

  return {
    form,
    isLoading,
    emailError,
    passwordError,
    handleAuthError,
    clearErrors,
    setIsLoading,
  };
}
