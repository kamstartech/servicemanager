/**
 * Utility for formatting API responses for display
 */

export interface DisplayResponse {
  displayType: 'SUCCESS' | 'FAILURE' | 'INFO';
  title: string;
  message: string;
  transactionReference?: string | null;
  rawData?: any;
}

/**
 * Format API result for display to user
 */
export function formatForDisplay(apiResult: any, finalStep?: any): DisplayResponse {
  // Extract configured messages from workflow step config
  const configuredSuccessMsg = finalStep?.config?.successMessage as string | undefined;
  const configuredFailureMsg = finalStep?.config?.failureMessage as string | undefined;

  // Check if this is a POST_TRANSACTION response
  if (apiResult && typeof apiResult === 'object') {
    const transactionSuccess = apiResult.success === true;
    const transaction = apiResult.transaction;
    const result = apiResult.result || {};

    if (transactionSuccess) {
      return {
        displayType: 'SUCCESS',
        title: 'Transaction Successful',
        // Priority: configured message > API response > default
        message: configuredSuccessMsg || result.message || apiResult.message || 'Your transaction was completed successfully',
        transactionReference: transaction?.ourTransactionId || transaction?.id || result.transactionId || 'N/A',
        rawData: apiResult // Include raw data for debugging
      };
    } else {
      return {
        displayType: 'FAILURE',
        title: 'Transaction Failed',
        // Priority: configured message > API error > default
        message: configuredFailureMsg || apiResult.error || result.error || apiResult.message || 'Transaction could not be completed. Please try again.',
        transactionReference: transaction?.ourTransactionId || transaction?.id || null,
        rawData: apiResult // Include raw data for debugging
      };
    }
  }

  // Fallback for unknown format
  return {
    displayType: 'FAILURE',
    title: 'Transaction Status Unknown',
    message: configuredFailureMsg || 'Unable to determine transaction status. Please contact support.',
    transactionReference: null,
    rawData: apiResult
  };
}

/**
 * Extract human-readable error message from T24 response
 */
export function extractT24ErrorMessage(result: { message?: any; error?: string }): string {
  let errorMessage = 'Transaction failed';

  if (typeof result.message === 'string') {
    errorMessage = result.message;
  } else if (result.message && typeof result.message === 'object') {
    // Handle T24 business error format: { type: 'BUSINESS', errorDetails: [...] }
    const errorDetails = (result.message as any).errorDetails;
    if (Array.isArray(errorDetails) && errorDetails.length > 0) {
      errorMessage = errorDetails[0].message || errorDetails[0].errorMessage || errorMessage;
    } else if ((result.message as any).message) {
      errorMessage = (result.message as any).message;
    }
  } else if (result.error) {
    errorMessage = result.error;
  }

  return errorMessage;
}
