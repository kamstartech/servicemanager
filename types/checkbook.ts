export type CheckbookRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "READY_FOR_COLLECTION"
  | "COLLECTED"
  | "CANCELLED"
  | "REJECTED";

export interface CheckbookRequest {
  id: number;
  mobileUserId: number | null;
  accountNumber: string;
  numberOfCheckbooks: number;
  collectionPoint: string;
  status: CheckbookRequestStatus;
  requestedAt: Date;
  approvedAt: Date | null;
  readyAt: Date | null;
  collectedAt: Date | null;
  cancelledAt: Date | null;
  rejectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  notes?: string | null;
  rejectionReason?: string | null;
}

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
