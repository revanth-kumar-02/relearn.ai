import { ApiResponse } from '../api/apiClient';

/**
 * Standardized Application Error Handler.
 * Normalizes error messages and strips internal stack traces before presenting to users.
 */
export function normalizeError(error: unknown, fallbackMessage = 'An unexpected error occurred'): ApiResponse<null> {
  if (!error) {
    return {
      success: false,
      message: fallbackMessage,
      code: 'UNKNOWN_ERROR',
    };
  }

  if (typeof error === 'string') {
    return {
      success: false,
      message: sanitizeErrorMessage(error),
      code: 'APP_ERROR',
    };
  }

  if (error instanceof Error) {
    return {
      success: false,
      message: sanitizeErrorMessage(error.message || fallbackMessage),
      code: error.name !== 'Error' ? error.name : 'APP_ERROR',
    };
  }

  if (typeof error === 'object' && 'message' in (error as any)) {
    return {
      success: false,
      message: sanitizeErrorMessage(String((error as any).message)),
      code: (error as any).code || 'API_ERROR',
    };
  }

  return {
    success: false,
    message: fallbackMessage,
    code: 'UNKNOWN_ERROR',
  };
}

/**
 * Strips raw internal database stack traces, file paths, and SQL query dumps from user-facing error messages.
 */
function sanitizeErrorMessage(msg: string): string {
  if (!msg) return 'An error occurred';

  // Strip database / SQL errors
  if (/postgres|supabase|sql|relation|column|foreign key|violates/i.test(msg)) {
    return 'Database operation failed. Please try again later.';
  }

  // Strip file paths
  let cleanMsg = msg.replace(/([A-Z]:\\[^:\n]+|\/[^:\n]+)/g, '[path]');

  // Truncate extreme long error text
  if (cleanMsg.length > 300) {
    cleanMsg = cleanMsg.substring(0, 300) + '...';
  }

  return cleanMsg;
}
