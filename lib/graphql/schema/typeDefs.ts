export const typeDefs = /* GraphQL */ `
  scalar JSON
  scalar DateTime
  scalar Decimal

  enum MobileUserContext {
    MOBILE_BANKING
    WALLET
    VILLAGE_BANKING
    AGENT
    MERCHANT
  }

  enum AlertType {
    LOW_BALANCE
    LARGE_TRANSACTION
    SUSPICIOUS_ACTIVITY
    PAYMENT_DUE
    ACCOUNT_LOGIN
  }

  enum NotificationChannel {
    PUSH
    SMS
    EMAIL
  }

  enum AlertStatus {
    PENDING
    SENT
    FAILED
    ACKNOWLEDGED
  }

  enum TransactionType {
    DEBIT
    CREDIT
    TRANSFER
    WALLET_TRANSFER
    WALLET_DEBIT
    WALLET_CREDIT
    ACCOUNT_TO_WALLET
    WALLET_TO_ACCOUNT
    AIRTIME
  }

  enum SuspicionReason {
    UNUSUAL_LOCATION
    MULTIPLE_FAILED_ATTEMPTS
    NEW_DEVICE_TRANSACTION
  }

  enum PaymentType {
    BILL
    LOAN
    SUBSCRIPTION
    RECURRING
  }

  enum PaymentReminderInterval {
    ONE_WEEK
    THREE_DAYS
    ONE_DAY
  }

  enum LoginAlertMode {
    EVERY_LOGIN
    NEW_DEVICE
    NEW_LOCATION
  }

  enum LoginMethod {
    PASSWORD
    BIOMETRIC
    PASSKEY
    OTP
  }

  enum UserAction {
    DISMISSED
    THIS_WAS_ME
    REPORT_FRAUD
    QUICK_PAY
  }

  enum ResolutionAction {
    CONFIRMED_LEGITIMATE
    FRAUD_REPORTED
    ACCOUNT_LOCKED
  }

  type AdminWebUser {
    id: ID!
    email: String!
    name: String
    isActive: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  input AdminWebCreateUserInput {
    email: String!
    name: String!
  }

  type AdminWebCreateUserResult {
    success: Boolean!
    message: String
    emailSent: Boolean
    user: AdminWebUser
  }

  type AdminWebPasswordLinkResult {
    success: Boolean!
    message: String
    emailSent: Boolean
  }

  input AdminWebLoginInput {
    email: String!
    password: String!
  }

  type AdminWebLoginResult {
    success: Boolean!
    user: AdminWebUser
    token: String
    message: String
  }

  input AdminWebPasswordResetRequestInput {
    email: String!
  }

  input AdminWebPasswordResetInput {
    token: String!
    newPassword: String!
  }

  enum BeneficiaryType {
    FDH_BANK
    EXTERNAL_BANK
    FDH_WALLET
    EXTERNAL_WALLET
    BANK
    WALLET
  }

  type TestResult {
    ok: Boolean!
    message: String

    # Optional HTTP request/response details (used by core banking tests)
    url: String
    method: String
    requestHeadersJson: String
    requestBody: String
    statusCode: Int
    statusText: String
    responseBody: String
  }

  type Account {
    id: ID!
    context: MobileUserContext!
    accountNumber: String!
    accountName: String
    accountType: String
    currency: String!
    categoryId: String
    categoryName: String
    accountStatus: String
    holderName: String
    nickName: String
    balance: String
    workingBalance: String
    frozen: Boolean!
    isHidden: Boolean!
    isPrimary: Boolean!
    isActive: Boolean!
    mobileUserId: String!
    createdAt: String!
    updatedAt: String!
  }

  type MobileUser {
    id: ID!
    context: MobileUserContext!
    username: String
    phoneNumber: String
    customerNumber: String
    accounts: [Account!]!
    primaryAccount: Account
    profile: MobileUserProfile
    walletTier: MobileUserWalletTier
    isActive: Boolean!
    hasSecret: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  type MobileUserWalletTier {
    id: Int!
    name: String!
    position: Int!
    maximumBalance: Float!
    maxTransactionAmount: Float!
    dailyTransactionLimit: Float!
    monthlyTransactionLimit: Float!
    dailyTransactionCount: Int!
    monthlyTransactionCount: Int!
  }

  type MobileUserProfile {
    id: ID!
    mobileUserId: Int!
    firstName: String
    lastName: String
    email: String
    phone: String
    address: String
    city: String
    country: String
    zip: String
    profileImageUrl: String
    createdAt: String!
    updatedAt: String!
  }

  type NotificationSettings {
    smsNotifications: Boolean!
    emailNotifications: Boolean!
    pushNotifications: Boolean!
  }

  input NotificationSettingsInput {
    smsNotifications: Boolean
    emailNotifications: Boolean
    pushNotifications: Boolean
  }

  input CreateMobileUserInput {
    context: MobileUserContext!
    username: String
    phoneNumber: String
    passwordHash: String
  }

  input UpdateMobileUserInput {
    id: ID!
    isActive: Boolean
  }

  input ResetMobileUserPasswordInput {
    userId: ID!
  }

  type ResetMobileUserPasswordResult {
    success: Boolean!
    tempPassword: String!
    message: String
  }

  type RotateTokenResult {
    success: Boolean!
    token: String
    message: String
  }

  type LoginResult {
    success: Boolean!
    user: MobileUser
    token: String
    secret: String
    message: String
    devicePending: Boolean!
    
    # New device verification flow
    requiresVerification: Boolean
    verificationMethod: String
    maskedContact: String
    verificationToken: String
    
    # Admin approval flow
    requiresApproval: Boolean
    
    # App structure based on user's context
    appStructure: [AppScreen!]
  }
  
  type VerifyDeviceOtpResult {
    success: Boolean!
    token: String!
    secret: String
    user: MobileUser
    device: MobileDevice
    message: String
    appStructure: [AppScreen!]
  }
  
  type DeviceLoginAttempt {
    id: ID!
    mobileUserId: Int
    username: String
    context: String
    deviceId: String
    deviceName: String
    deviceModel: String
    deviceOs: String
    ipAddress: String
    location: String
    attemptType: String!
    status: String!
    failureReason: String
    otpCode: String
    otpSentTo: String
    otpSentAt: String
    otpExpiresAt: String
    otpVerifiedAt: String
    otpAttempts: Int!
    verificationToken: String
    attemptedAt: String!
    mobileUser: MobileUser
  }
  
  type LoginAttemptsResult {
    attempts: [DeviceLoginAttempt!]!
    total: Int!
  }

  input LoginInput {
    username: String!
    password: String!
    context: MobileUserContext!
    deviceId: String!
    deviceName: String!
    
    # Optional metadata for tracking
    ipAddress: String
    location: String
    deviceModel: String
    deviceOs: String
  }

  type DatabaseConnection {
    id: ID!
    name: String!
    engine: String!
    host: String!
    port: Int!
    database: String!
    username: String!
    isReadOnly: Boolean!
    createdAt: String!
    updatedAt: String!
    lastTestedAt: String
    lastTestOk: Boolean
    lastTestMessage: String
  }

  input DatabaseConnectionInput {
    name: String!
    engine: String!
    host: String!
    port: Int!
    database: String!
    username: String!
    password: String
    isReadOnly: Boolean
  }

  enum CoreBankingAuthType {
    BASIC
    BEARER
  }

  type CoreBankingConnection {
    id: ID!
    name: String!
    username: String!
    baseUrl: String!
    isActive: Boolean!
    authType: CoreBankingAuthType!
    createdAt: String!
    updatedAt: String!
    lastTestedAt: String
    lastTestOk: Boolean
    lastTestMessage: String
    endpoints: [CoreBankingEndpoint!]!
  }

  input CoreBankingConnectionInput {
    name: String!
    username: String
    password: String
    baseUrl: String!
    isActive: Boolean
    authType: CoreBankingAuthType
    token: String
  }

  type CoreBankingEndpoint {
    id: ID!
    connectionId: Int!
    name: String!
    method: String!
    path: String!
    bodyTemplate: String
    isActive: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  input CoreBankingEndpointInput {
    connectionId: Int!
    name: String!
    method: String!
    path: String!
    bodyTemplate: String
    isActive: Boolean
  }

  type DatabaseTable {
    schema: String!
    name: String!
  }

  type TableColumn {
    name: String!
    dataType: String!
    isNullable: Boolean
    defaultValue: String
  }

  type TableRow {
    values: [String!]!
  }

  type TableData {
    columns: [TableColumn!]!
    rows: [TableRow!]!
  }

  enum MigrationStatus {
    PENDING
    RUNNING
    COMPLETED
    FAILED
  }

  type Migration {
    id: ID!
    name: String!
    description: String
    sourceConnectionId: Int!
    sourceConnectionName: String!
    sourceQuery: String!
    targetTable: String!
    targetInsertQuery: String!
    status: MigrationStatus!
    lastRunAt: String
    lastRunSuccess: Boolean
    lastRunMessage: String
    lastRunRowsAffected: Int
    createdAt: String!
    updatedAt: String!
    
    isRecurring: Boolean!
    cronExpression: String
    nextRunAt: String
  }

  input MigrationInput {
    name: String!
    description: String
    sourceConnectionId: Int!
    sourceQuery: String!
    targetTable: String!
    targetInsertQuery: String!
  }

  type MigrationRunResult {
    ok: Boolean!
    message: String
    rowsAffected: Int
  }

  enum DuplicateStrategy {
    FAIL_ON_DUPLICATE
    SKIP_DUPLICATES
    UPDATE_EXISTING
  }

  type Beneficiary {
    id: ID!
    userId: Int!
    user: MobileUser
    name: String!
    beneficiaryType: BeneficiaryType!
    phoneNumber: String
    accountNumber: String
    bankCode: String
    bankName: String
    branch: String
    description: String
    isActive: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  input BeneficiaryInput {
    userId: Int # Optional - will be ignored and overridden with authenticated user's ID
    name: String!
    beneficiaryType: BeneficiaryType!
    phoneNumber: String
    accountNumber: String
    bankCode: String
    bankName: String
    branch: String
    description: String
    isActive: Boolean
  }

  type MobileDevice {
    id: ID!
    name: String
    model: String
    os: String
    deviceId: String
    credentialId: String!
    transports: [String!]
    fcmToken: String
    isActive: Boolean!
    isPrimary: Boolean!
    lastUsedAt: String
    createdAt: String!
    updatedAt: String!
  }

  type OtpVerificationResponse {
    success: Boolean!
    verificationToken: String
    maskedContact: String
    verificationMethod: String
  }
  
  type TriggerAccountDiscoveryResult {
    success: Boolean!
    message: String
    accountsAdded: Int!
    accountsDeactivated: Int!
  }

  type PasskeyRegistrationOptions {
    rp: String!
    user: String!
    challenge: String! 
    pubKeyCredParams: [String!]!
    timeout: Int
    attestation: String
    authenticatorSelection: String
    excludeCredentials: [String!]
  }

  type PasskeyAuthenticationOptions {
    challenge: String!
    rpId: String!
    allowCredentials: [String!] 
    timeout: Int
    userVerification: String
  }

  type PasskeyRegistrationResult {
    success: Boolean!
    device: MobileDevice
  }

  type BackupCreator {
    userId: String!
    email: String!
    name: String!
  }

  type Backup {
    filename: String!
    sizeBytes: String!
    createdAt: String!
    storageUrl: String!
    type: String!
    createdBy: BackupCreator
  }

  type BackupSchedule {
    id: ID!
    enabled: Boolean!
    time: String!
    timeZone: String!
    isRunning: Boolean!
    lastRunAt: String
    lastRunDate: String
    createdAt: String!
    updatedAt: String!
  }

  input BackupScheduleInput {
    enabled: Boolean
    time: String
    timeZone: String
  }

  type Query {
    mobileUsers(context: MobileUserContext): [MobileUser!]!
    mobileUserDevices(userId: ID!): [MobileDevice!]!
    mobileUserAccounts(userId: ID!): [Account!]!
    allMobileUserAccounts: [Account!]!
    mobileUserAccount(accountNumber: String!): Account
    adminWebUsers: [AdminWebUser!]!
    backups: [Backup!]!
    backupSchedule: BackupSchedule!
    loginAttempts(
      limit: Int
      offset: Int
      status: String
      username: String
    ): LoginAttemptsResult!
    dbConnections: [DatabaseConnection!]!
    dbConnection(id: ID!): DatabaseConnection
    dbConnectionTables(id: ID!): [DatabaseTable!]!
    dbConnectionTableData(
      id: ID!
      schema: String!
      table: String!
    ): TableData!
    previewSourceQuery(connectionId: Int!, query: String!): TableData!
    appDatabaseTables: [DatabaseTable!]!
    appTableColumns(table: String!): [TableColumn!]!
    migrations: [Migration!]!
    migration(id: ID!): Migration
    coreBankingConnections: [CoreBankingConnection!]!
    coreBankingConnection(id: ID!): CoreBankingConnection
    coreBankingEndpoints(connectionId: Int!): [CoreBankingEndpoint!]!
    coreBankingEndpoint(id: ID!): CoreBankingEndpoint
    beneficiaries(userId: ID!, type: BeneficiaryType): [Beneficiary!]!
    beneficiary(id: ID!): Beneficiary
  }

  type Mutation {
    login(input: LoginInput!): LoginResult!
    adminWebLogin(input: AdminWebLoginInput!): AdminWebLoginResult!
    adminWebCreateUser(input: AdminWebCreateUserInput!): AdminWebCreateUserResult!
    adminWebSendPasswordResetLink(userId: ID!): AdminWebPasswordLinkResult!
    adminWebRequestPasswordReset(
      input: AdminWebPasswordResetRequestInput!
    ): Boolean!
    adminWebResetPassword(input: AdminWebPasswordResetInput!): Boolean!
    
    createMobileUser(input: CreateMobileUserInput!): MobileUser!
    updateMobileUser(input: UpdateMobileUserInput!): MobileUser!
    resetMobileUserPassword(input: ResetMobileUserPasswordInput!): ResetMobileUserPasswordResult!

    createDbConnection(input: DatabaseConnectionInput!): DatabaseConnection!
    updateDbConnection(id: ID!, input: DatabaseConnectionInput!): DatabaseConnection!
    deleteDbConnection(id: ID!): Boolean!
    testDbConnection(id: ID!): TestResult!

    createCoreBankingConnection(input: CoreBankingConnectionInput!): CoreBankingConnection!
    updateCoreBankingConnection(id: ID!, input: CoreBankingConnectionInput!): CoreBankingConnection!
    deleteCoreBankingConnection(id: ID!): Boolean!
    testCoreBankingConnection(id: ID!): TestResult!

    # Test a single core banking endpoint, with optional JSON-encoded variables
    # used to render {{placeholders}} in path and bodyTemplate
    testCoreBankingEndpoint(id: ID!, variablesJson: String): TestResult!

    createCoreBankingEndpoint(input: CoreBankingEndpointInput!): CoreBankingEndpoint!
    updateCoreBankingEndpoint(id: ID!, input: CoreBankingEndpointInput!): CoreBankingEndpoint!
    deleteCoreBankingEndpoint(id: ID!): Boolean!

    createMigration(input: MigrationInput!): Migration!
    updateMigration(id: ID!, input: MigrationInput!): Migration!
    deleteMigration(id: ID!): Boolean!
    runMigration(id: ID!, duplicateStrategy: DuplicateStrategy): MigrationRunResult!
    # Recurring Migrations
    scheduleMigration(id: ID!, cron: String!): Migration!
    unscheduleMigration(id: ID!): Migration!

    createBeneficiary(input: BeneficiaryInput!): Beneficiary!
    updateBeneficiary(id: ID!, input: BeneficiaryInput!): Beneficiary!
    deleteBeneficiary(id: ID!): Boolean!
    toggleBeneficiaryStatus(id: ID!): Beneficiary!

    # Passkey & Device Management
    registerPasskeyStart(username: String!, context: MobileUserContext!): String! # Returns JSON string of options
    registerPasskeyComplete(username: String!, context: MobileUserContext!, response: String!, deviceInfo: String): PasskeyRegistrationResult!
    
    loginWithPasskeyStart(username: String!, context: MobileUserContext!): String! # Returns JSON string of options
    loginWithPasskeyComplete(username: String!, context: MobileUserContext!, response: String!): LoginResult!
    
    revokeDevice(deviceId: ID!): Boolean!
    approveDevice(deviceId: ID!): Boolean!
    deleteDevice(deviceId: ID!): Boolean!

    # Backups
    createBackup: Backup!
    restoreBackup(filename: String!): Boolean!
    deleteBackup(filename: String!): Boolean!

    updateBackupSchedule(input: BackupScheduleInput!): BackupSchedule!

    # Mobile User Accounts
    linkAccountToUser(
      userId: ID!
      accountNumber: String!
      accountName: String
      accountType: String
      isPrimary: Boolean
    ): Account!
    unlinkAccountFromUser(userId: ID!, accountId: ID!): Boolean!
    setPrimaryAccount(userId: ID!, accountId: ID!): Boolean!
    updateAccount(accountId: ID!, accountName: String, accountType: String): Account!
    
    # Account management for mobile users
    setAccountNickname(accountId: ID!, nickName: String!): Account!
    freezeAccount(accountId: ID!): Account!
    unfreezeAccount(accountId: ID!): Account!
    hideAccount(accountId: ID!): Account!
    unhideAccount(accountId: ID!): Account!
    
    # Device OTP Verification
    verifyDeviceOtp(verificationToken: String!, otpCode: String!): VerifyDeviceOtpResult!
    resendDeviceOtp(verificationToken: String!): Boolean!
    
    # Account Discovery
    triggerAccountDiscovery(userId: ID!): TriggerAccountDiscoveryResult!
  }

  type Subscription {
    mobileUserCreated: MobileUser!
    mobileUserUpdated: MobileUser!
    deviceApprovalStatus(deviceId: String!): DeviceApprovalResult!
    accountsUpdated(userId: ID!): AccountsUpdatePayload!
  }

  type DeviceApprovalResult {
    deviceId: String!
    status: DeviceApprovalStatus!
    message: String
  }

  enum DeviceApprovalStatus {
    APPROVED
    DENIED
  }
  
  type AccountsUpdatePayload {
    userId: ID!
    accounts: [Account!]!
    timestamp: String!
  }

  type AccountCategory {
    id: ID!
    category: String!
    categoryName: String
    displayToMobile: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  input CreateAccountCategoryInput {
    category: String!
    displayToMobile: Boolean
  }

  input UpdateAccountCategoryInput {
    id: ID!
    category: String
    displayToMobile: Boolean
  }

  extend type Query {
    accountCategories: [AccountCategory!]!
    accountCategory(id: ID!): AccountCategory
  }

  extend type Mutation {
    createAccountCategory(input: CreateAccountCategoryInput!): AccountCategory!
    updateAccountCategory(input: UpdateAccountCategoryInput!): AccountCategory!
    deleteAccountCategory(id: ID!): Boolean!
    createMobileUserProfile(input: CreateMobileUserProfileInput!): MobileUserProfile!
    updateMobileUserProfile(input: UpdateMobileUserProfileInput!): MobileUserProfile!
    deleteMobileUserProfile(mobileUserId: ID!): Boolean!
  }

  input CreateMobileUserProfileInput {
    mobileUserId: Int!
    firstName: String
    lastName: String
    email: String
    phone: String
    address: String
    city: String
    country: String
    zip: String
  }

  input UpdateMobileUserProfileInput {
    mobileUserId: Int!
    firstName: String
    lastName: String
    email: String
    phone: String
    address: String
    city: String
    country: String
    zip: String
  }

  type Form {
    id: ID!
    name: String!
    description: String
    category: String
    schema: JSON!
    isActive: Boolean!
    createdBy: Int!
    version: Int!
    createdAt: String!
    updatedAt: String!
  }

  input CreateFormInput {
    name: String!
    description: String
    category: String
    schema: JSON!
    isActive: Boolean
  }

  input UpdateFormInput {
    name: String
    description: String
    category: String
    schema: JSON
    isActive: Boolean
  }

  type FormsResult {
    forms: [Form!]!
    total: Int!
  }

  extend type Query {
    forms(
      isActive: Boolean
      category: String
      page: Int
      limit: Int
    ): FormsResult!
    form(id: ID!): Form
  }

  extend type Mutation {
    createForm(input: CreateFormInput!): Form!
    updateForm(id: ID!, input: UpdateFormInput!): Form!
    deleteForm(id: ID!): Boolean!
    toggleFormActive(id: ID!): Form!
  }

  extend type Query {
    appScreens(
      context: MobileUserContext
      page: Int
      limit: Int
    ): AppScreensResult!
    appScreen(id: ID!): AppScreen
    appScreenPages(screenId: ID!): [AppScreenPage!]!
    
    workflows(page: Int, limit: Int, isActive: Boolean): WorkflowsResult!
    workflow(id: ID!): Workflow
    workflowSteps(workflowId: ID!): [WorkflowStep!]!
    workflowStep(id: ID!): WorkflowStep
    pageWorkflows(pageId: ID!): [AppScreenPageWorkflow!]!
    
    workflowExecution(id: ID!): WorkflowExecution
    userWorkflowExecutions(userId: ID!, status: WorkflowExecutionStatus, limit: Int): [WorkflowExecution!]!
  }

  extend type Mutation {
    createAppScreen(input: CreateAppScreenInput!): AppScreen!
    updateAppScreen(id: ID!, input: UpdateAppScreenInput!): AppScreen!
    deleteAppScreen(id: ID!): Boolean!
    reorderAppScreens(context: MobileUserContext!, screenIds: [ID!]!): [AppScreen!]!
    
    createAppScreenPage(input: CreateAppScreenPageInput!): AppScreenPage!
    updateAppScreenPage(id: ID!, input: UpdateAppScreenPageInput!): AppScreenPage!
    deleteAppScreenPage(id: ID!): Boolean!
    reorderAppScreenPages(screenId: ID!, pageIds: [ID!]!): [AppScreenPage!]!
    
    createWorkflow(input: CreateWorkflowInput!): Workflow!
    createWorkflowWithSteps(input: CreateWorkflowWithStepsInput!): Workflow!
    updateWorkflow(id: ID!, input: UpdateWorkflowInput!): Workflow!
    deleteWorkflow(id: ID!): Boolean!
    
    createWorkflowStep(input: CreateWorkflowStepInput!): WorkflowStep!
    updateWorkflowStep(id: ID!, input: UpdateWorkflowStepInput!): WorkflowStep!
    deleteWorkflowStep(id: ID!): Boolean!
    reorderWorkflowSteps(workflowId: ID!, stepIds: [ID!]!): [WorkflowStep!]!
    
    attachWorkflowToPage(input: AttachWorkflowToPageInput!): AppScreenPageWorkflow!
    detachWorkflowFromPage(id: ID!): Boolean!
    updatePageWorkflow(id: ID!, input: UpdatePageWorkflowInput!): AppScreenPageWorkflow!
    reorderPageWorkflows(pageId: ID!, workflowIds: [ID!]!): [AppScreenPageWorkflow!]!
    
    startWorkflowExecution(workflowId: ID!, pageId: ID!, initialContext: JSON): WorkflowExecution!
    executeWorkflowStep(executionId: ID!, stepId: ID!, input: JSON, timing: TriggerTiming!): StepExecutionResponse!
    completeWorkflowExecution(executionId: ID!): WorkflowCompletionResult!
    cancelWorkflowExecution(executionId: ID!, reason: String): WorkflowExecution!
  }

  type DeviceSession {
    id: ID!
    deviceId: String!
    lastActivityAt: String!
    createdAt: String!
    expiresAt: String!
    ipAddress: String
    userAgent: String
  }

  input SecureRotateTokenInput {
    currentToken: String!
    deviceId: String!
  }

  type AppScreen {
    id: ID!
    name: String!
    context: MobileUserContext!
    icon: String!
    order: Int!
    isActive: Boolean!
    isTesting: Boolean!
    pages: [AppScreenPage!]!
    createdAt: String!
    updatedAt: String!
  }

  type AppScreenPage {
    id: ID!
    name: String!
    icon: String!
    order: Int!
    isActive: Boolean!
    isTesting: Boolean!
    screenId: String!
    screen: AppScreen!
    createdAt: String!
    updatedAt: String!
  }

  input CreateAppScreenInput {
    name: String!
    context: MobileUserContext!
    icon: String!
    order: Int
    isActive: Boolean
    isTesting: Boolean
  }

  input UpdateAppScreenInput {
    name: String
    icon: String
    order: Int
    isActive: Boolean
    isTesting: Boolean
  }

  input CreateAppScreenPageInput {
    name: String!
    icon: String!
    order: Int
    isActive: Boolean
    isTesting: Boolean
    screenId: String!
  }

  input UpdateAppScreenPageInput {
    name: String
    icon: String
    order: Int
    isActive: Boolean
    isTesting: Boolean
  }

  type AppScreensResult {
    screens: [AppScreen!]!
    total: Int!
  }

  # ========================================
  # WORKFLOWS
  # ========================================

  enum WorkflowStepType {
    FORM
    API_CALL
    VALIDATION
    CONFIRMATION
    DISPLAY
    REDIRECT
    OTP
    POST_TRANSACTION
  }

  enum StepExecutionMode {
    CLIENT_ONLY
    SERVER_SYNC
    SERVER_ASYNC
    SERVER_VALIDATION
  }

  enum TriggerTiming {
    BEFORE_STEP
    AFTER_STEP
    BOTH
  }

  enum WorkflowExecutionStatus {
    PENDING
    IN_PROGRESS
    COMPLETED
    FAILED
    CANCELLED
  }

  type WorkflowStep {
    id: ID!
    workflowId: String!
    type: WorkflowStepType!
    label: String!
    order: Int!
    config: JSON!
    validation: JSON
    isActive: Boolean!
    executionMode: StepExecutionMode!
    triggerTiming: TriggerTiming
    triggerEndpoint: String
    triggerConfig: JSON
    timeoutMs: Int
    retryConfig: JSON
    createdAt: String!
    updatedAt: String!
    workflow: Workflow!
  }

  type WorkflowExecution {
    id: ID!
    workflowId: String!
    userId: String!
    sessionId: String!
    currentStepId: String
    status: WorkflowExecutionStatus!
    finalResult: JSON
    error: String
    startedAt: String!
    completedAt: String
    workflow: Workflow
  }

  type WorkflowError {
    title: String
    message: String
    code: String
    type: String
    details: JSON
  }

  type StepExecutionResponse {
    success: Boolean!
    result: JSON
    shouldProceed: Boolean!
    error: String
    structuredError: WorkflowError
  }

  type WorkflowCompletionResult {
    success: Boolean!
    result: JSON!
    executionId: ID!
    error: String
    structuredError: WorkflowError
  }

  type Workflow {
    id: ID!
    name: String!
    description: String
    isActive: Boolean!
    version: Int!
    config: JSON
    createdAt: String!
    updatedAt: String!
    steps: [WorkflowStep!]!
    screenPages: [AppScreenPageWorkflow!]!
  }

  type AppScreenPageWorkflow {
    id: ID!
    pageId: String!
    workflowId: String!
    order: Int!
    isActive: Boolean!
    configOverride: JSON
    createdAt: String!
    updatedAt: String!
    page: AppScreenPage!
    workflow: Workflow!
  }

  type WorkflowsResult {
    workflows: [Workflow!]!
    total: Int!
  }

  input CreateWorkflowInput {
    name: String!
    description: String
    isActive: Boolean
  }

  input UpdateWorkflowInput {
    name: String
    description: String
    isActive: Boolean
  }

  input CreateWorkflowStepInput {
    workflowId: ID!
    type: WorkflowStepType!
    label: String!
    order: Int
    config: JSON!
    validation: JSON
    isActive: Boolean
    executionMode: StepExecutionMode
    triggerTiming: TriggerTiming
    triggerEndpoint: String
    triggerConfig: JSON
    timeoutMs: Int
    retryConfig: JSON
  }

  input UpdateWorkflowStepInput {
    type: WorkflowStepType
    label: String
    order: Int
    config: JSON
    validation: JSON
    isActive: Boolean
    executionMode: StepExecutionMode
    triggerTiming: TriggerTiming
    triggerEndpoint: String
    triggerConfig: JSON
    timeoutMs: Int
    retryConfig: JSON
  }

  input CreateWorkflowWithStepsInput {
    name: String!
    description: String
    isActive: Boolean
    steps: [StepInput!]!
  }

  input StepInput {
    type: WorkflowStepType!
    label: String!
    order: Int!
    config: JSON!
    validation: JSON
    isActive: Boolean
  }

  input AttachWorkflowToPageInput {
    pageId: String!
    workflowId: String!
    order: Int
    isActive: Boolean
    configOverride: JSON
  }

  input UpdatePageWorkflowInput {
    order: Int
    isActive: Boolean
    configOverride: JSON
  }

  type RevokeSessionsResult {
    success: Boolean!
    message: String
  }

  extend type Query {
    activeSessions(userId: ID!): [DeviceSession!]!
  }

  extend type Mutation {
    secureRotateUserToken(input: SecureRotateTokenInput!): RotateTokenResult!
    revokeAllUserSessions(userId: ID!): RevokeSessionsResult!
    revokeDeviceSessions(userId: ID!, deviceId: String!): RevokeSessionsResult!
  }

  # ========================================
  # MOBILE API (JWT Authentication)
  # ========================================

  type MyDevice {
    id: ID!
    deviceId: String!
    name: String
    model: String
    os: String
    isActive: Boolean!
    isPrimary: Boolean!
    isCurrent: Boolean!
    lastUsedAt: String
    credentialId: String
    createdAt: String!
    updatedAt: String!
    activeSessions: [MySession!]!
  }

  type MySession {
    id: ID!
    deviceId: String!
    lastActivityAt: String!
    createdAt: String!
    expiresAt: String!
    ipAddress: String
    isActive: Boolean!
    isCurrent: Boolean!
  }

  input UpdateMyProfileInput {
    firstName: String
    lastName: String
    email: String
    phone: String
    address: String
    city: String
    country: String
    zip: String
    profileImageUrl: String
  }


  extend type Query {
    # Device & Session Management
    myDevices: [MyDevice!]!
    mySessions: [MySession!]!
    
    # Profile & Accounts
    myProfile: MobileUserProfile
    myAccounts: [Account!]!
    myPrimaryAccount: Account
    
    # Beneficiaries
    myBeneficiaries(type: BeneficiaryType): [Beneficiary!]!
  }

  extend type Mutation {
    # Profile
    updateMyProfile(input: UpdateMyProfileInput!): MobileUserProfile!
    
    # Device Management
    revokeMyDevice(deviceId: String!): Boolean!
    renameMyDevice(deviceId: String!, name: String!): MyDevice!
    approveMyDevice(deviceId: String!): Boolean!
    denyMyDevice(deviceId: String!): Boolean!
    
    # Multi-Device Session
    toggleMultiDeviceSession(enabled: Boolean!): Boolean!
    
    # Session Management
    revokeMySession(sessionId: String!): Boolean!
    revokeAllMyOtherSessions: RevokeSessionsResult!
    
    # Password Change (Authenticated)
    requestPasswordChangeOtp: RequestPasswordChangeOtpResult!
    changePassword(input: ChangePasswordInput!): ChangePasswordResult!
  }

  #  ========================================
  # CHANGE PASSWORD (Authenticated)
  # ========================================
  
  type RequestPasswordChangeOtpResult {
    success: Boolean!
    message: String!
  }

  input ChangePasswordInput {
    oldPassword: String!
    newPassword: String!
    confirmPassword: String!
    otp: String!
  }

  type ChangePasswordResult {
    success: Boolean!
    message: String!
  }

  # ========================================
  # PASSWORD RESET
  # ========================================

  input InitiatePasswordResetInput {
    username: String!
    secret: String!
    phoneNumber: String
    deviceId: String!
    deviceName: String
  }

  type InitiatePasswordResetResult {
    success: Boolean!
    message: String!
    resetToken: String
    otpSentTo: String
  }

  input VerifyResetOTPInput {
    resetToken: String!
    otp: String!
    deviceId: String!
  }

  type VerifyResetOTPResult {
    success: Boolean!
    message: String!
    verifiedToken: String
  }

  input CompletePasswordResetInput {
    verifiedToken: String!
    newPassword: String!
    deviceId: String!
  }

  type CompletePasswordResetResult {
    success: Boolean!
    message: String!
    token: String
  }

  extend type Mutation {
    initiatePasswordReset(input: InitiatePasswordResetInput!): InitiatePasswordResetResult!
    verifyResetOTP(input: VerifyResetOTPInput!): VerifyResetOTPResult!
    completePasswordReset(input: CompletePasswordResetInput!): CompletePasswordResetResult!
  }

  # ========================================
  # TRANSACTIONS (T24)
  # ========================================

  type T24Transaction {
    transactionId: ID!
    accountNumber: String!
    transactionDate: String!
    valueDate: String!
    amount: String!
    debitAmount: String
    creditAmount: String
    type: String!
    description: String!
    reference: String!
    balance: String
    currency: String!
    status: String
    narrative: String
  }

  type T24TransactionConnection {
    transactions: [T24Transaction!]!
    totalCount: Int!
    accountNumber: String!
    status: String!
  }

  extend type Query {
    # Get transactions for a specific account from T24
    accountTransactions(accountNumber: String!): T24TransactionConnection!
  }

  # ============================================
  # Account Alerts Types
  # ============================================

  type AccountAlertSettings {
    id: ID!
    mobileUserId: Int!
    accountNumber: String!

    # Low Balance Alert
    lowBalanceEnabled: Boolean!
    lowBalanceThreshold: String
    lowBalanceChannels: [NotificationChannel!]!

    # Large Transaction Alert
    largeTransactionEnabled: Boolean!
    largeTransactionThreshold: String
    largeTransactionChannels: [NotificationChannel!]!
    largeTransactionDebitOnly: Boolean!

    # Suspicious Activity Alert
    alertUnusualLocation: Boolean!
    alertMultipleFailedAttempts: Boolean!
    alertNewDeviceTransaction: Boolean!
    suspiciousActivityChannels: [NotificationChannel!]!

    # Payment Due Alert
    paymentDueEnabled: Boolean!
    paymentDueChannels: [NotificationChannel!]!
    paymentReminderInterval: PaymentReminderInterval!

    # Login Alert
    loginAlertMode: LoginAlertMode!
    loginAlertChannels: [NotificationChannel!]!

    # Quiet Hours
    quietHoursEnabled: Boolean!
    quietHoursStart: String
    quietHoursEnd: String

    createdAt: String!
    updatedAt: String!
  }

  type AccountAlert {
    id: ID!
    mobileUserId: Int!
    accountNumber: String
    alertType: AlertType!
    alertData: JSON!
    status: AlertStatus!
    channelsSent: [NotificationChannel!]!
    sentAt: String
    deliveryStatus: JSON
    acknowledgedAt: String
    userAction: UserAction
    triggeredAt: String!
    createdAt: String!
    updatedAt: String!
  }

  type SuspiciousActivityLog {
    id: ID!
    alertId: Int
    mobileUserId: Int!
    accountNumber: String
    suspicionReason: SuspicionReason!
    riskScore: Int!
    detectionDetails: JSON!
    relatedTransactionIds: [String!]!
    deviceId: String
    ipAddress: String
    location: String
    isResolved: Boolean!
    resolvedAt: String
    resolutionAction: ResolutionAction
    adminNotes: String
    detectedAt: String!
    createdAt: String!
  }

  type AccountAlertsResult {
    alerts: [AccountAlert!]!
    totalCount: Int!
  }

  input AccountAlertSettingsInput {
    accountNumber: String!

    # Low Balance Alert
    lowBalanceEnabled: Boolean
    lowBalanceThreshold: String
    lowBalanceChannels: [NotificationChannel!]

    # Large Transaction Alert
    largeTransactionEnabled: Boolean
    largeTransactionThreshold: String
    largeTransactionChannels: [NotificationChannel!]
    largeTransactionDebitOnly: Boolean

    # Suspicious Activity Alert
    alertUnusualLocation: Boolean
    alertMultipleFailedAttempts: Boolean
    alertNewDeviceTransaction: Boolean
    suspiciousActivityChannels: [NotificationChannel!]

    # Payment Due Alert
    paymentDueEnabled: Boolean
    paymentDueChannels: [NotificationChannel!]
    paymentReminderInterval: PaymentReminderInterval

    # Login Alert
    loginAlertMode: LoginAlertMode
    loginAlertChannels: [NotificationChannel!]

    # Quiet Hours
    quietHoursEnabled: Boolean
    quietHoursStart: String
    quietHoursEnd: String
  }

  extend type Query {
    # Get alert settings for an account
    accountAlertSettings(accountNumber: String!): AccountAlertSettings

    # Get alert history
    accountAlerts(
      accountNumber: String
      alertType: AlertType
      startDate: String
      endDate: String
      limit: Int
      offset: Int
    ): AccountAlertsResult!

    # Get suspicious activity logs
    suspiciousActivities(
      mobileUserId: Int
      isResolved: Boolean
      limit: Int
      offset: Int
    ): [SuspiciousActivityLog!]!

    myNotificationSettings: NotificationSettings!
  }

  extend type Mutation {
    # Update alert settings
    updateAccountAlertSettings(
      settings: AccountAlertSettingsInput!
    ): AccountAlertSettings!

    # Acknowledge alert
    acknowledgeAlert(alertId: ID!, action: UserAction): Boolean!

    # Test alert (for user to verify channels)
    testAlert(accountNumber: String!, alertType: AlertType!): Boolean!

    # Resolve suspicious activity
    resolveSuspiciousActivity(
      logId: ID!
      action: ResolutionAction!
      adminNotes: String
    ): Boolean!

    updateMyNotificationSettings(input: NotificationSettingsInput!): NotificationSettings!
  }

  # ==========================================
  # BILLER TYPES (Mobile Integration)
  # ==========================================

  enum BillerType {
    REGISTER_GENERAL
    BWB_POSTPAID
    LWB_POSTPAID
    SRWB_POSTPAID
    SRWB_PREPAID
    MASM
    AIRTEL_VALIDATION
    TNM_BUNDLES
  }

  enum BillerTransactionStatus {
    PENDING
    PROCESSING
    COMPLETED
    FAILED
  }

  type BillerInfo {
    type: BillerType!
    name: String!
    displayName: String!
    description: String
    isActive: Boolean!
    features: BillerFeatures!
    validationRules: BillerValidationRules!
    supportedCurrencies: [String!]!
    defaultCurrency: String!
  }

  type BillerFeatures {
    supportsInvoice: Boolean!
    supportsBalanceCheck: Boolean!
    requiresTwoStep: Boolean!
    supportsAccountLookup: Boolean!
    isBundleBased: Boolean
    validationOnly: Boolean
    requiresAccountType: Boolean
  }

  type BillerValidationRules {
    accountNumberFormat: String
    minAmount: Float
    maxAmount: Float
  }

  type AccountLookupResult {
    accountNumber: String!
    customerName: String!
    balance: String
    status: String!
    billerDetails: JSON
  }

  type BillerPaymentResult {
    success: Boolean!
    transactionId: String
    externalReference: String
    message: String
    transaction: BillerTransaction!
  }

  type BillerTransaction {
    id: ID!
    ourTransactionId: String!
    billerType: BillerType!
    billerName: String!
    accountNumber: String!
    amount: Float
    currency: String!
    status: BillerTransactionStatus!
    transactionType: String!
    accountType: String
    customerAccountName: String
    errorMessage: String
    errorCode: String
    requestPayload: JSON
    responsePayload: JSON
    completedAt: String
    createdAt: String!
    updatedAt: String!
  }

  type BillerTransactionsResult {
    transactions: [BillerTransaction!]!
    total: Int!
    hasMore: Boolean!
  }

  type BillerInvoice {
    invoiceNumber: String!
    accountNumber: String!
    amount: String!
    dueDate: String
    description: String
    details: JSON
  }

  type BillerBundle {
    bundleId: String!
    name: String!
    description: String!
    amount: String!
    validity: String
    dataAmount: String
  }

  input BillerAccountLookupInput {
    billerType: BillerType!
    accountNumber: String!
    accountType: String
  }

  input BillerPaymentInput {
    billerType: BillerType!
    accountNumber: String!
    amount: Float!
    currency: String
    accountType: String
    creditAccount: String
    creditAccountType: String
    debitAccount: String!
    debitAccountType: String!
    customerAccountNumber: String
    customerAccountName: String
    metadata: JSON
  }

  input BillerInvoiceInput {
    billerType: BillerType!
    accountNumber: String!
  }

  input BillerInvoiceConfirmInput {
    billerType: BillerType!
    invoiceNumber: String!
    accountNumber: String!
    amount: Float!
    currency: String
    debitAccount: String!
    debitAccountType: String!
  }

  input BillerBundleInput {
    bundleId: String!
  }

  input BillerBundlePurchaseInput {
    bundleId: String!
    phoneNumber: String!
    amount: Float!
    debitAccount: String!
    debitAccountType: String!
  }

  extend type Query {
    # Get available billers for current user
    availableBillers: [BillerInfo!]!
    
    # Get specific biller info
    billerInfo(type: BillerType!): BillerInfo
    
    # Lookup account before payment
    billerAccountLookup(input: BillerAccountLookupInput!): AccountLookupResult!
    
    # Get invoice details (for two-step billers)
    billerInvoice(input: BillerInvoiceInput!): BillerInvoice!
    
    # Get bundle details
    billerBundle(input: BillerBundleInput!): BillerBundle!
    
    # Get user's biller transactions
    myBillerTransactions(
      billerType: BillerType
      status: BillerTransactionStatus
      limit: Int
      offset: Int
    ): BillerTransactionsResult!
    
    # Get specific transaction
    billerTransaction(id: ID!): BillerTransaction
  }

  extend type Mutation {
    # Process biller payment
    billerPayment(input: BillerPaymentInput!): BillerPaymentResult!
    
    # Confirm invoice payment (for two-step billers)
    billerInvoiceConfirm(input: BillerInvoiceConfirmInput!): BillerPaymentResult!
    
    # Purchase bundle
    billerBundlePurchase(input: BillerBundlePurchaseInput!): BillerPaymentResult!
    
    # Retry failed transaction
    billerRetryTransaction(transactionId: ID!): BillerPaymentResult!
  }
  
  # ============================================
  # Wallet Tiers System
  # ============================================
  
  type WalletTier {
    id: Int!
    name: String!
    description: String
    position: Int!
    isDefault: Boolean!
    
    minimumBalance: Float!
    maximumBalance: Float!
    maximumCreditLimit: Float!
    maximumDebtLimit: Float!
    
    minTransactionAmount: Float!
    maxTransactionAmount: Float!
    dailyTransactionLimit: Float!
    monthlyTransactionLimit: Float!
    
    dailyTransactionCount: Int!
    monthlyTransactionCount: Int!
    
    requiredKycFields: [String!]!
    kycRules: JSON!
    
    createdAt: DateTime!
    updatedAt: DateTime!
    
    walletUsersCount: Int!
  }
  
  type MobileUserKYC {
    id: Int!
    mobileUserId: Int!
    
    walletTierId: Int
    walletTier: WalletTier
    
    dateOfBirth: DateTime
    occupation: String
    employerName: String
    sourceOfFunds: String
    idNumber: String
    idImage: String
    
    kycComplete: Boolean!
    kycVerifiedAt: DateTime
    
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
  
  # ============================================
  # TRANSACTION SYSTEM (PROXY)
  # ============================================
  
  enum TransactionStatus {
    PENDING
    PROCESSING
    COMPLETED
    FAILED
    FAILED_PERMANENT
    REVERSED
  }

  enum TransactionSource {
    MOBILE_BANKING
    WALLET
    ADMIN
    API
  }

  type Transaction {
    id: ID!
    reference: String!
    type: TransactionType!
    source: TransactionSource!
    status: TransactionStatus!

    transferType: TransferType
    transferContext: MobileUserContext
    
    amount: Decimal!
    currency: String!
    description: String!
    
    fromAccountId: Int
    fromAccountNumber: String
    
    toAccountId: Int
    toAccountNumber: String
    
    t24Reference: String
    t24Response: JSON
    
    retryCount: Int!
    maxRetries: Int!
    nextRetryAt: DateTime
    
    errorMessage: String
    errorCode: String
    
    isReversal: Boolean!
    
    statusHistory: [TransactionStatusHistory!]!
    
    createdAt: DateTime!
    updatedAt: DateTime!
    completedAt: DateTime
  }

  type TransactionStatusHistory {
    id: ID!
    fromStatus: TransactionStatus!
    toStatus: TransactionStatus!
    reason: String
    retryNumber: Int
    createdAt: DateTime!
  }

  enum TransferType {
    FDH_BANK
    EXTERNAL_BANK
    FDH_WALLET
    EXTERNAL_WALLET
    SELF
  }

  input CreateTransactionInput {
    type: TransactionType!
    source: TransactionSource
    context: MobileUserContext
    transferType: TransferType
    amount: Decimal!
    description: String!
    currency: String
    
    fromAccountId: Int
    fromAccountNumber: String
    
    toAccountId: Int
    toAccountNumber: String
    
    maxRetries: Int
  }

  input CreateTransferInput {
    type: TransferType!
    context: MobileUserContext!
    amount: Decimal!
    currency: String
    description: String

    # Account-based transfers
    fromAccountId: Int
    toAccountNumber: String
  }

  input TransactionFilterInput {
    status: TransactionStatus
    type: TransactionType
    source: TransactionSource
    context: MobileUserContext
    dateFrom: DateTime
    dateTo: DateTime
    minAmount: Decimal
    maxAmount: Decimal
    accountId: Int
    search: String
  }

  type CreateTransactionResponse {
    success: Boolean!
    transaction: Transaction
    message: String!
    errors: [String!]
  }

  type TransactionConnection {
    transactions: [Transaction!]!
    totalCount: Int!
    pageInfo: PageInfo!
  }
  
  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    currentPage: Int!
    totalPages: Int!
  }

  type RetryStats {
    totalRetryable: Int!
    totalFailed: Int!
    totalPending: Int!
    nextRetryTime: DateTime
  }

  extend type Query {
    # Proxy Transaction System queries (renamed to avoid conflicts)
    proxyTransaction(id: ID!): Transaction
    proxyTransactionByReference(reference: String!): Transaction
    proxyTransactions(
      filter: TransactionFilterInput
      page: Int = 1
      limit: Int = 20
    ): TransactionConnection!
    
    proxyAccountTransactions(
      accountId: Int!
      page: Int = 1
      limit: Int = 20
    ): TransactionConnection!
    
    retryableTransactions(limit: Int = 100): [Transaction!]!
    transactionRetryStats: RetryStats!
  }

  extend type Mutation {
    createTransaction(input: CreateTransactionInput!): CreateTransactionResponse!
    createTransfer(input: CreateTransferInput!): CreateTransactionResponse!
    retryTransaction(id: ID!): CreateTransactionResponse!
    reverseTransaction(id: ID!, reason: String!): CreateTransactionResponse!
  }
  
  # ============================================
  # CHECKBOOK REQUESTS
  # ============================================
  
  enum CheckbookRequestStatus {
    PENDING
    APPROVED
    READY_FOR_COLLECTION
    COLLECTED
    CANCELLED
    REJECTED
  }
  
  type CheckbookRequest {
    id: ID!
    mobileUserId: Int!
    accountNumber: String!
    numberOfCheckbooks: Int!
    collectionPoint: String!
    
    status: CheckbookRequestStatus!
    requestedAt: DateTime!
    approvedAt: DateTime
    approvedBy: Int
    readyAt: DateTime
    collectedAt: DateTime
    cancelledAt: DateTime
    rejectedAt: DateTime
    
    notes: String
    rejectionReason: String
    
    createdAt: DateTime!
    updatedAt: DateTime!
    
    mobileUser: MobileUser!
    approvedByUser: AdminWebUser
  }
  
  type CheckbookRequestConnection {
    requests: [CheckbookRequest!]!
    total: Int!
    page: Int!
    pageSize: Int!
    totalPages: Int!
  }
  
  type CheckbookRequestStats {
    total: Int!
    PENDING: Int!
    APPROVED: Int!
    READY_FOR_COLLECTION: Int!
    COLLECTED: Int!
    CANCELLED: Int!
    REJECTED: Int!
  }
  
  input CreateCheckbookRequestInput {
    accountNumber: String!
    numberOfCheckbooks: Int
    collectionPoint: String!
    notes: String
  }
  
  input UpdateCheckbookRequestInput {
    status: CheckbookRequestStatus
    numberOfCheckbooks: Int
    collectionPoint: String
    notes: String
    rejectionReason: String
  }
  
  input CheckbookRequestFilterInput {
    status: CheckbookRequestStatus
    accountNumber: String
    mobileUserId: Int
  }
  
  extend type Query {
    # Mobile user queries - get their own requests
    myCheckbookRequests(
      status: CheckbookRequestStatus
      page: Int = 1
      pageSize: Int = 20
    ): CheckbookRequestConnection!
    
    myCheckbookRequest(id: ID!): CheckbookRequest
    
    # Admin queries - get all requests with filters
    checkbookRequests(
      filter: CheckbookRequestFilterInput
      page: Int = 1
      pageSize: Int = 20
    ): CheckbookRequestConnection!
    
    checkbookRequest(id: ID!): CheckbookRequest
    checkbookRequestStats: CheckbookRequestStats!
  }

  enum AirtimeProvider {
    AIRTEL
    TNM
  }

  input PurchaseAirtimeInput {
    provider: AirtimeProvider!
    msisdn: String!
    amount: Decimal!
    sourceAccountNumber: String!
    bundleId: String
  }

  type PurchaseAirtimeResponse {
    success: Boolean!
    message: String
    transactionId: String
    reference: String
    status: String
  }
  
  extend type Mutation {
    # Mobile user mutations
    createCheckbookRequest(input: CreateCheckbookRequestInput!): CheckbookRequest!
    cancelMyCheckbookRequest(id: ID!): CheckbookRequest!
    
    # Push Notification mutations
    registerDeviceForPush(fcmToken: String!, deviceId: String!): Boolean!
    unregisterDeviceFromPush(deviceId: String!): Boolean!
    testPushNotification(deviceId: String): Boolean!
    
    # Device management
    requestPrimaryDeviceOtp(deviceId: String!): OtpVerificationResponse!
    setPrimaryDevice(deviceId: String!, otpCode: String!, verificationToken: String!): MobileDevice!
    
    # Notification actions
    markNotificationAsRead(id: ID!): Boolean!
    markAllNotificationsAsRead: Boolean!
    deleteNotification(id: ID!): Boolean!
    
    # Admin mutations
    adminTestPushNotification(userId: ID!, deviceId: String): Boolean!
    updateCheckbookRequest(id: ID!, input: UpdateCheckbookRequestInput!): CheckbookRequest!
    deleteCheckbookRequest(id: ID!): Boolean!

    # Airtime mutations
    purchaseAirtime(input: PurchaseAirtimeInput!): PurchaseAirtimeResponse!

    # Security mutations
    setMemoWord(memoWord: String!): MobileUserResponse!
  }

  enum NotificationType {
    ACCOUNT_ALERT
    TRANSACTION_COMPLETE
    TRANSACTION_FAILED
    CHECKBOOK_STATUS
    ACCOUNT_FROZEN
    LOGIN_ALERT
    SECURITY_ALERT
    PAYMENT_DUE
    PROMOTION
    SYSTEM_ANNOUNCEMENT
  }

  enum NotificationPriority {
    LOW
    NORMAL
    HIGH
    URGENT
  }

  enum NotificationStatus {
    PENDING
    SENT
    DELIVERED
    FAILED
    READ
  }

  type MobileUserResponse {
    success: Boolean!
    message: String
    user: MobileUser
    token: String
    appStructure: [AppScreen!]
  }

  type PushNotification {
    id: ID!
    type: NotificationType!
    priority: NotificationPriority!
    title: String!
    body: String!
    imageUrl: String
    actionUrl: String
    actionData: JSON
    status: NotificationStatus!
    sentAt: String
    deliveredAt: String
    readAt: String
    createdAt: String!
  }

  type PushNotificationConnection {
    items: [PushNotification!]!
    totalCount: Int!
    page: Int!
    pageSize: Int!
    totalPages: Int!
  }

  extend type Query {
    myNotifications(
      type: NotificationType
      page: Int = 1
      pageSize: Int = 20
    ): PushNotificationConnection!
    
    unreadNotificationCount: Int!
  }
`;
