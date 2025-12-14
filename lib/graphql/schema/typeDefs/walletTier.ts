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
  
  input UpdateMobileUserKYCInput {
    dateOfBirth: DateTime
    occupation: String
    employerName: String
    sourceOfFunds: String
    idNumber: String
    idImage: String
    walletTierId: Int
  }
  
  input TierPositionInput {
    id: Int!
    position: Int!
  }
  
  extend type Query {
    walletTiers: [WalletTier!]!
    walletTier(id: Int!): WalletTier
    defaultWalletTier: WalletTier
    
    mobileUserKYC(mobileUserId: Int!): MobileUserKYC
  }
  
  extend type Mutation {
    createWalletTier(input: CreateWalletTierInput!): WalletTier!
    updateWalletTier(id: Int!, input: UpdateWalletTierInput!): WalletTier!
    deleteWalletTier(id: Int!): Boolean!
    reorderWalletTiers(positions: [TierPositionInput!]!): [WalletTier!]!
    
    updateMobileUserKYC(mobileUserId: Int!, input: UpdateMobileUserKYCInput!): MobileUserKYC!
    upgradeWalletUserTier(mobileUserId: Int!, newTierId: Int!): MobileUserKYC!
  }
`;
