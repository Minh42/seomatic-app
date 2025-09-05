import { z } from 'zod';

export function useFieldValidation<T extends z.ZodObject<any>>(
  schema: T,
  fieldName: keyof z.infer<T>
) {
  return {
    onBlur: ({ value }: { value: unknown }) => {
      try {
        const fieldSchema = schema.shape[fieldName as string];
        if (fieldSchema) {
          fieldSchema.parse(value);
        }
        return undefined;
      } catch (error: unknown) {
        if (error instanceof z.ZodError) {
          return error.issues[0]?.message || `Invalid ${String(fieldName)}`;
        }
        return `Invalid ${String(fieldName)}`;
      }
    },
  };
}
