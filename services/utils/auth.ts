/**
 * Central utility to manage authentication tokens for API services.
 * This allows services to access the current session token without 
 * being directly tied to the React context tree.
 */

let currentToken: string | null = null;

export const setServiceAuthToken = (token: string | null) => {
    currentToken = token;
};

export const getServiceAuthToken = (): string | null => {
    return currentToken;
};

/**
 * Returns the standard Authorization header object if a token is available.
 */
export const getAuthHeaders = (): Record<string, string> => {
    const token = getServiceAuthToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};
