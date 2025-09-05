import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { signupSchema } from '@/lib/validations/auth';
import { useFieldValidation } from '@/hooks/useFieldValidation';

interface SignupFormProps {
  form: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  isLoading: boolean;
  emailError: string | null;
  passwordError: string | null;
  onSubmit: (e: React.FormEvent) => void;
}

export function SignupForm({
  form,
  isLoading,
  emailError,
  passwordError,
  onSubmit,
}: SignupFormProps) {
  const emailValidation = useFieldValidation(signupSchema, 'email');
  const passwordValidation = useFieldValidation(signupSchema, 'password');

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

      <form.Field name="password" validators={passwordValidation}>
        {(
          field: any // eslint-disable-line @typescript-eslint/no-explicit-any
        ) => (
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••••"
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
            {passwordError && (
              <p className="text-sm text-red-600">{passwordError}</p>
            )}
            <PasswordStrengthIndicator password={field.state.value} />
          </div>
        )}
      </form.Field>

      <form.Subscribe
        selector={(state: any) => [state.canSubmit, state.isSubmitting]}
      >
        {([canSubmit, isSubmitting]: [boolean, boolean]) => (
          <Button
            type="submit"
            className="w-full h-10 md:h-12 text-sm md:text-base font-medium"
            disabled={!canSubmit || isSubmitting || isLoading}
          >
            {isLoading ? 'Creating account...' : 'Continue →'}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
