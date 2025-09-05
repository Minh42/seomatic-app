import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginSchema } from '@/lib/validations/auth';
import { useFieldValidation } from '@/hooks/useFieldValidation';

interface LoginFormProps {
  form: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  isLoading: boolean;
  emailError: string | null;
  passwordError: string | null;
  onSubmit: (e: React.FormEvent) => void;
}

export function LoginForm({
  form,
  isLoading,
  emailError,
  passwordError,
  onSubmit,
}: LoginFormProps) {
  const emailValidation = useFieldValidation(loginSchema, 'email');
  const passwordValidation = useFieldValidation(loginSchema, 'password');

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
          </div>
        )}
      </form.Field>

      <form.Field name="rememberMe">
        {(
          field: any // eslint-disable-line @typescript-eslint/no-explicit-any
        ) => (
          <div className="flex items-center">
            <input
              id="remember"
              type="checkbox"
              checked={field.state.value}
              onChange={e => field.handleChange(e.target.checked)}
              className="h-3 w-3 md:h-4 md:w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor="remember"
              className="ml-2 block text-xs md:text-sm text-gray-700"
            >
              Remember me
            </label>
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
            {isLoading ? 'Signing in...' : 'Sign In →'}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
