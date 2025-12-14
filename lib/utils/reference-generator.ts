/**
 * Generate a unique transaction reference
 * Format: TXN{timestamp}{random}
 * Example: TXNL7K3MNP8A2BCD
 */
export function generateTransactionReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `TXN${timestamp}${random}`;
}
