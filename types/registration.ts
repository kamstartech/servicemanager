import { RegistrationStatus, RegistrationSource } from '@prisma/client';

export interface ThirdPartyRegistrationRequest {
  service: 'REGISTRATION';
  service_action: 'MOBILE_BANKING_REGISTRATION';
  phone_number: string;
  customer_number: string;
  email_address?: string;
  first_name?: string;
  last_name?: string;
  profile_name?: string;
  profile_type?: string;
  company?: string;
  account_officer?: string;
  inputter?: string;
  authoriser?: string;
  user_id?: string;
  password?: string;
}

export interface RequestedRegistrationCreate {
  sourceIp: string;
  requestBody: ThirdPartyRegistrationRequest;
  source?: RegistrationSource;
  phoneNumber: string;
  customerNumber: string;
  emailAddress?: string;
  firstName?: string;
  lastName?: string;
  profileType?: string;
  company?: string;
}

export interface RequestedRegistrationUpdate {
  status?: RegistrationStatus;
  processedAt?: Date;
  elixirUserId?: number;
  mobileUserId?: number;
  errorMessage?: string;
  retryCount?: number;
  lastRetryAt?: Date;
  processedBy?: number;
  notes?: string;
}

export interface RequestedRegistrationWithRelations {
  id: number;
  sourceIp: string;
  requestBody: any;
  source: RegistrationSource;
  phoneNumber: string;
  customerNumber: string;
  emailAddress: string | null;
  firstName: string | null;
  lastName: string | null;
  profileType: string | null;
  company: string | null;
  status: RegistrationStatus;
  processedAt: Date | null;
  elixirUserId: number | null;
  mobileUserId: number | null;
  errorMessage: string | null;
  retryCount: number;
  lastRetryAt: Date | null;
  processedBy: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  mobileUser?: {
    id: number;
    username: string | null;
    phoneNumber: string | null;
    customerNumber: string | null;
  } | null;
  processedByUser?: {
    id: number;
    email: string;
    name: string | null;
  } | null;
}

export interface RegistrationFilters {
  status?: RegistrationStatus;
  source?: RegistrationSource;
  customerNumber?: string;
  phoneNumber?: string;
  sourceIp?: string;
  fromDate?: Date;
  toDate?: Date;
}
