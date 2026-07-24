import { z } from 'zod';
import { sanitizeInput } from './sanitize';

// 1. Authentication Schemas
export const emailSchema = z.string().trim().email('Invalid email address format').max(255);
export const passwordSchema = z.string().min(6, 'Password must be at least 6 characters').max(100);
export const nameSchema = z.string().trim().min(1, 'Name is required').max(100);

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const signupSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const changePasswordSchema = z.object({
  newPassword: passwordSchema,
});

// 2. AI Prompt Schema
export const aiPromptSchema = z.object({
  prompt: z.string().trim().min(1, 'Prompt cannot be empty').max(4000, 'Prompt exceeds max length'),
  persona: z.string().optional(),
});

// 3. Profile Schema
export const profileSchema = z.object({
  name: nameSchema.optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().or(z.literal('')).optional(),
});

// 4. Learning Plan & Task Schemas
export const createPlanSchema = z.object({
  topic: z.string().trim().min(1, 'Topic cannot be empty').max(200),
  goal: z.string().trim().max(500).optional(),
  durationDays: z.number().int().min(1).max(365).optional(),
});

export const taskSchema = z.object({
  title: z.string().trim().min(1, 'Task title is required').max(200),
  description: z.string().max(1000).optional(),
});

// 5. Feedback Schema
export const feedbackSchema = z.object({
  category: z.string().min(1),
  message: z.string().trim().min(5, 'Feedback message must be at least 5 characters').max(2000),
  email: emailSchema.optional(),
});

/**
 * Validation & Sanitization Pipeline:
 * User Input -> Zod Validation -> Input Sanitization -> Validated Output
 */
export function validateAndSanitize<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    return {
      success: false,
      error: issue ? `${issue.path.join('.')}: ${issue.message}` : 'Validation error',
    };
  }

  // If input data contains strings, sanitize them
  const val = result.data;
  if (typeof val === 'object' && val !== null) {
    const sanitizedObj = { ...val } as Record<string, any>;
    for (const key of Object.keys(sanitizedObj)) {
      if (typeof sanitizedObj[key] === 'string') {
        sanitizedObj[key] = sanitizeInput(sanitizedObj[key]);
      }
    }
    return { success: true, data: sanitizedObj as T };
  } else if (typeof val === 'string') {
    return { success: true, data: sanitizeInput(val) as unknown as T };
  }

  return { success: true, data: val };
}
