'use client';

import { Check, X } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface ValidationRule {
  label: string;
  test: (password: string) => boolean;
}

const validationRules: ValidationRule[] = [
  {
    label: 'At least 8 characters',
    test: password => password.length >= 8,
  },
  {
    label: 'Contains uppercase letter',
    test: password => /[A-Z]/.test(password),
  },
  {
    label: 'Contains lowercase letter',
    test: password => /[a-z]/.test(password),
  },
  {
    label: 'Contains number',
    test: password => /\d/.test(password),
  },
];

export function PasswordStrengthIndicator({
  password,
}: PasswordStrengthIndicatorProps) {
  if (!password) return null;

  const passedRules = validationRules.filter(rule => rule.test(password));
  const strengthPercentage =
    (passedRules.length / validationRules.length) * 100;

  const getStrengthColor = () => {
    if (strengthPercentage < 50) return 'bg-red-500';
    if (strengthPercentage < 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthLabel = () => {
    if (strengthPercentage < 50) return 'Weak';
    if (strengthPercentage < 75) return 'Medium';
    return 'Strong';
  };

  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">Password strength:</span>
        <span
          className={`font-medium ${
            strengthPercentage < 50
              ? 'text-red-600'
              : strengthPercentage < 75
                ? 'text-yellow-600'
                : 'text-green-600'
          }`}
        >
          {getStrengthLabel()}
        </span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor()}`}
          style={{ width: `${strengthPercentage}%` }}
        />
      </div>

      <div className="space-y-1">
        {validationRules.map((rule, index) => {
          const passed = rule.test(password);
          return (
            <div key={index} className="flex items-center text-xs">
              {passed ? (
                <Check className="w-3 h-3 text-green-500 mr-2" />
              ) : (
                <X className="w-3 h-3 text-gray-400 mr-2" />
              )}
              <span className={passed ? 'text-green-600' : 'text-gray-500'}>
                {rule.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
