import { CheckbookRequest, CheckbookRequestStatus } from "@prisma/client";

export type { CheckbookRequest, CheckbookRequestStatus };

export interface CheckbookRequestWithUser extends CheckbookRequest {
  mobileUser: {
    id: number;
    username: string | null;
    phoneNumber: string | null;
    customerNumber: string | null;
  };
  approvedByUser?: {
    id: number;
    name: string | null;
    email: string;
  } | null;
}

export interface CheckbookRequestCreate {
  mobileUserId: number;
  accountNumber: string;
  numberOfCheckbooks: number;
  collectionPoint: string;
  notes?: string;
}

export interface CheckbookRequestUpdate {
  status?: CheckbookRequestStatus;
  numberOfCheckbooks?: number;
  collectionPoint?: string;
  notes?: string;
  rejectionReason?: string;
}

export interface CheckbookRequestFilters {
  status?: CheckbookRequestStatus | "ALL";
  accountNumber?: string;
  mobileUserId?: number;
  page?: number;
  pageSize?: number;
}
