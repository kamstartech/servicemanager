export interface SMSResponse {
  success: boolean;
  messageId?: string;
  status: 'sent' | 'failed' | 'pending' | 'skipped';
  error?: string;
  details?: any;
  smsId?: number; // Database ID for tracking
}
