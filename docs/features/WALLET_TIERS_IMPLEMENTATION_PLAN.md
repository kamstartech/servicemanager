# Wallet Tiers Implementation Plan

## Summary
Implementation plan for adding a comprehensive wallet tier system to the Next.js admin application, including database schema, GraphQL API, and admin UI for managing tiers and user tier assignments.

## Problem/Context
Currently, there is no tier-based system for wallet users (WALLET context in MobileUser). We need to implement:
- Different transaction and balance limits based on user verification level
- Dynamic KYC requirements per tier
- Tier upgrade paths based on completed KYC
- Admin interface for managing tiers
- Enforcement of tier limits in transactions

## Solution Overview
Implement a wallet tier system following the existing Elixir implementation but adapted to our Next.js + Prisma + GraphQL stack:

1. **Database Layer**: Prisma schema with `fdh_wallet_tiers` table
2. **GraphQL API**: Queries and mutations for tier management
3. **Admin UI**: React components using shadcn/ui for tier CRUD operations
4. **Business Logic**: Tier validation and upgrade checks
5. **Integration**: Link MobileUser (WALLET context) to tiers

## Implementation Plan

### Phase 1: Database Schema (Prisma)

#### 1.1 Create WalletTier Model

```prisma
// Add to schema.prisma

model WalletTier {
  id          Int      @id @default(autoincrement())
  
  // Basic Info
  name        String   @db.Text
  description String?  @db.Text
  position    Int      // Hierarchy: 1, 2, 3, etc.
  isDefault   Boolean  @default(false) @map("is_default")
  
  // Balance Limits
  minimumBalance       Decimal @default(0) @map("minimum_balance") @db.Decimal(15, 2)
  maximumBalance       Decimal @map("maximum_balance") @db.Decimal(15, 2)
  maximumCreditLimit   Decimal @default(0) @map("maximum_credit_limit") @db.Decimal(15, 2)
  maximumDebtLimit     Decimal @default(0) @map("maximum_debt_limit") @db.Decimal(15, 2)
  
  // Transaction Amount Limits
  minTransactionAmount   Decimal @map("min_transaction_amount") @db.Decimal(15, 2)
  maxTransactionAmount   Decimal @map("max_transaction_amount") @db.Decimal(15, 2)
  dailyTransactionLimit  Decimal @map("daily_transaction_limit") @db.Decimal(15, 2)
  monthlyTransactionLimit Decimal @map("monthly_transaction_limit") @db.Decimal(15, 2)
  
  // Transaction Count Limits
  dailyTransactionCount   Int @map("daily_transaction_count")
  monthlyTransactionCount Int @map("monthly_transaction_count")
  
  // Dynamic KYC Requirements (JSON)
  requiredKycFields String[] @default([]) @map("required_kyc_fields")
  kycRules          Json     @default("{}") @map("kyc_rules") // Map of rule_name -> value
  
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  // Relations
  kycRecords MobileUserKYC[]
  
  @@unique([position])
  @@index([isDefault])
  @@map("fdh_wallet_tiers")
}
```

#### 1.2 Create MobileUserKYC Table

Create a separate table to track KYC information per MobileUser:

```prisma
// Add to schema.prisma

model MobileUserKYC {
  id           Int @id @default(autoincrement())
  mobileUserId Int @unique @map("mobile_user_id")
  
  // Wallet Tier Assignment (only for WALLET context users)
  walletTierId Int? @map("wallet_tier_id")
  
  // KYC Fields
  dateOfBirth   DateTime? @map("date_of_birth") @db.Date
  occupation    String?   @db.Text
  employerName  String?   @map("employer_name") @db.Text
  sourceOfFunds String?   @map("source_of_funds") @db.Text
  idNumber      String?   @map("id_number") @db.Text
  idImage       String?   @map("id_image") @db.Text
  
  // KYC Status
  kycComplete   Boolean   @default(false) @map("kyc_complete")
  kycVerifiedAt DateTime? @map("kyc_verified_at")
  
  // NRB Validation
  nrbValidation      Boolean? @map("nrb_validation")
  nrbResponseCode    Int?     @map("nrb_response_code")
  nrbResponseMessage String?  @map("nrb_response_message") @db.Text
  nrbStatus          String?  @map("nrb_status") @db.Text
  nrbStatusReason    String?  @map("nrb_status_reason") @db.Text
  
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  // Relations
  mobileUser MobileUser  @relation(fields: [mobileUserId], references: [id], onDelete: Cascade)
  walletTier WalletTier? @relation(fields: [walletTierId], references: [id])
  
  @@index([mobileUserId])
  @@index([walletTierId])
  @@map("fdh_mobile_user_kyc")
}

// Update MobileUser to add relation
model MobileUser {
  // ... existing fields ...
  kyc MobileUserKYC?
  // ... rest of model
}
```

#### 1.3 Extend MobileUserAccount with Context

Reuse the existing `MobileUserAccount` table and differentiate by context:

```prisma
// Update MobileUserAccount in schema.prisma

model MobileUserAccount {
  id           Int @id @default(autoincrement())
  mobileUserId Int @map("mobile_user_id")
  
  // Add context to distinguish between WALLET and MOBILE_BANKING accounts
  context      MobileUserContext @default(MOBILE_BANKING)

  accountNumber String  @map("account_number") @db.Text
  accountName   String? @map("account_name") @db.Text
  accountType   String? @map("account_type") @db.Text // SAVINGS, CURRENT, WALLET, etc.
  currency      String  @default("MWK")

  // Account details from T24 (for MOBILE_BANKING context)
  categoryId    String? @map("category_id") @db.Text
  categoryName  String? @map("category_name") @db.Text
  accountStatus String? @map("account_status") @db.Text
  holderName    String? @map("holder_name") @db.Text
  nickName      String? @map("nick_name") @db.Text
  onlineLimit   String? @map("online_limit") @db.Text
  openingDate   String? @map("opening_date") @db.Text

  // Balance fields (synced from T24 for MOBILE_BANKING, managed locally for WALLET)
  balance          Decimal? @db.Decimal(15, 2)
  workingBalance   Decimal? @map("working_balance") @db.Decimal(15, 2)
  availableBalance Decimal? @map("available_balance") @db.Decimal(15, 2)
  clearedBalance   Decimal? @map("cleared_balance") @db.Decimal(15, 2)
  
  // Wallet-specific fields (only used when context = WALLET)
  frozen              Boolean   @default(false)
  locked              Boolean   @default(false)
  blocked             Boolean   @default(false)
  lastTransactionDate DateTime? @map("last_transaction_date")

  isPrimary Boolean @default(false) @map("is_primary")
  isActive  Boolean @default(true) @map("is_active")

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relations
  mobileUser MobileUser @relation(fields: [mobileUserId], references: [id], onDelete: Cascade)

  @@unique([mobileUserId, accountNumber, context])
  @@index([mobileUserId])
  @@index([context])
  @@map("fdh_mobile_user_accounts")
}
```

**Key Changes:**
- Add `context` field (enum: MOBILE_BANKING or WALLET)
- Add wallet-specific fields: `frozen`, `locked`, `blocked`, `lastTransactionDate`
- Update unique constraint to include `context`
- Add index on `context` for efficient filtering

**Usage:**
- MOBILE_BANKING accounts: Multiple T24 accounts per user (accountNumber from T24)
- WALLET accounts: One wallet account per user (accountNumber = phoneNumber from MobileUser)
```

#### 1.4 Create Migration

```bash
npx prisma migrate dev --name add_wallet_tiers_kyc_and_account_context
```

This migration will:
1. Create the `fdh_wallet_tiers` table
2. Create the `fdh_mobile_user_kyc` table for KYC tracking
3. Add `context` field to `fdh_mobile_user_accounts`
4. Add wallet-specific fields to `fdh_mobile_user_accounts`
5. Update unique constraint and add indexes

### Phase 2: GraphQL Schema & Resolvers

#### 2.1 GraphQL Type Definitions

Create: `app/api/graphql/schemas/wallet-tier.ts`

```typescript
export const walletTierTypeDefs = `#graphql
  type WalletTier {
    id: Int!
    name: String!
    description: String
    position: Int!
    isDefault: Boolean!
    
    # Balance Limits
    minimumBalance: Float!
    maximumBalance: Float!
    maximumCreditLimit: Float!
    maximumDebtLimit: Float!
    
    # Transaction Amount Limits
    minTransactionAmount: Float!
    maxTransactionAmount: Float!
    dailyTransactionLimit: Float!
    monthlyTransactionLimit: Float!
    
    # Transaction Count Limits
    dailyTransactionCount: Int!
    monthlyTransactionCount: Int!
    
    # KYC Requirements
    requiredKycFields: [String!]!
    kycRules: JSON!
    
    # Metadata
    createdAt: DateTime!
    updatedAt: DateTime!
    
    # Relations
    walletUsersCount: Int!
  }
  
  type WalletUser {
    id: Int!
    context: MobileUserContext!
    phoneNumber: String
    isActive: Boolean!
    
    # Profile (existing relation)
    profile: MobileUserProfile
    
    # KYC Information
    kyc: MobileUserKYC
    
    # Wallet Account
    walletAccount: WalletAccount
    
    # Computed
    completedKycFields: [String!]!
    availableUpgradeTiers: [WalletTier!]!
    meetsCurrentTierRequirements: Boolean!
    
    createdAt: DateTime!
    updatedAt: DateTime!
  }
  
  type MobileUserKYC {
    id: Int!
    mobileUserId: Int!
    
    # Wallet Tier
    walletTierId: Int
    walletTier: WalletTier
    
    # KYC Fields
    dateOfBirth: DateTime
    occupation: String
    employerName: String
    sourceOfFunds: String
    idNumber: String
    idImage: String
    
    # KYC Status
    kycComplete: Boolean!
    kycVerifiedAt: DateTime
    
    # NRB Validation
    nrbValidation: Boolean
    nrbResponseCode: Int
    nrbResponseMessage: String
    nrbStatus: String
    nrbStatusReason: String
    
    createdAt: DateTime!
    updatedAt: DateTime!
  }
  
  type WalletAccount {
    id: Int!
    mobileUserId: Int!
    context: MobileUserContext!
    accountNumber: String!
    accountName: String
    accountType: String
    currency: String!
    
    # Balance
    balance: Float
    workingBalance: Float
    availableBalance: Float
    clearedBalance: Float
    
    # Wallet-specific fields
    frozen: Boolean!
    locked: Boolean!
    blocked: Boolean!
    lastTransactionDate: DateTime
    
    isPrimary: Boolean!
    isActive: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }
  
  input CreateWalletTierInput {
    name: String!
    description: String
    position: Int!
    isDefault: Boolean
    
    minimumBalance: Float!
    maximumBalance: Float!
    maximumCreditLimit: Float
    maximumDebtLimit: Float
    
    minTransactionAmount: Float!
    maxTransactionAmount: Float!
    dailyTransactionLimit: Float!
    monthlyTransactionLimit: Float!
    
    dailyTransactionCount: Int!
    monthlyTransactionCount: Int!
    
    requiredKycFields: [String!]
    kycRules: JSON
  }
  
  input UpdateWalletTierInput {
    name: String
    description: String
    position: Int
    isDefault: Boolean
    
    minimumBalance: Float
    maximumBalance: Float
    maximumCreditLimit: Float
    maximumDebtLimit: Float
    
    minTransactionAmount: Float
    maxTransactionAmount: Float
    dailyTransactionLimit: Float
    monthlyTransactionLimit: Float
    
    dailyTransactionCount: Int
    monthlyTransactionCount: Int
    
    requiredKycFields: [String!]
    kycRules: JSON
  }
  
  input UpdateWalletUserKYCInput {
    dateOfBirth: DateTime
    occupation: String
    employerName: String
    sourceOfFunds: String
    idNumber: String
    idImage: String
    walletTierId: Int
  }
  
  type Query {
    walletTiers: [WalletTier!]!
    walletTier(id: Int!): WalletTier
    defaultWalletTier: WalletTier
    
    # Query wallet users (MobileUser with context=WALLET)
    walletUsers(
      page: Int
      pageSize: Int
      search: String
      tierId: Int
      status: String
    ): WalletUsersConnection!
    
    walletUser(id: Int!): WalletUser
  }
  
  type Mutation {
    createWalletTier(input: CreateWalletTierInput!): WalletTier!
    updateWalletTier(id: Int!, input: UpdateWalletTierInput!): WalletTier!
    deleteWalletTier(id: Int!): Boolean!
    reorderWalletTiers(positions: [TierPositionInput!]!): [WalletTier!]!
    
    updateWalletUserKYC(mobileUserId: Int!, input: UpdateWalletUserKYCInput!): MobileUserKYC!
    upgradeWalletUserTier(mobileUserId: Int!, newTierId: Int!): MobileUserKYC!
  }
  
  input TierPositionInput {
    id: Int!
    position: Int!
  }
  
  type WalletUsersConnection {
    nodes: [WalletUser!]!
    totalCount: Int!
    pageInfo: PageInfo!
  }
  
  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    page: Int!
    pageSize: Int!
  }
`;
```

#### 2.2 GraphQL Resolvers

Create: `app/api/graphql/resolvers/wallet-tier.ts`

```typescript
import { prisma } from '@/lib/prisma';
import { GraphQLError } from 'graphql';

export const walletTierResolvers = {
  Query: {
    walletTiers: async () => {
      return await prisma.walletTier.findMany({
        orderBy: { position: 'asc' },
        include: {
          _count: {
            select: { kycRecords: true }
          }
        }
      });
    },
    
    walletTier: async (_: any, { id }: { id: number }) => {
      return await prisma.walletTier.findUnique({
        where: { id },
        include: {
          _count: {
            select: { kycRecords: true }
          }
        }
      });
    },
    
    defaultWalletTier: async () => {
      return await prisma.walletTier.findFirst({
        where: { isDefault: true }
      });
    },
    
    walletUsers: async (_: any, args: any) => {
      const { page = 1, pageSize = 20, search, tierId, status } = args;
      
      const where: any = {
        context: 'WALLET'
      };
      
      if (search) {
        where.OR = [
          { phoneNumber: { contains: search, mode: 'insensitive' } },
          { profile: { 
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } }
            ]
          }},
          { kyc: { idNumber: { contains: search, mode: 'insensitive' } } }
        ];
      }
      
      if (tierId) {
        where.kyc = {
          walletTierId: tierId
        };
      }
      
      if (status) {
        where.accounts = {
          some: {
            context: 'WALLET',
            OR: [
              { frozen: status === 'FROZEN' },
              { locked: status === 'LOCKED' },
              { blocked: status === 'BLOCKED' }
            ]
          }
        };
      }
      
      const [nodes, totalCount] = await Promise.all([
        prisma.mobileUser.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            profile: true,
            kyc: {
              include: {
                walletTier: true
              }
            },
            accounts: {
              where: { context: 'WALLET' }
            }
          }
        }),
        prisma.mobileUser.count({ where })
      ]);
      
      return {
        nodes,
        totalCount,
        pageInfo: {
          hasNextPage: page * pageSize < totalCount,
          hasPreviousPage: page > 1,
          page,
          pageSize
        }
      };
    },
    
    walletUser: async (_: any, { id }: { id: number }) => {
      return await prisma.mobileUser.findUnique({
        where: { id, context: 'WALLET' },
        include: {
          profile: true,
          kyc: {
            include: {
              walletTier: true
            }
          },
          accounts: {
            where: { context: 'WALLET' }
          }
        }
      });
    }
  },
  
  Mutation: {
    createWalletTier: async (_: any, { input }: any) => {
      // Validate limits
      if (input.minimumBalance > input.maximumBalance) {
        throw new GraphQLError('Minimum balance must be less than maximum balance');
      }
      
      if (input.minTransactionAmount > input.maxTransactionAmount) {
        throw new GraphQLError('Min transaction must be less than max transaction');
      }
      
      // If setting as default, unset current default
      if (input.isDefault) {
        await prisma.walletTier.updateMany({
          where: { isDefault: true },
          data: { isDefault: false }
        });
      }
      
      return await prisma.walletTier.create({
        data: {
          ...input,
          requiredKycFields: input.requiredKycFields || [],
          kycRules: input.kycRules || {}
        }
      });
    },
    
    updateWalletTier: async (_: any, { id, input }: any) => {
      // Similar validation as create
      if (input.isDefault) {
        await prisma.walletTier.updateMany({
          where: { isDefault: true, NOT: { id } },
          data: { isDefault: false }
        });
      }
      
      return await prisma.walletTier.update({
        where: { id },
        data: input
      });
    },
    
    deleteWalletTier: async (_: any, { id }: { id: number }) => {
      // Check if any users are assigned
      const count = await prisma.mobileUserKYC.count({
        where: { walletTierId: id }
      });
      
      if (count > 0) {
        throw new GraphQLError('Cannot delete tier with assigned users');
      }
      
      await prisma.walletTier.delete({ where: { id } });
      return true;
    },
    
    reorderWalletTiers: async (_: any, { positions }: any) => {
      // Update positions in transaction
      await prisma.$transaction(
        positions.map((p: any) =>
          prisma.walletTier.update({
            where: { id: p.id },
            data: { position: p.position }
          })
        )
      );
      
      return await prisma.walletTier.findMany({
        orderBy: { position: 'asc' }
      });
    },
    
    updateWalletUserKYC: async (_: any, { mobileUserId, input }: any) => {
      // Find or create KYC record
      const existing = await prisma.mobileUserKYC.findUnique({
        where: { mobileUserId }
      });
      
      if (existing) {
        return await prisma.mobileUserKYC.update({
          where: { mobileUserId },
          data: input,
          include: {
            walletTier: true,
            mobileUser: true
          }
        });
      } else {
        return await prisma.mobileUserKYC.create({
          data: {
            mobileUserId,
            ...input
          },
          include: {
            walletTier: true,
            mobileUser: true
          }
        });
      }
    },
    
    upgradeWalletUserTier: async (_: any, { mobileUserId, newTierId }: any) => {
      // Validate user meets tier requirements
      const user = await prisma.mobileUser.findUnique({
        where: { id: mobileUserId, context: 'WALLET' },
        include: { kyc: true }
      });
      
      if (!user) {
        throw new GraphQLError('Wallet user not found');
      }
      
      const newTier = await prisma.walletTier.findUnique({
        where: { id: newTierId }
      });
      
      if (!newTier) {
        throw new GraphQLError('Tier not found');
      }
      
      // Check if user meets requirements (implement logic)
      // For now, allow upgrade
      
      // Find or create KYC record
      if (user.kyc) {
        return await prisma.mobileUserKYC.update({
          where: { mobileUserId },
          data: { walletTierId: newTierId },
          include: {
            walletTier: true,
            mobileUser: true
          }
        });
      } else {
        return await prisma.mobileUserKYC.create({
          data: {
            mobileUserId,
            walletTierId: newTierId
          },
          include: {
            walletTier: true,
            mobileUser: true
          }
        });
      }
    }
  },
  
  WalletTier: {
    walletUsersCount: async (parent: any) => {
      if (parent._count?.kycRecords !== undefined) {
        return parent._count.kycRecords;
      }
      return await prisma.mobileUserKYC.count({
        where: { walletTierId: parent.id }
      });
    }
  },
  
  WalletUser: {
    walletAccount: async (parent: any) => {
      if (parent.accounts?.length > 0) {
        return parent.accounts.find((acc: any) => acc.context === 'WALLET');
      }
      
      return await prisma.mobileUserAccount.findFirst({
        where: {
          mobileUserId: parent.id,
          context: 'WALLET'
        }
      });
    },
    
    completedKycFields: async (parent: any) => {
      const kyc = parent.kyc || await prisma.mobileUserKYC.findUnique({
        where: { mobileUserId: parent.id }
      });
      
      if (!kyc) return [];
      
      const fields = [];
      if (kyc.dateOfBirth) fields.push('date_of_birth');
      if (kyc.occupation) fields.push('occupation');
      if (kyc.employerName) fields.push('employer_name');
      if (kyc.sourceOfFunds) fields.push('source_of_funds');
      if (kyc.idNumber) fields.push('id_number');
      if (kyc.idImage) fields.push('id_image');
      if (kyc.nrbValidation) fields.push('nrb_validation');
      return fields;
    },
    
    availableUpgradeTiers: async (parent: any) => {
      const kyc = parent.kyc || await prisma.mobileUserKYC.findUnique({
        where: { mobileUserId: parent.id },
        include: { walletTier: true }
      });
      
      const currentPosition = kyc?.walletTier?.position || 0;
      
      const tiers = await prisma.walletTier.findMany({
        where: {
          position: { gt: currentPosition }
        },
        orderBy: { position: 'asc' }
      });
      
      // Filter based on completed KYC (simplified)
      // In production, implement full requirement checking
      return tiers;
    },
    
    meetsCurrentTierRequirements: async (parent: any) => {
      const kyc = parent.kyc || await prisma.mobileUserKYC.findUnique({
        where: { mobileUserId: parent.id },
        include: { walletTier: true }
      });
      
      if (!kyc?.walletTier) return true;
      
      const requiredFields = kyc.walletTier.requiredKycFields || [];
      const completedFields = [];
      
      if (kyc.dateOfBirth) completedFields.push('date_of_birth');
      if (kyc.occupation) completedFields.push('occupation');
      if (kyc.employerName) completedFields.push('employer_name');
      if (kyc.sourceOfFunds) completedFields.push('source_of_funds');
      if (kyc.idNumber) completedFields.push('id_number');
      if (kyc.idImage) completedFields.push('id_image');
      if (kyc.nrbValidation) completedFields.push('nrb_validation');
      
      return requiredFields.every((field: string) => completedFields.includes(field));
    }
  }
};
```

#### 2.3 Integrate with Main GraphQL Schema

Update: `app/api/graphql/route.ts`

```typescript
import { walletTierTypeDefs } from './schemas/wallet-tier';
import { walletTierResolvers } from './resolvers/wallet-tier';

// Merge with existing typeDefs and resolvers
const typeDefs = `
  ${existingTypeDefs}
  ${walletTierTypeDefs}
`;

const resolvers = {
  Query: {
    ...existingResolvers.Query,
    ...walletTierResolvers.Query
  },
  Mutation: {
    ...existingResolvers.Mutation,
    ...walletTierResolvers.Mutation
  },
  WalletTier: walletTierResolvers.WalletTier,
  WalletUser: walletTierResolvers.WalletUser
};
```

### Phase 3: Business Logic Layer

Create: `lib/services/wallet-tiers/index.ts`

```typescript
import { prisma } from '@/lib/prisma';
import Decimal from 'decimal.js';

export interface TierLimitCheck {
  valid: boolean;
  reason?: string;
  limit?: string;
}

export class WalletTierService {
  /**
   * Create or get wallet account for a mobile user
   */
  static async getOrCreateWalletAccount(mobileUserId: number) {
    const mobileUser = await prisma.mobileUser.findUnique({
      where: { id: mobileUserId, context: 'WALLET' }
    });
    
    if (!mobileUser) {
      throw new Error('Mobile user not found or not a wallet user');
    }
    
    // Check if wallet account already exists
    let walletAccount = await prisma.mobileUserAccount.findFirst({
      where: {
        mobileUserId,
        context: 'WALLET'
      }
    });
    
    if (!walletAccount) {
      // Create wallet account using phoneNumber as accountNumber
      walletAccount = await prisma.mobileUserAccount.create({
        data: {
          mobileUserId,
          context: 'WALLET',
          accountNumber: mobileUser.phoneNumber || `WALLET_${mobileUserId}`,
          accountName: 'Wallet Account',
          accountType: 'WALLET',
          currency: 'MWK',
          balance: 0,
          isPrimary: true,
          isActive: true
        }
      });
    }
    
    return walletAccount;
  }
  
  /**
   * Check if transaction amount is within tier limits
   */
  static async checkTransactionLimits(
    mobileUserId: number,
    amount: Decimal,
    dailyTotal: Decimal,
    monthlyTotal: Decimal
  ): Promise<TierLimitCheck> {
    const mobileUser = await prisma.mobileUser.findUnique({
      where: { id: mobileUserId },
      include: { 
        kyc: {
          include: { walletTier: true }
        }
      }
    });
    
    if (!mobileUser?.kyc?.walletTier) {
      return { valid: false, reason: 'No tier assigned' };
    }
    
    const tier = mobileUser.kyc.walletTier;
    
    // Check min amount
    if (amount.lessThan(tier.minTransactionAmount)) {
      return {
        valid: false,
        reason: 'Amount below minimum',
        limit: tier.minTransactionAmount.toString()
      };
    }
    
    // Check max amount
    if (amount.greaterThan(tier.maxTransactionAmount)) {
      return {
        valid: false,
        reason: 'Amount exceeds maximum',
        limit: tier.maxTransactionAmount.toString()
      };
    }
    
    // Check daily limit
    if (dailyTotal.plus(amount).greaterThan(tier.dailyTransactionLimit)) {
      return {
        valid: false,
        reason: 'Daily limit exceeded',
        limit: tier.dailyTransactionLimit.toString()
      };
    }
    
    // Check monthly limit
    if (monthlyTotal.plus(amount).greaterThan(tier.monthlyTransactionLimit)) {
      return {
        valid: false,
        reason: 'Monthly limit exceeded',
        limit: tier.monthlyTransactionLimit.toString()
      };
    }
    
    return { valid: true };
  }
  
  /**
   * Check if balance is within tier limits
   */
  static async checkBalanceLimits(
    mobileUserId: number,
    newBalance: Decimal
  ): Promise<TierLimitCheck> {
    const mobileUser = await prisma.mobileUser.findUnique({
      where: { id: mobileUserId },
      include: { 
        kyc: {
          include: { walletTier: true }
        }
      }
    });
    
    if (!mobileUser?.kyc?.walletTier) {
      return { valid: false, reason: 'No tier assigned' };
    }
    
    const tier = mobileUser.kyc.walletTier;
    
    if (newBalance.lessThan(tier.minimumBalance)) {
      return {
        valid: false,
        reason: 'Balance below minimum',
        limit: tier.minimumBalance.toString()
      };
    }
    
    if (newBalance.greaterThan(tier.maximumBalance)) {
      return {
        valid: false,
        reason: 'Balance exceeds maximum',
        limit: tier.maximumBalance.toString()
      };
    }
    
    return { valid: true };
  }
  
  /**
   * Get completed KYC fields for a wallet user
   */
  static getCompletedKycFields(kyc: any): string[] {
    const fields = [];
    if (kyc.dateOfBirth) fields.push('date_of_birth');
    if (kyc.occupation) fields.push('occupation');
    if (kyc.employerName) fields.push('employer_name');
    if (kyc.sourceOfFunds) fields.push('source_of_funds');
    if (kyc.idNumber) fields.push('id_number');
    if (kyc.idImage) fields.push('id_image');
    if (kyc.nrbValidation) fields.push('nrb_validation');
    return fields;
  }
  
  /**
   * Check if user meets tier requirements
   */
  static async meetsTierRequirements(
    mobileUserId: number,
    tierId: number
  ): Promise<boolean> {
    const mobileUser = await prisma.mobileUser.findUnique({
      where: { id: mobileUserId },
      include: { kyc: true }
    });
    
    const tier = await prisma.walletTier.findUnique({
      where: { id: tierId }
    });
    
    if (!mobileUser?.kyc || !tier) return false;
    
    const completedFields = this.getCompletedKycFields(mobileUser.kyc);
    const requiredFields = tier.requiredKycFields || [];
    
    // Check all required fields are completed
    const hasRequiredFields = requiredFields.every((field: string) =>
      completedFields.includes(field)
    );
    
    if (!hasRequiredFields) return false;
    
    // Check KYC rules
    const rules = tier.kycRules as any;
    
    // Check minimum age
    if (rules.minimum_age && mobileUser.kyc.dateOfBirth) {
      const age = Math.floor(
        (Date.now() - mobileUser.kyc.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      );
      if (age < rules.minimum_age) return false;
    }
    
    // Check other boolean rules
    if (rules.id_required && !mobileUser.kyc.idNumber) return false;
    if (rules.employment_verification && !mobileUser.kyc.employerName) return false;
    if (rules.source_of_funds_required && !mobileUser.kyc.sourceOfFunds) return false;
    if (rules.nrb_verification && !mobileUser.kyc.nrbValidation) return false;
    
    return true;
  }
  
  /**
   * Get available upgrade tiers for a user
   */
  static async getAvailableUpgradeTiers(mobileUserId: number) {
    const mobileUser = await prisma.mobileUser.findUnique({
      where: { id: mobileUserId },
      include: { 
        kyc: {
          include: { walletTier: true }
        }
      }
    });
    
    if (!mobileUser) return [];
    
    const currentPosition = mobileUser.kyc?.walletTier?.position || 0;
    
    const tiers = await prisma.walletTier.findMany({
      where: {
        position: { gt: currentPosition }
      },
      orderBy: { position: 'asc' }
    });
    
    // Filter tiers user can upgrade to
    const available = [];
    for (const tier of tiers) {
      const meets = await this.meetsTierRequirements(mobileUserId, tier.id);
      if (meets) {
        available.push(tier);
      }
    }
    
    return available;
  }
}
```

### Phase 4: Admin UI

#### 4.1 Tier List Page

Create: `app/(dashboard)/wallet/tiers/page.tsx`

```typescript
'use client';

import { useQuery, useMutation } from '@apollo/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Edit, Trash2, GripVertical } from 'lucide-react';
import Link from 'next/link';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useState } from 'react';

const GET_TIERS = gql`
  query GetWalletTiers {
    walletTiers {
      id
      name
      description
      position
      isDefault
      maximumBalance
      maxTransactionAmount
      walletUsersCount
    }
  }
`;

const REORDER_TIERS = gql`
  mutation ReorderTiers($positions: [TierPositionInput!]!) {
    reorderWalletTiers(positions: $positions) {
      id
      position
    }
  }
`;

export default function WalletTiersPage() {
  const { data, loading, refetch } = useQuery(GET_TIERS);
  const [reorderTiers] = useMutation(REORDER_TIERS);
  const [tiers, setTiers] = useState([]);
  
  // Drag and drop logic here
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Wallet Tiers</h1>
        <Button asChild>
          <Link href="/wallet/tiers/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Tier
          </Link>
        </Button>
      </div>
      
      {/* Tier list with drag-drop */}
      {/* Use shadcn/ui components */}
    </div>
  );
}
```

#### 4.2 Tier Form Component

Create: `app/(dashboard)/wallet/tiers/[id]/page.tsx`

Use shadcn/ui components:
- Input for text fields
- Textarea for description
- Checkbox for isDefault
- Form validation with react-hook-form
- Multi-select for required KYC fields
- Dynamic rules builder

#### 4.3 Wallet Users List

Create: `app/(dashboard)/wallet/users/page.tsx`

- Table with filtering by tier
- Search functionality
- Pagination
- Link to user detail/upgrade

#### 4.4 User Tier Upgrade Modal

Create: `components/wallet/tier-upgrade-dialog.tsx`

- Show current tier
- List available upgrade tiers
- Display missing KYC fields
- Upgrade button

### Phase 5: Seed Data

Create: `prisma/seed/wallet-tiers.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedWalletTiers() {
  // Create default tiers
  await prisma.walletTier.createMany({
    data: [
      {
        name: 'Basic',
        description: 'Entry level wallet tier',
        position: 1,
        isDefault: true,
        minimumBalance: 0,
        maximumBalance: 50000,
        maximumCreditLimit: 0,
        maximumDebtLimit: 0,
        minTransactionAmount: 100,
        maxTransactionAmount: 10000,
        dailyTransactionLimit: 20000,
        monthlyTransactionLimit: 100000,
        dailyTransactionCount: 10,
        monthlyTransactionCount: 50,
        requiredKycFields: ['first_name', 'last_name'],
        kycRules: {}
      },
      {
        name: 'Silver',
        description: 'Verified users with basic KYC',
        position: 2,
        isDefault: false,
        minimumBalance: 0,
        maximumBalance: 500000,
        maximumCreditLimit: 50000,
        maximumDebtLimit: 50000,
        minTransactionAmount: 100,
        maxTransactionAmount: 100000,
        dailyTransactionLimit: 200000,
        monthlyTransactionLimit: 1000000,
        dailyTransactionCount: 20,
        monthlyTransactionCount: 100,
        requiredKycFields: ['first_name', 'last_name', 'date_of_birth', 'address', 'city'],
        kycRules: { minimum_age: 18 }
      },
      {
        name: 'Gold',
        description: 'Fully verified users with complete KYC',
        position: 3,
        isDefault: false,
        minimumBalance: 0,
        maximumBalance: 5000000,
        maximumCreditLimit: 500000,
        maximumDebtLimit: 500000,
        minTransactionAmount: 100,
        maxTransactionAmount: 1000000,
        dailyTransactionLimit: 2000000,
        monthlyTransactionLimit: 10000000,
        dailyTransactionCount: 50,
        monthlyTransactionCount: 500,
        requiredKycFields: [
          'first_name',
          'last_name',
          'date_of_birth',
          'address',
          'city',
          'occupation',
          'source_of_funds',
          'id_number'
        ],
        kycRules: {
          minimum_age: 18,
          id_required: true,
          source_of_funds_required: true
        }
      }
    ]
  });
  
  console.log('✅ Wallet tiers seeded');
  
  // Optional: Create sample wallet users with accounts
  const defaultTier = await prisma.walletTier.findFirst({
    where: { isDefault: true }
  });
  
  if (defaultTier) {
    // Example: Create a wallet user with account
    const sampleUser = await prisma.mobileUser.create({
      data: {
        context: 'WALLET',
        phoneNumber: '+265888123456',
        isActive: true
      }
    });
    
    // Create wallet account (using phoneNumber as accountNumber)
    await prisma.mobileUserAccount.create({
      data: {
        mobileUserId: sampleUser.id,
        context: 'WALLET',
        accountNumber: sampleUser.phoneNumber,
        accountName: 'Wallet Account',
        accountType: 'WALLET',
        currency: 'MWK',
        balance: 0,
        isPrimary: true,
        isActive: true
      }
    });
    
    // Create KYC record with default tier
    await prisma.mobileUserKYC.create({
      data: {
        mobileUserId: sampleUser.id,
        walletTierId: defaultTier.id
      }
    });
    
    console.log('✅ Sample wallet user created');
  }
}
```

## Implementation Checklist

### Phase 1: Database
- [ ] Add WalletTier model to schema.prisma
- [ ] Add MobileUserKYC model to schema.prisma
- [ ] Extend MobileUserAccount with context and wallet fields
- [ ] Update MobileUser with relations
- [ ] Run migration
- [ ] Create seed script
- [ ] Run seed

### Phase 2: GraphQL API
- [ ] Create type definitions
- [ ] Implement resolvers (queries)
- [ ] Implement resolvers (mutations)
- [ ] Integrate with main schema
- [ ] Test queries in GraphQL playground

### Phase 3: Business Logic
- [ ] Create WalletTierService
- [ ] Implement limit checking methods
- [ ] Implement KYC validation
- [ ] Implement upgrade eligibility check
- [ ] Add unit tests

### Phase 4: Admin UI
- [ ] Create tiers list page
- [ ] Create tier form (new/edit)
- [ ] Implement drag-drop reordering
- [ ] Create wallet users list
- [ ] Create tier upgrade dialog
- [ ] Add filters and search

### Phase 5: Integration
- [ ] Hook up tier limits in transaction flows
- [ ] Add tier checks to balance updates
- [ ] Create tier upgrade workflow
- [ ] Add tier info to user profile views

## Available KYC Fields

```typescript
export const AVAILABLE_KYC_FIELDS = [
  'first_name',
  'last_name',
  'date_of_birth',
  'address',
  'city',
  'occupation',
  'employer_name',
  'source_of_funds',
  'id_number',
  'id_image',
  'nrb_validation'
] as const;

export const AVAILABLE_KYC_RULES = [
  { key: 'minimum_age', label: 'Minimum Age (years)', type: 'number' },
  { key: 'id_required', label: 'ID Required', type: 'boolean' },
  { key: 'address_required', label: 'Address Required', type: 'boolean' },
  { key: 'employment_verification', label: 'Employment Verification', type: 'boolean' },
  { key: 'source_of_funds_required', label: 'Source of Funds Required', type: 'boolean' },
  { key: 'nrb_verification', label: 'NRB Verification', type: 'boolean' }
] as const;
```

## Files to Create

1. Database:
   - Migration file (auto-generated)

2. GraphQL:
   - `app/api/graphql/schemas/wallet-tier.ts`
   - `app/api/graphql/resolvers/wallet-tier.ts`

3. Services:
   - `lib/services/wallet-tiers/index.ts`
   - `lib/services/wallet-tiers/validation.ts`

4. UI Pages:
   - `app/(dashboard)/wallet/tiers/page.tsx`
   - `app/(dashboard)/wallet/tiers/new/page.tsx`
   - `app/(dashboard)/wallet/tiers/[id]/page.tsx`
   - `app/(dashboard)/wallet/users/page.tsx`
   - `app/(dashboard)/wallet/users/[id]/page.tsx`

5. Components:
   - `components/wallet/tier-card.tsx`
   - `components/wallet/tier-form.tsx`
   - `components/wallet/tier-upgrade-dialog.tsx`
   - `components/wallet/kyc-fields-selector.tsx`
   - `components/wallet/kyc-rules-builder.tsx`

6. Seeds:
   - `prisma/seed/wallet-tiers.ts`

7. Tests:
   - `lib/services/wallet-tiers/__tests__/index.test.ts`

## Notes

- All tables prefixed with `fdh_` following project rules
- GraphQL API integrated into existing `/api/graphql` endpoint
- Use shadcn/ui components exclusively
- Prisma for database access
- Follow existing authentication patterns
- Implement proper error handling
- Add rate limiting to mutations
- Log tier changes for audit trail
- **Wallet accounts use phoneNumber as accountNumber** (consistent identifier)
- Context field distinguishes WALLET vs MOBILE_BANKING accounts
- Wallet users can only have ONE wallet account (enforced by unique constraint with context)

## Related Documentation

- PROJECT_RULES.md
- /docs/api/GRAPHQL_SCHEMA.md (to be created)
- /docs/features/AUTHENTICATION_SYSTEM.md

---
*Last Updated: 2025-12-14*
