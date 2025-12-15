export interface SMSResponse {
  success: boolean;
  messageId?: string;
  status: 'sent' | 'failed' | 'pending';
  error?: string;
  details?: any;
  smsId?: number; // Database ID for tracking
}
