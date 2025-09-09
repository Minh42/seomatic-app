import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginSchema } from '@/lib/validations/auth';
import { useFieldValidation } from '@/hooks/useFieldValidation';
import { Mail } from 'lucide-react';

interface MagicLinkFormProps {
  form: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  isLoading: boolean;
  emailError: string | null;
  onSubmit: (e: React.FormEvent) => void;
}

export function MagicLinkForm({
  form,
  isLoading,
  emailError,
  onSubmit,
}: MagicLinkFormProps) {
  const emailValidation = useFieldValidation(loginSchema, 'email');

  return (
    <form className="space-y-4 md:space-y-6" onSubmit={onSubmit}>
      <form.Field name="email" validators={emailValidation}>
        {(
          field: any // eslint-disable-line @typescript-eslint/no-explicit-any
        ) => (
          <div className="space-y-2">
            <Label htmlFor="email">Work Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="rand.fishkin@company.com"
              value={field.state.value}
              onChange={e => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              disabled={isLoading}
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-sm text-red-600">
                {field.state.meta.errors[0]}
              </p>
            )}
            {emailError && <p className="text-sm text-red-600">{emailError}</p>}
          </div>
        )}
      </form.Field>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <div className="flex items-start">
          <Mail className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
          <p className="text-sm text-blue-800">
            We&apos;ll send you a secure link to sign in without a password.
            Check your email and click the link to continue.
          </p>
        </div>
      </div>

      <form.Subscribe
        selector={(state: { canSubmit: boolean; isSubmitting: boolean }) => [
          state.canSubmit,
          state.isSubmitting,
        ]}
      >
        {([canSubmit, isSubmitting]: [boolean, boolean]) => (
          <Button
            type="submit"
            size="lg"
            className="w-full text-sm md:text-base font-medium"
            disabled={!canSubmit || isSubmitting || isLoading}
          >
            {isLoading ? 'Sending magic link...' : 'Send Magic Link →'}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
