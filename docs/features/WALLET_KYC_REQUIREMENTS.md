# Phoenix Wallet KYC Requirements - Complete Guide

## 🎯 Overview

The Phoenix wallet system uses a **tier-based KYC approach**:
- Different wallet tiers have different KYC requirements
- Users upgrade to higher tiers by completing more KYC fields
- Higher tiers = Higher transaction limits & balances

---

## 📋 Available KYC Fields

### Basic Information
1. **first_name** - User's first name
2. **last_name** - User's last name
3. **mobile_number** - Mobile phone number
4. **email** - Email address

### Identity & Personal
5. **date_of_birth** - Date of birth (for age verification)
6. **address** - Physical address
7. **city** - City of residence
8. **id_number** - National ID number
9. **id_image** - ID card/document image

### Employment & Financial
10. **occupation** - User's occupation/profession
11. **employer_name** - Name of employer
12. **source_of_funds** - Source of income/funds

---

## 🔐 KYC Validation Rules

Available rules (configured per tier):

### 1. minimum_age
- **Type**: number
- **Purpose**: Minimum age requirement (e.g., 18 years)
- **Validation**: `Date.diff(today, date_of_birth) >= min_age * 365`

### 2. id_required
- **Type**: boolean
- **Purpose**: Require valid ID number
- **Validation**: `id_number is not nil and not empty`

### 3. address_required
- **Type**: boolean
- **Purpose**: Require physical address
- **Validation**: `address is not nil and not empty`

### 4. employment_verification
- **Type**: boolean
- **Purpose**: Require employment information
- **Validation**: `employer_name is not nil and not empty`

### 5. source_of_funds_required
- **Type**: boolean
- **Purpose**: Require source of funds declaration
- **Validation**: `source_of_funds is not nil and not empty`

### 6. nrb_verification
- **Type**: boolean
- **Purpose**: Require NRB (National ID) verification
- **Validation**: `nrb_validation is true`

---

## 🏆 Wallet Tier Structure

Each tier defines:

### Balance Limits
- `minimum_balance` - Minimum account balance
- `maximum_balance` - Maximum account balance

### Transaction Limits
- `min_transaction_amount` - Minimum per transaction
- `max_transaction_amount` - Maximum per transaction
- `daily_transaction_limit` - Daily total limit
- `monthly_transaction_limit` - Monthly total limit

### Transaction Count
- `daily_transaction_count` - Max transactions per day
- `monthly_transaction_count` - Max transactions per month

### Credit/Debt
- `maximum_credit_limit` - Maximum credit allowed
- `maximum_debt_limit` - Maximum debt allowed

### KYC Requirements
- `required_kyc_fields` - Array of required field names
- `kyc_rules` - Map of validation rules

---

## 📊 Database Schema

### WalletUser Fields

```elixir
# Basic KYC Fields
field :date_of_birth, :date
field :address, :string
field :city, :string
field :occupation, :string
field :employer_name, :string
field :source_of_funds, :string
field :id_number, :string
field :id_image, :string

# KYC Status
field :kyc_complete, :boolean, default: false
field :kyc_verified_at, :utc_datetime
belongs_to :wallet_tier, WalletTier

# NRB Validation Fields
field :surname, :string
field :other_names, :string
field :gender, :string
field :nrb_validation, :boolean
field :nrb_response_code, :integer
field :nrb_response_message, :string
```

---

## ✅ KYC Completion Logic

A field is considered "completed" if:
- Value is not `nil`
- Value is not empty string `""`
- Value is not `false` (for booleans)

### Checked Fields:
```elixir
[
  :first_name,
  :last_name,
  :mobile_number,
  :email,
  :date_of_birth,
  :address,
  :city,
  :occupation,
  :employer_name,
  :source_of_funds,
  :id_number,
  :id_image,
  :nrb_validation
]
```

---

## 🔄 Tier Upgrade Process

### 1. Check Completed Fields
```elixir
completed_fields = get_completed_kyc_fields(user)
```

### 2. Find Available Tiers
- Get all tiers except current tier
- Order by position
- Filter tiers where user meets requirements

### 3. Validate Requirements

For each tier:

**a) Check required_kyc_fields**
- All required fields must be completed

**b) Check kyc_rules**
- `minimum_age`: Age >= required age
- `address_required`: Address is filled
- `employment_verification`: Employer name is filled
- `source_of_funds_required`: Source of funds is filled
- `id_required`: ID number is filled
- `nrb_verification`: NRB validation passed

### 4. Upgrade User
- User can upgrade to any tier they qualify for
- Update `wallet_tier_id`
- Mark `kyc_complete = true` (if fully verified)
- Set `kyc_verified_at = now()`

---

## 📝 Example Tier Configurations

### Tier 1: Basic (Default)
```elixir
required_kyc_fields: ["first_name", "last_name", "mobile_number"]
kyc_rules: %{}
maximum_balance: 50_000
daily_transaction_limit: 5_000
```

### Tier 2: Standard
```elixir
required_kyc_fields: [
  "first_name", "last_name", "mobile_number", 
  "email", "date_of_birth"
]
kyc_rules: %{"minimum_age" => 18}
maximum_balance: 500_000
daily_transaction_limit: 50_000
```

### Tier 3: Premium
```elixir
required_kyc_fields: [
  "first_name", "last_name", "mobile_number", "email",
  "date_of_birth", "address", "city", "occupation", "id_number"
]
kyc_rules: %{
  "minimum_age" => 18,
  "address_required" => true,
  "id_required" => true
}
maximum_balance: 2_000_000
daily_transaction_limit: 200_000
```

### Tier 4: Elite
```elixir
required_kyc_fields: [
  "first_name", "last_name", "mobile_number", "email",
  "date_of_birth", "address", "city", "occupation",
  "employer_name", "source_of_funds", "id_number", "id_image"
]
kyc_rules: %{
  "minimum_age" => 21,
  "address_required" => true,
  "employment_verification" => true,
  "source_of_funds_required" => true,
  "id_required" => true,
  "nrb_verification" => true
}
maximum_balance: :unlimited
daily_transaction_limit: 1_000_000
```

---

## 🔍 Key Functions

**Location**: `lib/service_manager/wallet_accounts/tier_management.ex`

### available_upgrade_tiers(user)
Returns list of tiers user can upgrade to

### meets_tier_requirements?(user, tier)
Returns boolean - whether user meets tier requirements

### get_completed_kyc_fields(user)
Returns list of completed field names

### has_required_fields?(completed_fields, required_fields)
Returns boolean - all required fields completed

### meets_kyc_rules?(user, rules)
Returns boolean - all KYC rules satisfied

---

## 📊 NRB Verification

**NRB** = National Registration Bureau (Malawi)

### Fields for NRB Validation
```elixir
field :surname, :string
field :other_names, :string
field :gender, :string
field :date_of_birth_string, :string
field :date_of_issue_string, :string
field :date_of_expiry_string, :string
field :place_of_birth_district_name, :string
```

### Response Fields
```elixir
field :nrb_validation, :boolean  # passed/failed
field :nrb_response_code, :integer
field :nrb_response_message, :string
field :nrb_status, :string
field :nrb_status_reason, :string
field :nrb_status_code, :string
```

**Integration**: External API call to NRB system for ID verification

---

## 🔐 Security Considerations

### 1. ID Image Storage
- Store securely (encrypted or separate storage)
- Access control (only authorized users)
- Consider using S3/cloud storage

### 2. Personal Data
- Comply with data protection regulations
- Encrypt sensitive fields
- Audit log access to KYC data

### 3. Verification
- Multi-step verification process
- Manual review for high-value accounts
- Regular re-verification for high tiers

### 4. NRB Integration
- Secure API credentials
- Rate limiting
- Error handling and logging

---

## 💾 Useful Queries

### Get User's KYC Status
```sql
SELECT 
  u.id,
  u.first_name,
  u.last_name,
  u.mobile_number,
  u.kyc_complete,
  u.kyc_verified_at,
  t.name as tier_name,
  t.required_kyc_fields,
  t.kyc_rules
FROM walletusers u
LEFT JOIN wallet_tiers t ON u.wallet_tier_id = t.id
WHERE u.id = 123;
```

### Get Users Needing KYC Update
```sql
SELECT id, first_name, last_name, mobile_number
FROM walletusers
WHERE kyc_complete = false
  AND wallet_tier_id > 1;
```

### Get Tier Statistics
```sql
SELECT 
  t.name,
  COUNT(u.id) as user_count,
  AVG(CASE WHEN u.kyc_complete THEN 1 ELSE 0 END) as kyc_completion_rate
FROM wallet_tiers t
LEFT JOIN walletusers u ON t.id = u.wallet_tier_id
GROUP BY t.id, t.name
ORDER BY t.position;
```

---

## ✨ Summary

### Phoenix Wallet KYC System

**Tiered Approach**
- Multiple tier levels
- Different requirements per tier
- Progressive upgrades

**Flexible Fields**
- 12 available KYC fields
- Configurable per tier
- Basic to advanced information

**Validation Rules**
- Age verification
- Address requirements
- Employment checks
- Source of funds
- NRB verification

**Upgrade Process**
- User completes KYC fields
- System checks tier requirements
- Automatic qualification
- Manual approval (optional)

**Security**
- Encrypted storage
- Access control
- Audit logging
- External verification (NRB)

---

**Users start at basic tier and upgrade by completing additional KYC fields to unlock higher limits!** 🚀
