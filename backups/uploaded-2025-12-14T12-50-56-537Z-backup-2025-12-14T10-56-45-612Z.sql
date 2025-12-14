--
-- PostgreSQL database dump
--

\restrict BL3C8uyfAfehcX6PxwACzQ5JLYpWaTGZ2ur8EpEGziYsNRLZlxqcTdfgyMRrqDB

-- Dumped from database version 15.15
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: AlertStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AlertStatus" AS ENUM (
    'PENDING',
    'SENT',
    'FAILED',
    'ACKNOWLEDGED'
);


ALTER TYPE public."AlertStatus" OWNER TO postgres;

--
-- Name: AlertType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AlertType" AS ENUM (
    'LOW_BALANCE',
    'LARGE_TRANSACTION',
    'SUSPICIOUS_ACTIVITY',
    'PAYMENT_DUE',
    'ACCOUNT_LOGIN'
);


ALTER TYPE public."AlertType" OWNER TO postgres;

--
-- Name: AttemptStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AttemptStatus" AS ENUM (
    'PENDING_VERIFICATION',
    'VERIFIED',
    'SUCCESS',
    'FAILED_CREDENTIALS',
    'FAILED_OTP',
    'FAILED_DEVICE_PENDING',
    'FAILED_DEVICE_BLOCKED',
    'EXPIRED',
    'PENDING_APPROVAL'
);


ALTER TYPE public."AttemptStatus" OWNER TO postgres;

--
-- Name: AttemptType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AttemptType" AS ENUM (
    'PASSWORD_LOGIN',
    'PASSKEY_REGISTRATION',
    'PASSKEY_LOGIN',
    'OTP_VERIFY'
);


ALTER TYPE public."AttemptType" OWNER TO postgres;

--
-- Name: BeneficiaryType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."BeneficiaryType" AS ENUM (
    'WALLET',
    'BANK_INTERNAL',
    'BANK_EXTERNAL'
);


ALTER TYPE public."BeneficiaryType" OWNER TO postgres;

--
-- Name: BillerTransactionStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."BillerTransactionStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'CANCELLED',
    'REVERSED'
);


ALTER TYPE public."BillerTransactionStatus" OWNER TO postgres;

--
-- Name: BillerTransactionType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."BillerTransactionType" AS ENUM (
    'ACCOUNT_DETAILS',
    'POST_TRANSACTION',
    'GET_INVOICE',
    'CONFIRM_INVOICE',
    'BUNDLE_DETAILS',
    'CONFIRM_BUNDLE'
);


ALTER TYPE public."BillerTransactionType" OWNER TO postgres;

--
-- Name: BillerType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."BillerType" AS ENUM (
    'REGISTER_GENERAL',
    'BWB_POSTPAID',
    'LWB_POSTPAID',
    'SRWB_POSTPAID',
    'SRWB_PREPAID',
    'MASM',
    'AIRTEL_VALIDATION',
    'TNM_BUNDLES'
);


ALTER TYPE public."BillerType" OWNER TO postgres;

--
-- Name: CheckbookRequestStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."CheckbookRequestStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'READY_FOR_COLLECTION',
    'COLLECTED',
    'CANCELLED',
    'REJECTED'
);


ALTER TYPE public."CheckbookRequestStatus" OWNER TO postgres;

--
-- Name: CoreBankingAuthType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."CoreBankingAuthType" AS ENUM (
    'BASIC',
    'BEARER'
);


ALTER TYPE public."CoreBankingAuthType" OWNER TO postgres;

--
-- Name: LoginAlertMode; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."LoginAlertMode" AS ENUM (
    'EVERY_LOGIN',
    'NEW_DEVICE',
    'NEW_LOCATION'
);


ALTER TYPE public."LoginAlertMode" OWNER TO postgres;

--
-- Name: LoginMethod; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."LoginMethod" AS ENUM (
    'PASSWORD',
    'BIOMETRIC',
    'PASSKEY',
    'OTP'
);


ALTER TYPE public."LoginMethod" OWNER TO postgres;

--
-- Name: MigrationStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."MigrationStatus" AS ENUM (
    'PENDING',
    'RUNNING',
    'COMPLETED',
    'FAILED'
);


ALTER TYPE public."MigrationStatus" OWNER TO postgres;

--
-- Name: MobileUserContext; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."MobileUserContext" AS ENUM (
    'MOBILE_BANKING',
    'WALLET',
    'VILLAGE_BANKING',
    'AGENT',
    'MERCHANT'
);


ALTER TYPE public."MobileUserContext" OWNER TO postgres;

--
-- Name: NotificationChannel; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."NotificationChannel" AS ENUM (
    'PUSH',
    'SMS',
    'EMAIL'
);


ALTER TYPE public."NotificationChannel" OWNER TO postgres;

--
-- Name: PaymentReminderInterval; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PaymentReminderInterval" AS ENUM (
    'ONE_WEEK',
    'THREE_DAYS',
    'ONE_DAY'
);


ALTER TYPE public."PaymentReminderInterval" OWNER TO postgres;

--
-- Name: PaymentType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PaymentType" AS ENUM (
    'BILL',
    'LOAN',
    'SUBSCRIPTION',
    'RECURRING'
);


ALTER TYPE public."PaymentType" OWNER TO postgres;

--
-- Name: RegistrationSource; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."RegistrationSource" AS ENUM (
    'THIRD_PARTY_API',
    'ADMIN_PORTAL',
    'SELF_SERVICE',
    'T24_SYNC'
);


ALTER TYPE public."RegistrationSource" OWNER TO postgres;

--
-- Name: RegistrationStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."RegistrationStatus" AS ENUM (
    'PENDING',
    'COMPLETED',
    'FAILED',
    'DUPLICATE',
    'APPROVED'
);


ALTER TYPE public."RegistrationStatus" OWNER TO postgres;

--
-- Name: ResolutionAction; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ResolutionAction" AS ENUM (
    'CONFIRMED_LEGITIMATE',
    'FRAUD_REPORTED',
    'ACCOUNT_LOCKED'
);


ALTER TYPE public."ResolutionAction" OWNER TO postgres;

--
-- Name: SuspicionReason; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."SuspicionReason" AS ENUM (
    'UNUSUAL_LOCATION',
    'MULTIPLE_FAILED_ATTEMPTS',
    'NEW_DEVICE_TRANSACTION'
);


ALTER TYPE public."SuspicionReason" OWNER TO postgres;

--
-- Name: TransactionType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TransactionType" AS ENUM (
    'DEBIT',
    'CREDIT'
);


ALTER TYPE public."TransactionType" OWNER TO postgres;

--
-- Name: UserAction; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."UserAction" AS ENUM (
    'DISMISSED',
    'THIS_WAS_ME',
    'REPORT_FRAUD',
    'QUICK_PAY'
);


ALTER TYPE public."UserAction" OWNER TO postgres;

--
-- Name: WorkflowStepType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."WorkflowStepType" AS ENUM (
    'FORM',
    'API_CALL',
    'VALIDATION',
    'CONFIRMATION',
    'DISPLAY',
    'REDIRECT'
);


ALTER TYPE public."WorkflowStepType" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: CoreBankingConnection; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."CoreBankingConnection" (
    id integer NOT NULL,
    name text NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    "baseUrl" text NOT NULL,
    "authType" public."CoreBankingAuthType" DEFAULT 'BASIC'::public."CoreBankingAuthType" NOT NULL,
    token text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "lastTestedAt" timestamp(3) without time zone,
    "lastTestOk" boolean,
    "lastTestMessage" text
);


ALTER TABLE public."CoreBankingConnection" OWNER TO postgres;

--
-- Name: CoreBankingConnection_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."CoreBankingConnection_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."CoreBankingConnection_id_seq" OWNER TO postgres;

--
-- Name: CoreBankingConnection_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."CoreBankingConnection_id_seq" OWNED BY public."CoreBankingConnection".id;


--
-- Name: CoreBankingEndpoint; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."CoreBankingEndpoint" (
    id integer NOT NULL,
    "connectionId" integer NOT NULL,
    name text NOT NULL,
    method text DEFAULT 'POST'::text NOT NULL,
    path text NOT NULL,
    "bodyTemplate" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."CoreBankingEndpoint" OWNER TO postgres;

--
-- Name: CoreBankingEndpoint_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."CoreBankingEndpoint_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."CoreBankingEndpoint_id_seq" OWNER TO postgres;

--
-- Name: CoreBankingEndpoint_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."CoreBankingEndpoint_id_seq" OWNED BY public."CoreBankingEndpoint".id;


--
-- Name: DatabaseConnection; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."DatabaseConnection" (
    id integer NOT NULL,
    name text NOT NULL,
    engine text NOT NULL,
    host text NOT NULL,
    port integer NOT NULL,
    database text NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    options jsonb,
    "isReadOnly" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "lastTestedAt" timestamp(3) without time zone,
    "lastTestOk" boolean,
    "lastTestMessage" text
);


ALTER TABLE public."DatabaseConnection" OWNER TO postgres;

--
-- Name: DatabaseConnection_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."DatabaseConnection_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."DatabaseConnection_id_seq" OWNER TO postgres;

--
-- Name: DatabaseConnection_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."DatabaseConnection_id_seq" OWNED BY public."DatabaseConnection".id;


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: account_alert_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.account_alert_settings (
    id integer NOT NULL,
    mobile_user_id integer NOT NULL,
    account_number character varying(20) NOT NULL,
    low_balance_enabled boolean DEFAULT true NOT NULL,
    low_balance_threshold numeric(19,4),
    low_balance_channels public."NotificationChannel"[] DEFAULT ARRAY['PUSH'::public."NotificationChannel"],
    large_transaction_enabled boolean DEFAULT true NOT NULL,
    large_transaction_threshold numeric(19,4),
    large_transaction_channels public."NotificationChannel"[] DEFAULT ARRAY['PUSH'::public."NotificationChannel", 'SMS'::public."NotificationChannel"],
    large_transaction_debit_only boolean DEFAULT true NOT NULL,
    alert_unusual_location boolean DEFAULT true NOT NULL,
    alert_multiple_failed_attempts boolean DEFAULT true NOT NULL,
    alert_new_device_transaction boolean DEFAULT true NOT NULL,
    suspicious_activity_channels public."NotificationChannel"[] DEFAULT ARRAY['PUSH'::public."NotificationChannel", 'SMS'::public."NotificationChannel", 'EMAIL'::public."NotificationChannel"],
    payment_due_enabled boolean DEFAULT true NOT NULL,
    payment_due_channels public."NotificationChannel"[] DEFAULT ARRAY['PUSH'::public."NotificationChannel", 'SMS'::public."NotificationChannel"],
    payment_reminder_interval public."PaymentReminderInterval" DEFAULT 'ONE_DAY'::public."PaymentReminderInterval" NOT NULL,
    login_alert_mode public."LoginAlertMode" DEFAULT 'NEW_DEVICE'::public."LoginAlertMode" NOT NULL,
    login_alert_channels public."NotificationChannel"[] DEFAULT ARRAY['PUSH'::public."NotificationChannel", 'EMAIL'::public."NotificationChannel"],
    quiet_hours_enabled boolean DEFAULT false NOT NULL,
    quiet_hours_start time(6) without time zone,
    quiet_hours_end time(6) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.account_alert_settings OWNER TO postgres;

--
-- Name: account_alert_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.account_alert_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.account_alert_settings_id_seq OWNER TO postgres;

--
-- Name: account_alert_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.account_alert_settings_id_seq OWNED BY public.account_alert_settings.id;


--
-- Name: account_alerts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.account_alerts (
    id integer NOT NULL,
    mobile_user_id integer NOT NULL,
    account_number character varying(20),
    alert_type public."AlertType" NOT NULL,
    alert_data jsonb NOT NULL,
    status public."AlertStatus" DEFAULT 'PENDING'::public."AlertStatus" NOT NULL,
    channels_sent public."NotificationChannel"[] DEFAULT ARRAY[]::public."NotificationChannel"[],
    sent_at timestamp(3) without time zone,
    delivery_status jsonb,
    acknowledged_at timestamp(3) without time zone,
    user_action public."UserAction",
    triggered_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.account_alerts OWNER TO postgres;

--
-- Name: account_alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.account_alerts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.account_alerts_id_seq OWNER TO postgres;

--
-- Name: account_alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.account_alerts_id_seq OWNED BY public.account_alerts.id;


--
-- Name: admin_web_password_reset_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_web_password_reset_tokens (
    id integer NOT NULL,
    token text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "usedAt" timestamp(3) without time zone,
    user_id integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.admin_web_password_reset_tokens OWNER TO postgres;

--
-- Name: admin_web_password_reset_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admin_web_password_reset_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admin_web_password_reset_tokens_id_seq OWNER TO postgres;

--
-- Name: admin_web_password_reset_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admin_web_password_reset_tokens_id_seq OWNED BY public.admin_web_password_reset_tokens.id;


--
-- Name: admin_web_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_web_users (
    id integer NOT NULL,
    email text NOT NULL,
    "passwordHash" text NOT NULL,
    name text,
    "isActive" boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.admin_web_users OWNER TO postgres;

--
-- Name: admin_web_users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admin_web_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admin_web_users_id_seq OWNER TO postgres;

--
-- Name: admin_web_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admin_web_users_id_seq OWNED BY public.admin_web_users.id;


--
-- Name: app_screen_page_workflows; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_screen_page_workflows (
    id text NOT NULL,
    page_id text NOT NULL,
    workflow_id text NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    config_override jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.app_screen_page_workflows OWNER TO postgres;

--
-- Name: app_screen_pages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_screen_pages (
    id text NOT NULL,
    name text NOT NULL,
    icon text NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_testing boolean DEFAULT false NOT NULL,
    screen_id text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.app_screen_pages OWNER TO postgres;

--
-- Name: app_screens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_screens (
    id text NOT NULL,
    name text NOT NULL,
    context public."MobileUserContext" NOT NULL,
    icon text NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_testing boolean DEFAULT false NOT NULL
);


ALTER TABLE public.app_screens OWNER TO postgres;

--
-- Name: biller_configs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.biller_configs (
    id text NOT NULL,
    biller_type public."BillerType" NOT NULL,
    biller_name text NOT NULL,
    display_name text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    base_url text NOT NULL,
    endpoints jsonb NOT NULL,
    authentication jsonb,
    default_currency character varying(3) DEFAULT 'MWK'::character varying NOT NULL,
    supported_currencies text[] DEFAULT ARRAY['MWK'::text],
    timeout_ms integer DEFAULT 30000 NOT NULL,
    retry_attempts integer DEFAULT 3 NOT NULL,
    features jsonb NOT NULL,
    "validationRules" jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by text,
    updated_by text
);


ALTER TABLE public.biller_configs OWNER TO postgres;

--
-- Name: biller_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.biller_transactions (
    id text NOT NULL,
    biller_config_id text,
    biller_type public."BillerType" NOT NULL,
    biller_name text NOT NULL,
    our_transaction_id character varying(50) NOT NULL,
    external_transaction_id text,
    transaction_type public."BillerTransactionType" NOT NULL,
    account_number text NOT NULL,
    account_type character varying(20),
    customer_account_name text,
    credit_account character varying(20),
    credit_account_type character varying(20),
    debit_account character varying(20),
    debit_account_type character varying(20),
    amount numeric(18,2) NOT NULL,
    currency character varying(3) DEFAULT 'MWK'::character varying NOT NULL,
    status public."BillerTransactionStatus" NOT NULL,
    api_endpoint text,
    request_payload jsonb,
    response_payload jsonb,
    error_message text,
    error_code character varying(50),
    bundle_id character varying(50),
    invoice_number character varying(100),
    meter_number character varying(50),
    metadata jsonb,
    processed_at timestamp(3) without time zone,
    completed_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    initiated_by text
);


ALTER TABLE public.biller_transactions OWNER TO postgres;

--
-- Name: checkbook_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.checkbook_requests (
    id integer NOT NULL,
    mobile_user_id integer NOT NULL,
    account_number text NOT NULL,
    number_of_checkbooks integer DEFAULT 1 NOT NULL,
    collection_point text NOT NULL,
    status public."CheckbookRequestStatus" DEFAULT 'PENDING'::public."CheckbookRequestStatus" NOT NULL,
    requested_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    approved_at timestamp(3) without time zone,
    approved_by integer,
    ready_at timestamp(3) without time zone,
    collected_at timestamp(3) without time zone,
    cancelled_at timestamp(3) without time zone,
    rejected_at timestamp(3) without time zone,
    notes text,
    rejection_reason text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.checkbook_requests OWNER TO postgres;

--
-- Name: checkbook_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.checkbook_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.checkbook_requests_id_seq OWNER TO postgres;

--
-- Name: checkbook_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.checkbook_requests_id_seq OWNED BY public.checkbook_requests.id;


--
-- Name: fdh_account_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fdh_account_categories (
    id integer NOT NULL,
    category text NOT NULL,
    display_to_mobile boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.fdh_account_categories OWNER TO postgres;

--
-- Name: fdh_account_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.fdh_account_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fdh_account_categories_id_seq OWNER TO postgres;

--
-- Name: fdh_account_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fdh_account_categories_id_seq OWNED BY public.fdh_account_categories.id;


--
-- Name: fdh_backups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fdh_backups (
    id text NOT NULL,
    filename text NOT NULL,
    size_bytes bigint NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    storage_url text
);


ALTER TABLE public.fdh_backups OWNER TO postgres;

--
-- Name: fdh_beneficiaries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fdh_beneficiaries (
    id integer NOT NULL,
    user_id integer NOT NULL,
    name text NOT NULL,
    beneficiary_type public."BeneficiaryType" NOT NULL,
    phone_number text,
    account_number text,
    bank_code text,
    bank_name text,
    branch text,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.fdh_beneficiaries OWNER TO postgres;

--
-- Name: fdh_beneficiaries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.fdh_beneficiaries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fdh_beneficiaries_id_seq OWNER TO postgres;

--
-- Name: fdh_beneficiaries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fdh_beneficiaries_id_seq OWNED BY public.fdh_beneficiaries.id;


--
-- Name: fdh_device_login_attempts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fdh_device_login_attempts (
    id text NOT NULL,
    mobile_user_id integer,
    username text,
    context text,
    device_id text,
    device_name text,
    device_model text,
    device_os text,
    ip_address text,
    location text,
    attempt_type public."AttemptType" NOT NULL,
    status public."AttemptStatus" NOT NULL,
    failure_reason text,
    otp_code text,
    otp_sent_to text,
    otp_sent_at timestamp(3) without time zone,
    otp_expires_at timestamp(3) without time zone,
    otp_verified_at timestamp(3) without time zone,
    otp_attempts integer DEFAULT 0 NOT NULL,
    verification_token text,
    attempted_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.fdh_device_login_attempts OWNER TO postgres;

--
-- Name: fdh_device_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fdh_device_sessions (
    id text NOT NULL,
    device_id text NOT NULL,
    mobile_user_id integer NOT NULL,
    "tokenHash" text NOT NULL,
    session_id text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    last_activity_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ip_address text,
    user_agent text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    revoked_at timestamp(3) without time zone
);


ALTER TABLE public.fdh_device_sessions OWNER TO postgres;

--
-- Name: fdh_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fdh_migrations (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    "sourceConnectionId" integer NOT NULL,
    "sourceQuery" text NOT NULL,
    "targetTable" text NOT NULL,
    "targetInsertQuery" text NOT NULL,
    status public."MigrationStatus" DEFAULT 'PENDING'::public."MigrationStatus" NOT NULL,
    "lastRunAt" timestamp(3) without time zone,
    "lastRunSuccess" boolean,
    "lastRunMessage" text,
    "lastRunRowsAffected" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    cron_expression text,
    is_recurring boolean DEFAULT false NOT NULL,
    next_run_at timestamp(3) without time zone
);


ALTER TABLE public.fdh_migrations OWNER TO postgres;

--
-- Name: fdh_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.fdh_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fdh_migrations_id_seq OWNER TO postgres;

--
-- Name: fdh_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fdh_migrations_id_seq OWNED BY public.fdh_migrations.id;


--
-- Name: fdh_mobile_user_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fdh_mobile_user_accounts (
    id integer NOT NULL,
    mobile_user_id integer NOT NULL,
    account_number text NOT NULL,
    account_name text,
    account_type text,
    currency text DEFAULT 'MWK'::text NOT NULL,
    balance numeric(15,2),
    is_primary boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    available_balance numeric(15,2),
    cleared_balance numeric(15,2),
    working_balance numeric(15,2),
    category_id text,
    category_name text,
    account_status text,
    holder_name text,
    nick_name text,
    online_limit text,
    opening_date text
);


ALTER TABLE public.fdh_mobile_user_accounts OWNER TO postgres;

--
-- Name: fdh_mobile_user_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.fdh_mobile_user_accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fdh_mobile_user_accounts_id_seq OWNER TO postgres;

--
-- Name: fdh_mobile_user_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fdh_mobile_user_accounts_id_seq OWNED BY public.fdh_mobile_user_accounts.id;


--
-- Name: fdh_mobile_user_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fdh_mobile_user_profiles (
    id integer NOT NULL,
    mobile_user_id integer NOT NULL,
    first_name text,
    last_name text,
    email text,
    phone text,
    address text,
    city text,
    country text,
    zip text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.fdh_mobile_user_profiles OWNER TO postgres;

--
-- Name: fdh_mobile_user_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.fdh_mobile_user_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fdh_mobile_user_profiles_id_seq OWNER TO postgres;

--
-- Name: fdh_mobile_user_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fdh_mobile_user_profiles_id_seq OWNED BY public.fdh_mobile_user_profiles.id;


--
-- Name: fdh_mobile_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fdh_mobile_users (
    id integer NOT NULL,
    context public."MobileUserContext" NOT NULL,
    username text,
    "phoneNumber" text,
    "customerNumber" text,
    "accountNumber" text,
    "passwordHash" text,
    "isActive" boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    token_version integer DEFAULT 0 NOT NULL,
    memo_word text
);


ALTER TABLE public.fdh_mobile_users OWNER TO postgres;

--
-- Name: fdh_mobile_users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.fdh_mobile_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fdh_mobile_users_id_seq OWNER TO postgres;

--
-- Name: fdh_mobile_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fdh_mobile_users_id_seq OWNED BY public.fdh_mobile_users.id;


--
-- Name: forms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.forms (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    category text,
    schema jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_public boolean DEFAULT false NOT NULL,
    allow_multiple boolean DEFAULT false NOT NULL,
    requires_auth boolean DEFAULT true NOT NULL,
    created_by integer NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.forms OWNER TO postgres;

--
-- Name: mobile_devices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mobile_devices (
    id text NOT NULL,
    mobile_user_id integer NOT NULL,
    name text,
    model text,
    os text,
    "deviceId" text NOT NULL,
    "credentialId" text,
    "publicKey" text,
    counter bigint DEFAULT 0,
    transports text[] DEFAULT ARRAY[]::text[],
    is_active boolean DEFAULT true NOT NULL,
    last_used_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    last_login_ip text,
    login_count integer DEFAULT 0 NOT NULL,
    verification_ip text,
    verification_location text,
    verified_via text
);


ALTER TABLE public.mobile_devices OWNER TO postgres;

--
-- Name: requested_registrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.requested_registrations (
    id integer NOT NULL,
    source_ip text NOT NULL,
    request_body jsonb NOT NULL,
    source public."RegistrationSource" DEFAULT 'THIRD_PARTY_API'::public."RegistrationSource" NOT NULL,
    phone_number text NOT NULL,
    customer_number text NOT NULL,
    email_address text,
    first_name text,
    last_name text,
    profile_type text,
    company text,
    status public."RegistrationStatus" DEFAULT 'PENDING'::public."RegistrationStatus" NOT NULL,
    processed_at timestamp(3) without time zone,
    elixir_user_id integer,
    mobile_user_id integer,
    error_message text,
    retry_count integer DEFAULT 0 NOT NULL,
    last_retry_at timestamp(3) without time zone,
    processed_by integer,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    validation_data jsonb,
    process_log jsonb[] DEFAULT ARRAY[]::jsonb[]
);


ALTER TABLE public.requested_registrations OWNER TO postgres;

--
-- Name: requested_registrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.requested_registrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.requested_registrations_id_seq OWNER TO postgres;

--
-- Name: requested_registrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.requested_registrations_id_seq OWNED BY public.requested_registrations.id;


--
-- Name: suspicious_activity_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.suspicious_activity_log (
    id integer NOT NULL,
    alert_id integer,
    mobile_user_id integer NOT NULL,
    account_number character varying(20),
    suspicion_reason public."SuspicionReason" NOT NULL,
    risk_score integer NOT NULL,
    detection_details jsonb NOT NULL,
    related_transaction_ids text[] DEFAULT ARRAY[]::text[],
    device_id character varying(255),
    ip_address character varying(45),
    location character varying(255),
    is_resolved boolean DEFAULT false NOT NULL,
    resolved_at timestamp(3) without time zone,
    resolution_action public."ResolutionAction",
    admin_notes text,
    detected_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.suspicious_activity_log OWNER TO postgres;

--
-- Name: suspicious_activity_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.suspicious_activity_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.suspicious_activity_log_id_seq OWNER TO postgres;

--
-- Name: suspicious_activity_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.suspicious_activity_log_id_seq OWNED BY public.suspicious_activity_log.id;


--
-- Name: workflow_steps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workflow_steps (
    id text NOT NULL,
    workflow_id text NOT NULL,
    type public."WorkflowStepType" NOT NULL,
    label text NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    config jsonb NOT NULL,
    validation jsonb,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.workflow_steps OWNER TO postgres;

--
-- Name: workflows; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workflows (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.workflows OWNER TO postgres;

--
-- Name: CoreBankingConnection id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CoreBankingConnection" ALTER COLUMN id SET DEFAULT nextval('public."CoreBankingConnection_id_seq"'::regclass);


--
-- Name: CoreBankingEndpoint id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CoreBankingEndpoint" ALTER COLUMN id SET DEFAULT nextval('public."CoreBankingEndpoint_id_seq"'::regclass);


--
-- Name: DatabaseConnection id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DatabaseConnection" ALTER COLUMN id SET DEFAULT nextval('public."DatabaseConnection_id_seq"'::regclass);


--
-- Name: account_alert_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_alert_settings ALTER COLUMN id SET DEFAULT nextval('public.account_alert_settings_id_seq'::regclass);


--
-- Name: account_alerts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_alerts ALTER COLUMN id SET DEFAULT nextval('public.account_alerts_id_seq'::regclass);


--
-- Name: admin_web_password_reset_tokens id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_web_password_reset_tokens ALTER COLUMN id SET DEFAULT nextval('public.admin_web_password_reset_tokens_id_seq'::regclass);


--
-- Name: admin_web_users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_web_users ALTER COLUMN id SET DEFAULT nextval('public.admin_web_users_id_seq'::regclass);


--
-- Name: checkbook_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.checkbook_requests ALTER COLUMN id SET DEFAULT nextval('public.checkbook_requests_id_seq'::regclass);


--
-- Name: fdh_account_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fdh_account_categories ALTER COLUMN id SET DEFAULT nextval('public.fdh_account_categories_id_seq'::regclass);


--
-- Name: fdh_beneficiaries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fdh_beneficiaries ALTER COLUMN id SET DEFAULT nextval('public.fdh_beneficiaries_id_seq'::regclass);


--
-- Name: fdh_migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fdh_migrations ALTER COLUMN id SET DEFAULT nextval('public.fdh_migrations_id_seq'::regclass);


--
-- Name: fdh_mobile_user_accounts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fdh_mobile_user_accounts ALTER COLUMN id SET DEFAULT nextval('public.fdh_mobile_user_accounts_id_seq'::regclass);


--
-- Name: fdh_mobile_user_profiles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fdh_mobile_user_profiles ALTER COLUMN id SET DEFAULT nextval('public.fdh_mobile_user_profiles_id_seq'::regclass);


--
-- Name: fdh_mobile_users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fdh_mobile_users ALTER COLUMN id SET DEFAULT nextval('public.fdh_mobile_users_id_seq'::regclass);


--
-- Name: requested_registrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requested_registrations ALTER COLUMN id SET DEFAULT nextval('public.requested_registrations_id_seq'::regclass);


--
-- Name: suspicious_activity_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suspicious_activity_log ALTER COLUMN id SET DEFAULT nextval('public.suspicious_activity_log_id_seq'::regclass);


--
-- Data for Name: CoreBankingConnection; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."CoreBankingConnection" (id, name, username, password, "baseUrl", "authType", token, "isActive", "createdAt", "updatedAt", "lastTestedAt", "lastTestOk", "lastTestMessage") FROM stdin;
1	FDH esb	admin	admin	https://fdh-esb.ngrok.dev/	BASIC	\N	t	2025-12-11 19:12:05.426	2025-12-13 13:18:10.244	2025-12-13 13:18:10.24	t	HTTP 200 OK
\.


--
-- Data for Name: CoreBankingEndpoint; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."CoreBankingEndpoint" (id, "connectionId", name, method, path, "bodyTemplate", "isActive", "createdAt", "updatedAt") FROM stdin;
1	1	Get accounts	GET	esb/customer/accounts/v1/api/{{customer_number}}	\N	t	2025-12-11 19:40:15.113	2025-12-13 13:21:11.463
\.


--
-- Data for Name: DatabaseConnection; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."DatabaseConnection" (id, name, engine, host, port, database, username, password, options, "isReadOnly", "createdAt", "updatedAt", "lastTestedAt", "lastTestOk", "lastTestMessage") FROM stdin;
1	Backend	postgres	db	5432	fdh_service_manager	postgres	postgres	\N	t	2025-12-11 21:38:45.841	2025-12-11 21:54:39.122	2025-12-11 21:54:39.121	t	Connection successful in 12 milliseconds.
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
128b2e86-56c4-4930-8b1c-481a6c3b36ea	b6f9d817fac4f027ce887ec1f5d0c9a841bf2be4bf485107bba2adeccb280d55	2025-12-11 18:58:15.544468+00	20251211185815_add_mobile_devices	\N	\N	2025-12-11 18:58:15.341014+00	1
e6484ed2-e29b-4bb3-a4f1-1e94ceb61591	5635e5346a853e8600c03d24f6ef51932a091e213e2c45634b7715d85a4c0e13	2025-12-11 19:08:05.304619+00	20251211190805_add_backup_and_recurring_migrations	\N	\N	2025-12-11 19:08:05.257928+00	1
d5ee2719-8aae-4d74-9c40-c96ad7635ff2	65131c10b650a72d9c2991150d7142ace359e1dd47a7b005df6193e1f7dcbd25	2025-12-12 11:37:55.875784+00	20251212113755_add_active_testing_flags	\N	\N	2025-12-12 11:37:55.85775+00	1
eeaea01c-a968-498c-9f34-81c1819a6597	a6bc945c1422d45f84c7102eacf655f367966b98dbb236a78e777cb03b115140	2025-12-11 22:41:05.054044+00	20251211224018_add_mobile_user_accounts	\N	\N	2025-12-11 22:41:04.994343+00	1
850f3a23-5e54-4421-96bc-cb5829fbee67	73217543aa45e78b24dec2d54dc6f4d0c390a947f4fd644e16d582a612522c39	2025-12-11 23:20:33.803937+00	20251211232023_add_device_login_attempts_and_otp	\N	\N	2025-12-11 23:20:33.740672+00	1
fb060486-4295-4a72-9b87-a4fe48409048	611a669aa6fe7cc16705f1b4d4059a901530bd9e65bd01e1a1c852f09058006a	\N	20251212151329_add_balance_fields	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20251212151329_add_balance_fields\n\nDatabase error code: 42701\n\nDatabase error:\nERROR: column "working_balance" of relation "fdh_mobile_user_accounts" already exists\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42701), message: "column \\"working_balance\\" of relation \\"fdh_mobile_user_accounts\\" already exists", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("tablecmds.c"), line: Some(7279), routine: Some("check_for_column_name_collision") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20251212151329_add_balance_fields"\n             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:113\n   1: schema_commands::commands::apply_migrations::Applying migration\n           with migration_name="20251212151329_add_balance_fields"\n             at schema-engine/commands/src/commands/apply_migrations.rs:95\n   2: schema_core::state::ApplyMigrations\n             at schema-engine/core/src/state.rs:260	\N	2025-12-13 13:28:45.5668+00	0
334d0888-aedb-4672-9078-6ab6b8422de0	086f839b6e822180abd18eb260cdda0c52e6fd1ac7d3852b2b242ce5c986e9a7	2025-12-12 00:45:59.56422+00	20251212004559_add_account_categories	\N	\N	2025-12-12 00:45:59.50453+00	1
8eba4367-9f47-4f60-a50f-dbe041cc18b0	040bcfe43dc84846bc3b367e6ebbfe794c1eed5376bb41068f2fca1e7dba48df	2025-12-12 00:59:44.560992+00	20251212005944_add_mobile_user_profile	\N	\N	2025-12-12 00:59:44.5248+00	1
ab6b0de6-d47d-4f90-ab87-8b55b87e8c31	7337cc7dcb31555b3971ea5791b72d7a09d7970b56215cc75ef2e704b79a9a25	2025-12-12 01:35:16.536845+00	20251212013516_add_token_version	\N	\N	2025-12-12 01:35:16.524536+00	1
6df42c77-8261-468c-8de0-d82f3e24a499	1890bd53b8d03c606d8782ebb8fb44f04c2246470ebe0353d6f74b2dec89a653	2025-12-12 02:09:33.287342+00	20251212020915_add_form_model	\N	\N	2025-12-12 02:09:33.243906+00	1
39825470-e034-4146-ba6f-22387d333873	156122849eaccaba260b2321d3c14e57d0dd126d6961e447ff6f5fd41ec8cbbb	2025-12-12 02:26:15.705004+00	20251212022557_add_device_sessions	\N	\N	2025-12-12 02:26:15.644716+00	1
e5170e1f-5937-440c-8b7e-1d8ec1deabdb	81e19137a5b17c8ad19f859aef90e93e30aaa5586d5002e3660740e844c2db88	2025-12-12 03:09:26.228147+00	20251212030926_add_memo_word_to_mobile_users	\N	\N	2025-12-12 03:09:26.217443+00	1
4b85f071-42a9-4112-b1ac-c80270a841a4	e6e2f47845cbda65f207ea5a0d4d180e5d1b37435a13c2af6651163dac5ae066	2025-12-12 11:18:48.532686+00	20251212111833_add_storage_url_to_backups	\N	\N	2025-12-12 11:18:48.475185+00	1
6d78c423-add7-4361-b709-f0307f4382ed	122d743a0403e77ad7e0ed9447f5b8826f2fbdbc55612d936eff004dd13c2eec	2025-12-12 11:19:50.881846+00	20251212111941_add_app_screens	\N	\N	2025-12-12 11:19:50.875486+00	1
0e400d80-f0b5-45b5-9b2c-f6206668d44e	df1c7c2c6ec937cbb5c811fe7086a2763fd3c921349799773dcd0506ff112ba2	2025-12-12 11:34:59.174493+00	20251212113449_simplify_app_screens	\N	\N	2025-12-12 11:34:59.144259+00	1
\.


--
-- Data for Name: account_alert_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.account_alert_settings (id, mobile_user_id, account_number, low_balance_enabled, low_balance_threshold, low_balance_channels, large_transaction_enabled, large_transaction_threshold, large_transaction_channels, large_transaction_debit_only, alert_unusual_location, alert_multiple_failed_attempts, alert_new_device_transaction, suspicious_activity_channels, payment_due_enabled, payment_due_channels, payment_reminder_interval, login_alert_mode, login_alert_channels, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, created_at, updated_at) FROM stdin;
1	55	1010100011629	t	500.0000	{PUSH}	t	500.0000	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 19:22:26.289	2025-12-13 19:23:34.65
4	55	1010100011637	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.577	2025-12-13 20:27:51.577
5	55	1010100011645	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.59	2025-12-13 20:27:51.59
6	55	1010100011653	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.599	2025-12-13 20:27:51.599
7	55	1010100011661	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.609	2025-12-13 20:27:51.609
8	55	1010100011677	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.616	2025-12-13 20:27:51.616
9	55	1010100011688	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.623	2025-12-13 20:27:51.623
10	55	1010100011696	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.629	2025-12-13 20:27:51.629
11	55	1010100011707	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.636	2025-12-13 20:27:51.636
12	55	1010100011718	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.644	2025-12-13 20:27:51.644
13	55	1010100011726	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.651	2025-12-13 20:27:51.651
14	55	1010100011734	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.658	2025-12-13 20:27:51.658
15	55	1010100011742	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.665	2025-12-13 20:27:51.665
16	55	1010100011758	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.672	2025-12-13 20:27:51.672
17	55	1010100011769	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.677	2025-12-13 20:27:51.677
18	55	1010100011777	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.684	2025-12-13 20:27:51.684
19	55	1010100011785	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.692	2025-12-13 20:27:51.692
20	55	1010100011793	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.701	2025-12-13 20:27:51.701
21	55	1010100011807	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.71	2025-12-13 20:27:51.71
22	55	1010100011815	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.717	2025-12-13 20:27:51.717
23	55	1010100011823	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.724	2025-12-13 20:27:51.724
24	55	1010100011831	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.731	2025-12-13 20:27:51.731
25	55	1010100011847	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.737	2025-12-13 20:27:51.737
26	55	1010100011858	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.745	2025-12-13 20:27:51.745
27	55	1010100011866	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.754	2025-12-13 20:27:51.754
28	55	1010100011874	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.763	2025-12-13 20:27:51.763
29	55	1010100011882	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.772	2025-12-13 20:27:51.772
30	55	1010100011898	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.782	2025-12-13 20:27:51.782
31	55	1010100011904	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.791	2025-12-13 20:27:51.791
32	55	1010100011912	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.799	2025-12-13 20:27:51.799
33	55	1010100011928	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.807	2025-12-13 20:27:51.807
34	55	1010100011939	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.816	2025-12-13 20:27:51.816
35	55	1010100011947	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.826	2025-12-13 20:27:51.826
36	55	1010100011955	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.835	2025-12-13 20:27:51.835
37	55	1010100011963	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.844	2025-12-13 20:27:51.844
38	55	1850002685954	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.85	2025-12-13 20:27:51.85
39	124	1040000041942	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.857	2025-12-13 20:27:51.857
40	124	1040000047247	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.864	2025-12-13 20:27:51.864
41	124	1850001768888	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.871	2025-12-13 20:27:51.871
42	124	1850002848128	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.878	2025-12-13 20:27:51.878
43	124	1850004546908	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.884	2025-12-13 20:27:51.884
44	125	1170000158611	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.89	2025-12-13 20:27:51.89
45	126	1850003504481	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.897	2025-12-13 20:27:51.897
46	126	1850005938608	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.905	2025-12-13 20:27:51.905
47	127	1850000033194	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.912	2025-12-13 20:27:51.912
48	127	1850000580268	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.92	2025-12-13 20:27:51.92
49	127	1850001290441	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.929	2025-12-13 20:27:51.929
50	127	1850001467503	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.938	2025-12-13 20:27:51.938
51	127	1850001529328	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.947	2025-12-13 20:27:51.947
52	127	1850001886778	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.955	2025-12-13 20:27:51.955
53	127	1850002067932	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.963	2025-12-13 20:27:51.963
54	127	1850002327098	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.971	2025-12-13 20:27:51.971
55	127	1850003308259	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.98	2025-12-13 20:27:51.98
56	127	1850004165397	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.989	2025-12-13 20:27:51.989
57	127	1850004546967	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:51.999	2025-12-13 20:27:51.999
58	127	1850005007698	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.008	2025-12-13 20:27:52.008
59	127	1850005898107	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.016	2025-12-13 20:27:52.016
60	128	1630000056933	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.025	2025-12-13 20:27:52.025
61	129	1850000157209	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.035	2025-12-13 20:27:52.035
62	129	1850001122301	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.045	2025-12-13 20:27:52.045
63	129	1850001453518	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.054	2025-12-13 20:27:52.054
64	129	1850001615847	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.064	2025-12-13 20:27:52.064
65	129	1850004282563	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.074	2025-12-13 20:27:52.074
66	129	1850004385141	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.082	2025-12-13 20:27:52.082
67	129	1850004774857	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.091	2025-12-13 20:27:52.091
68	130	1850004160042	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.1	2025-12-13 20:27:52.1
69	131	1850000635194	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.107	2025-12-13 20:27:52.107
70	132	1850000122097	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.114	2025-12-13 20:27:52.114
71	133	1010100011629	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.121	2025-12-13 20:27:52.121
72	133	1010100011637	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.129	2025-12-13 20:27:52.129
73	133	1010100011645	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.138	2025-12-13 20:27:52.138
74	133	1010100011653	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.147	2025-12-13 20:27:52.147
75	133	1010100011661	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.156	2025-12-13 20:27:52.156
76	133	1010100011677	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.166	2025-12-13 20:27:52.166
77	133	1010100011688	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.174	2025-12-13 20:27:52.174
78	133	1010100011696	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.183	2025-12-13 20:27:52.183
79	133	1010100011707	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.193	2025-12-13 20:27:52.193
80	133	1010100011718	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.202	2025-12-13 20:27:52.202
81	133	1010100011726	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.211	2025-12-13 20:27:52.211
82	133	1010100011734	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.22	2025-12-13 20:27:52.22
83	133	1010100011742	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.228	2025-12-13 20:27:52.228
84	133	1010100011758	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.235	2025-12-13 20:27:52.235
85	133	1010100011769	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.244	2025-12-13 20:27:52.244
86	133	1010100011777	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.253	2025-12-13 20:27:52.253
87	133	1010100011785	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.262	2025-12-13 20:27:52.262
88	133	1010100011793	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.271	2025-12-13 20:27:52.271
89	133	1010100011807	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.28	2025-12-13 20:27:52.28
90	133	1010100011815	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.288	2025-12-13 20:27:52.288
91	133	1010100011823	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.294	2025-12-13 20:27:52.294
92	133	1010100011831	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.3	2025-12-13 20:27:52.3
93	133	1010100011847	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.306	2025-12-13 20:27:52.306
94	133	1010100011858	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.312	2025-12-13 20:27:52.312
95	133	1010100011866	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.32	2025-12-13 20:27:52.32
96	133	1010100011874	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.329	2025-12-13 20:27:52.329
97	133	1010100011882	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.343	2025-12-13 20:27:52.343
98	133	1010100011898	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.355	2025-12-13 20:27:52.355
99	133	1010100011904	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.364	2025-12-13 20:27:52.364
100	133	1010100011912	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.375	2025-12-13 20:27:52.375
101	133	1010100011928	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.387	2025-12-13 20:27:52.387
102	133	1010100011939	t	\N	{PUSH}	t	\N	{PUSH,SMS}	t	t	t	t	{PUSH,SMS,EMAIL}	t	{PUSH,SMS}	ONE_DAY	NEW_DEVICE	{PUSH,EMAIL}	f	\N	\N	2025-12-13 20:27:52.398	2025-12-13 20:27:52.398
\.


--
-- Data for Name: account_alerts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.account_alerts (id, mobile_user_id, account_number, alert_type, alert_data, status, channels_sent, sent_at, delivery_status, acknowledged_at, user_action, triggered_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: admin_web_password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_web_password_reset_tokens (id, token, "expiresAt", "usedAt", user_id, created_at) FROM stdin;
\.


--
-- Data for Name: admin_web_users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_web_users (id, email, "passwordHash", name, "isActive", created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: app_screen_page_workflows; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.app_screen_page_workflows (id, page_id, workflow_id, "order", is_active, config_override, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: app_screen_pages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.app_screen_pages (id, name, icon, "order", is_active, is_testing, screen_id, created_at, updated_at) FROM stdin;
cmj2zuobd0001rl43x63sko7z	Teset	💸	1	t	f	cmj2syoo40000mo3xjoz470a6	2025-12-12 15:00:24.601	2025-12-13 20:05:56.292
cmj2zvf510003rl437dnc60ol	twenty	💳	0	t	f	cmj2syoo40000mo3xjoz470a6	2025-12-12 15:00:59.366	2025-12-13 20:05:56.292
\.


--
-- Data for Name: app_screens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.app_screens (id, name, context, icon, "order", created_at, updated_at, is_active, is_testing) FROM stdin;
cmj2syoo40000mo3xjoz470a6	Transfers	MOBILE_BANKING	💸	0	2025-12-12 11:47:34.373	2025-12-12 11:50:38.69	t	t
\.


--
-- Data for Name: biller_configs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.biller_configs (id, biller_type, biller_name, display_name, description, is_active, base_url, endpoints, authentication, default_currency, supported_currencies, timeout_ms, retry_attempts, features, "validationRules", created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- Data for Name: biller_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.biller_transactions (id, biller_config_id, biller_type, biller_name, our_transaction_id, external_transaction_id, transaction_type, account_number, account_type, customer_account_name, credit_account, credit_account_type, debit_account, debit_account_type, amount, currency, status, api_endpoint, request_payload, response_payload, error_message, error_code, bundle_id, invoice_number, meter_number, metadata, processed_at, completed_at, created_at, updated_at, initiated_by) FROM stdin;
\.


--
-- Data for Name: checkbook_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.checkbook_requests (id, mobile_user_id, account_number, number_of_checkbooks, collection_point, status, requested_at, approved_at, approved_by, ready_at, collected_at, cancelled_at, rejected_at, notes, rejection_reason, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: fdh_account_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fdh_account_categories (id, category, display_to_mobile, created_at, updated_at) FROM stdin;
1	12335	t	2025-12-12 00:53:23.118	2025-12-12 08:40:12.76
4	6001	t	2025-12-13 14:19:51.966	2025-12-13 14:20:17.121
2	6015	t	2025-12-13 14:19:45.725	2025-12-13 15:52:25.174
5	1020	t	2025-12-13 14:19:55.128	2025-12-13 15:52:28.28
3	3128	f	2025-12-13 14:19:48.865	2025-12-13 15:52:44.737
15	1001	t	2025-12-13 14:20:26.544	2025-12-13 16:15:41.822
52	6002	t	2025-12-13 14:30:28.486	2025-12-13 14:30:28.486
\.


--
-- Data for Name: fdh_backups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fdh_backups (id, filename, size_bytes, created_at, storage_url) FROM stdin;
\.


--
-- Data for Name: fdh_beneficiaries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fdh_beneficiaries (id, user_id, name, beneficiary_type, phone_number, account_number, bank_code, bank_name, branch, description, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: fdh_device_login_attempts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fdh_device_login_attempts (id, mobile_user_id, username, context, device_id, device_name, device_model, device_os, ip_address, location, attempt_type, status, failure_reason, otp_code, otp_sent_to, otp_sent_at, otp_expires_at, otp_verified_at, otp_attempts, verification_token, attempted_at) FROM stdin;
cmj22vngn0001pb3x5sf56cja	58	edwin.z.2493	MOBILE_BANKING	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	PENDING_VERIFICATION	\N	302921	+265885460023	2025-12-11 23:37:22.822	2025-12-11 23:47:22.821	\N	0	930eddc8-e126-4c87-a913-7d08918950bc	2025-12-11 23:37:22.822
cmj23cfjy0001pb3x6lge72az	58	edwin.z.2493	MOBILE_BANKING	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	PENDING_VERIFICATION	\N	726460	+265885460023	2025-12-11 23:50:25.725	2025-12-12 00:00:25.724	\N	0	93f6d04a-d230-4ef6-b3d8-0f5e10e452f9	2025-12-11 23:50:25.725
cmj23cl6z0003pb3x10cuakqt	58	edwin.z.2493	MOBILE_BANKING	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	PENDING_VERIFICATION	\N	827122	+265885460023	2025-12-11 23:50:33.034	2025-12-12 00:00:33.034	\N	0	d6570485-2b4b-4947-a16f-5fa2e2e6c6ad	2025-12-11 23:50:33.034
cmj23dx7s0001pb3xif78p985	58	edwin.z.2493	MOBILE_BANKING	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	PENDING_VERIFICATION	\N	300041	+265885460023	2025-12-11 23:51:35.272	2025-12-12 00:01:35.271	\N	0	1adf57b2-43b2-4217-8dfa-cb41a4dba47d	2025-12-11 23:51:35.272
cmj23e8yz0003pb3xlm3551mu	58	edwin.z.2493	MOBILE_BANKING	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	PENDING_VERIFICATION	\N	372767	+265885460023	2025-12-11 23:51:50.506	2025-12-12 00:01:50.506	\N	0	9f8379ac-8cb2-4ba9-a95a-d52a92e3270d	2025-12-11 23:51:50.506
cmj23wv3q0001pb3wm8f29145	58	edwin.z.2493	MOBILE_BANKING	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	PENDING_VERIFICATION	\N	629801	+265885460023	2025-12-12 00:06:18.998	2025-12-12 00:16:18.997	\N	0	d12e6af6-11c4-48a2-ae18-5cad8b51d6b9	2025-12-12 00:06:18.998
cmj2pozii000kmo43z9bok7es	23	265977396223	WALLET	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	VERIFIED	\N	191257	265977396223	2025-12-12 10:16:03.017	2025-12-12 10:26:03.017	2025-12-12 10:16:22.207	0	74cbb00d-ca91-4dc6-b0f5-ed48e5548f9c	2025-12-12 10:16:03.017
cmj242e9k0003pb3wfqkfctkl	58	edwin.z.2493	MOBILE_BANKING	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	VERIFIED	\N	411315	+265885460023	2025-12-12 00:15:57.975	2025-12-12 00:25:57.975	2025-12-12 00:16:09.312	0	5444b416-6213-4004-9659-f159425cb7cd	2025-12-12 00:10:37.111
cmj24tfhz0003pb3xt58vjhmg	58	edwin.z.2493	MOBILE_BANKING	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	SUCCESS	\N	\N	\N	\N	\N	\N	0	\N	2025-12-12 00:31:38.422
cmj25g6jv0005pb3x7hn70cp4	58	edwin.z.2493	MOBILE_BANKING	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	SUCCESS	\N	\N	\N	\N	\N	\N	0	\N	2025-12-12 00:49:19.914
cmj25ni130001pb43zqkhivj7	58	edwin.z.2493	MOBILE_BANKING	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	SUCCESS	\N	\N	\N	\N	\N	\N	0	\N	2025-12-12 00:55:01.382
cmj263i6g0003pb43kuwyibbz	58	edwin.z.2493	MOBILE_BANKING	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	SUCCESS	\N	\N	\N	\N	\N	\N	0	\N	2025-12-12 01:07:28.071
cmj264hx60005pb43tvdbji5s	58	edwin.z.2493	MOBILE_BANKING	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	SUCCESS	\N	\N	\N	\N	\N	\N	0	\N	2025-12-12 01:08:14.393
cmj26776k0007pb43rzsyjhtg	58	edwin.z.2493	MOBILE_BANKING	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	SUCCESS	\N	\N	\N	\N	\N	\N	0	\N	2025-12-12 01:10:20.443
cmj26z1el0001pb3xw39t3h94	58	edwin.z.2493	MOBILE_BANKING	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	SUCCESS	\N	\N	\N	\N	\N	\N	0	\N	2025-12-12 01:31:59.324
cmj26zms80003pb3xegk0imrt	58	edwin.z.2493	MOBILE_BANKING	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	SUCCESS	\N	\N	\N	\N	\N	\N	0	\N	2025-12-12 01:32:27.031
cmj27fs8x0005pb3xsirf7dhn	58	edwin.z.2493	MOBILE_BANKING	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	SUCCESS	\N	\N	\N	\N	\N	\N	0	\N	2025-12-12 01:45:00.609
cmj28ag0d0007pb3xztj9op93	58	edwin.z.2493	MOBILE_BANKING	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	SUCCESS	\N	\N	\N	\N	\N	\N	0	\N	2025-12-12 02:08:51.084
cmj2mnyw00000my3w1txs060s	\N	+265977396223	WALLET	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	FAILED_CREDENTIALS	Invalid username or password	\N	\N	\N	\N	\N	0	\N	2025-12-12 08:51:16.703
cmj2mo85t0001my3wnag7i4gc	\N	+265977396223	WALLET	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	FAILED_CREDENTIALS	Invalid username or password	\N	\N	\N	\N	\N	0	\N	2025-12-12 08:51:28.72
cmj2ogl3b0001mo3xolx2bwb2	58	edwin.z.2493	MOBILE_BANKING	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	SUCCESS	\N	\N	\N	\N	\N	\N	0	\N	2025-12-12 09:41:31.462
cmj2ol2ld0004mo3xk0moz2k7	\N	+265977396223	WALLET	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	FAILED_CREDENTIALS	Invalid username or password	\N	\N	\N	\N	\N	0	\N	2025-12-12 09:45:00.768
cmj2oo0uy0005mo3xi7szci5u	\N	+265977396223	WALLET	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	FAILED_CREDENTIALS	Invalid username or password	\N	\N	\N	\N	\N	0	\N	2025-12-12 09:47:18.489
cmj2ouaru0006mo3xqdww7034	\N	+265977396223	WALLET	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	FAILED_CREDENTIALS	Invalid username or password	\N	\N	\N	\N	\N	0	\N	2025-12-12 09:52:11.273
cmj2p21na0007mo3xodlk53rm	\N	+265977396223	WALLET	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	FAILED_CREDENTIALS	Invalid username or password	\N	\N	\N	\N	\N	0	\N	2025-12-12 09:58:12.693
cmj2p3iku0008mo3xtx8pvxdj	\N	+265977396223	WALLET	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	FAILED_CREDENTIALS	Invalid username or password	\N	\N	\N	\N	\N	0	\N	2025-12-12 09:59:21.293
cmj2p3rgi0009mo3x39x4m0a1	\N	+265977396223	WALLET	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	FAILED_CREDENTIALS	Invalid username or password	\N	\N	\N	\N	\N	0	\N	2025-12-12 09:59:32.801
cmj2p552a000amo3xve74vwwd	\N	+265977396223	WALLET	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	FAILED_CREDENTIALS	Invalid username or password	\N	\N	\N	\N	\N	0	\N	2025-12-12 10:00:37.089
cmj2p5tx10000mo430w9o9agr	\N	+265977396223	WALLET	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	FAILED_CREDENTIALS	Invalid username or password	\N	\N	\N	\N	\N	0	\N	2025-12-12 10:01:09.3
cmj2p7jqp0001mo43q5x2czr5	\N	+265977396223	WALLET	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	FAILED_CREDENTIALS	Invalid username or password	\N	\N	\N	\N	\N	0	\N	2025-12-12 10:02:29.424
cmj2pgs3u0003mo43wec8g4v2	23	265977396223	WALLET	test-device-curl-001	Curl Test Device	\N	\N	\N	\N	PASSWORD_LOGIN	PENDING_VERIFICATION	\N	615119	265977396223	2025-12-12 10:09:40.169	2025-12-12 10:19:40.169	\N	0	c69646a6-2d2c-4117-8088-abf6c81ee500	2025-12-12 10:09:40.169
cmj2pgxlm0005mo435o9ys5ga	23	265977396223	WALLET	test-device-curl-001	Curl Test Device	\N	\N	\N	\N	PASSWORD_LOGIN	PENDING_VERIFICATION	\N	576741	265977396223	2025-12-12 10:09:47.289	2025-12-12 10:19:47.289	\N	0	741db618-a185-4d97-bd49-697dc5a3ef14	2025-12-12 10:09:47.289
cmj2piaak0007mo43d4da82ca	23	265977396223	WALLET	test-device-curl-001	Curl Test Device	\N	\N	\N	\N	PASSWORD_LOGIN	PENDING_VERIFICATION	\N	361312	265977396223	2025-12-12 10:10:50.395	2025-12-12 10:20:50.395	\N	0	11a77cc3-67d4-4e56-97cc-193f6921c00f	2025-12-12 10:10:50.395
cmj2pivcd0009mo43fql73sz7	58	edwin.z.2493	MOBILE_BANKING	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	SUCCESS	\N	\N	\N	\N	\N	\N	0	\N	2025-12-12 10:11:17.676
cmj2pjwxa000cmo43by29zuwh	\N	test_banking_user	MOBILE_BANKING	test-device-001	Test Device	\N	\N	\N	\N	PASSWORD_LOGIN	FAILED_CREDENTIALS	Invalid username or password	\N	\N	\N	\N	\N	0	\N	2025-12-12 10:12:06.38
cmj2pkn2l000dmo43go3y6jne	\N	2659777396223	WALLET	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	FAILED_CREDENTIALS	Invalid username or password	\N	\N	\N	\N	\N	0	\N	2025-12-12 10:12:40.268
cmj2pldlj000emo435ec58hja	\N	2659777396223	WALLET	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	FAILED_CREDENTIALS	Invalid username or password	\N	\N	\N	\N	\N	0	\N	2025-12-12 10:13:14.647
cmj2pnj4v000gmo43u7se5oks	23	265977396223	WALLET	curl-test-002	Curl Test 2	\N	\N	\N	\N	PASSWORD_LOGIN	PENDING_VERIFICATION	\N	371080	265977396223	2025-12-12 10:14:55.134	2025-12-12 10:24:55.134	\N	0	0aa17cb3-106b-4781-8ece-433b53f8a8ce	2025-12-12 10:14:55.134
cmj2pnr5p000imo43vvthbwop	23	265977396223	WALLET	curl-test-003	Curl Test 3	\N	\N	\N	\N	PASSWORD_LOGIN	PENDING_VERIFICATION	\N	357776	265977396223	2025-12-12 10:15:05.532	2025-12-12 10:25:05.531	\N	0	59f509cf-af2e-4463-a95e-f9bd5c2b189d	2025-12-12 10:15:05.532
cmj2qwdcs0001mo3xcbij22x2	58	edwin.z.2493	MOBILE_BANKING	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	SUCCESS	\N	\N	\N	\N	\N	\N	0	\N	2025-12-12 10:49:47.163
cmj2qyxok0005mo3x3aj8l9ly	23	265977396223	WALLET	curl-test-004	Curl Test 4	\N	\N	\N	\N	PASSWORD_LOGIN	PENDING_APPROVAL	\N	\N	\N	\N	\N	\N	0	\N	2025-12-12 10:51:46.819
cmj2r43t30007mo3xs54kj4fo	58	edwin.z.2493	MOBILE_BANKING	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	SUCCESS	\N	\N	\N	\N	\N	\N	0	\N	2025-12-12 10:55:48.038
cmj2rc86c000bmo3xehv7lg2k	58	edwin.z.2493	MOBILE_BANKING	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	SUCCESS	\N	\N	\N	\N	\N	\N	0	\N	2025-12-12 11:02:06.947
cmj2ri1wg000fmo3xwpouzgky	58	edwin.z.2493	MOBILE_BANKING	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	SUCCESS	\N	\N	\N	\N	\N	\N	0	\N	2025-12-12 11:06:38.751
cmj2rjc0n000imo3x5e478w05	\N	testuser	MOBILE_BANKING	test-device-local	Test Device	\N	\N	\N	\N	PASSWORD_LOGIN	FAILED_CREDENTIALS	Invalid username or password	\N	\N	\N	\N	\N	0	\N	2025-12-12 11:07:38.518
cmj2s2rvd000kmo3x3x7bhq1d	58	edwin.z.2493	MOBILE_BANKING	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	SUCCESS	\N	\N	\N	\N	\N	\N	0	\N	2025-12-12 11:22:45.527
cmj2u93k20001qx3x543oke89	58	edwin.z.2493	MOBILE_BANKING	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	SUCCESS	\N	\N	\N	\N	\N	\N	0	\N	2025-12-12 12:23:39.841
cmj2us7uv0001qx3xv3j02paz	58	edwin.z.2493	MOBILE_BANKING	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	SUCCESS	\N	\N	\N	\N	\N	\N	0	\N	2025-12-12 12:38:31.878
cmj2wd9ha0001qx43fi57um2e	58	edwin.z.2493	MOBILE_BANKING	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	SUCCESS	\N	\N	\N	\N	\N	\N	0	\N	2025-12-12 13:22:53.373
cmj49q3ol0001rl3xy99vx1us	58	edwin.z.2493	MOBILE_BANKING	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	SUCCESS	\N	\N	\N	\N	\N	\N	0	\N	2025-12-13 12:24:33.572
cmj4k6wbw0001li3xtii178dc	58	edwin.z.2493	MOBILE_BANKING	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	SUCCESS	\N	\N	\N	\N	\N	\N	0	\N	2025-12-13 17:17:33.355
cmj4kcrs70007li3xa3jsrk8j	58	\N	\N	BP1A.250505.005	\N	\N	\N	\N	\N	PASSWORD_LOGIN	SUCCESS	\N	\N	\N	\N	\N	\N	0	\N	2025-12-13 17:22:07.398
cmj4kimhs000bli3xnud5t4xp	58	\N	\N	BP1A.250505.005	\N	\N	\N	\N	\N	PASSWORD_LOGIN	SUCCESS	\N	\N	\N	\N	\N	\N	0	\N	2025-12-13 17:26:40.477
cmj4koh7l000fli3xdlmmg9fq	58	\N	\N	BP1A.250505.005	\N	\N	\N	\N	\N	PASSWORD_LOGIN	SUCCESS	\N	\N	\N	\N	\N	\N	0	\N	2025-12-13 17:31:13.568
cmj4kucfg000jli3x8t4notbk	58	\N	\N	BP1A.250505.005	\N	\N	\N	\N	\N	PASSWORD_LOGIN	SUCCESS	\N	\N	\N	\N	\N	\N	0	\N	2025-12-13 17:35:47.307
cmj4l07nj000nli3xbypcjsst	58	\N	\N	BP1A.250505.005	\N	\N	\N	\N	\N	PASSWORD_LOGIN	SUCCESS	\N	\N	\N	\N	\N	\N	0	\N	2025-12-13 17:40:21.054
cmj4nek2e000pli3xxpaxcn86	58	edwin.z.2493	MOBILE_BANKING	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	SUCCESS	\N	\N	\N	\N	\N	\N	0	\N	2025-12-13 18:47:29.557
cmj4nkfki000vli3xasviyzg4	58	\N	\N	BP1A.250505.005	\N	\N	\N	\N	\N	PASSWORD_LOGIN	SUCCESS	\N	\N	\N	\N	\N	\N	0	\N	2025-12-13 18:52:03.665
cmj4nqav5000zli3x2zxnn4ta	58	\N	\N	BP1A.250505.005	\N	\N	\N	\N	\N	PASSWORD_LOGIN	SUCCESS	\N	\N	\N	\N	\N	\N	0	\N	2025-12-13 18:56:37.504
cmj4nw5tm0013li3xclvxjx87	58	\N	\N	BP1A.250505.005	\N	\N	\N	\N	\N	PASSWORD_LOGIN	SUCCESS	\N	\N	\N	\N	\N	\N	0	\N	2025-12-13 19:01:10.906
cmj4oi4nx0015li3x38mncmfz	58	edwin.z.2493	MOBILE_BANKING	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	SUCCESS	\N	\N	\N	\N	\N	\N	0	\N	2025-12-13 19:18:15.835
cmj4oo1kh0003li43i56o7uqn	58	\N	\N	BP1A.250505.005	\N	\N	\N	\N	\N	PASSWORD_LOGIN	SUCCESS	\N	\N	\N	\N	\N	\N	0	\N	2025-12-13 19:22:51.761
cmj4otzcx0007li439p80lh9i	58	\N	\N	BP1A.250505.005	\N	\N	\N	\N	\N	PASSWORD_LOGIN	SUCCESS	\N	\N	\N	\N	\N	\N	0	\N	2025-12-13 19:27:28.833
cmj4ozw0v0003li3xjnnm5807	58	\N	\N	BP1A.250505.005	\N	\N	\N	\N	\N	PASSWORD_LOGIN	SUCCESS	\N	\N	\N	\N	\N	\N	0	\N	2025-12-13 19:32:04.445
cmj4p5sbn0007li3xetszpqcl	58	\N	\N	BP1A.250505.005	\N	\N	\N	\N	\N	PASSWORD_LOGIN	SUCCESS	\N	\N	\N	\N	\N	\N	0	\N	2025-12-13 19:36:39.586
cmj4pbpwj000bli3x47j6jiuh	58	\N	\N	BP1A.250505.005	\N	\N	\N	\N	\N	PASSWORD_LOGIN	SUCCESS	\N	\N	\N	\N	\N	\N	0	\N	2025-12-13 19:41:16.387
cmj4pokn5000dli3xaa25vcof	58	edwin.z.2493	MOBILE_BANKING	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	SUCCESS	\N	\N	\N	\N	\N	\N	0	\N	2025-12-13 19:51:16.097
cmj4pufkx000jli3xjmjemvvd	58	\N	\N	BP1A.250505.005	\N	\N	\N	\N	\N	PASSWORD_LOGIN	SUCCESS	\N	\N	\N	\N	\N	\N	0	\N	2025-12-13 19:55:49.472
cmj4q1j5v000lli3xe377st86	58	edwin.z.2493	MOBILE_BANKING	BP1A.250505.005	Xiaomi Mi MIX 3	\N	\N	\N	\N	PASSWORD_LOGIN	SUCCESS	\N	\N	\N	\N	\N	\N	0	\N	2025-12-13 20:01:20.706
cmj4q7yk1000rli3xb1fcl6pv	58	\N	\N	BP1A.250505.005	\N	\N	\N	\N	\N	PASSWORD_LOGIN	SUCCESS	\N	\N	\N	\N	\N	\N	0	\N	2025-12-13 20:06:20.591
\.


--
-- Data for Name: fdh_device_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fdh_device_sessions (id, device_id, mobile_user_id, "tokenHash", session_id, is_active, expires_at, last_activity_at, ip_address, user_agent, created_at, revoked_at) FROM stdin;
cmj2ogl3w0003mo3xrvjvqkbq	BP1A.250505.005	58	16bbc97f917ec3a3bff799ac17698f67430a48b7b0134e8c73c5e93fac65752a	80238655-c2f1-4650-b061-4e38172fefae	t	2025-12-19 09:41:31.483	2025-12-12 09:41:31.484	\N	Xiaomi Mi MIX 3	2025-12-12 09:41:31.484	\N
cmj2pivd3000bmo43jlaw9pae	BP1A.250505.005	58	c79aa01004ed65d68d4d834de96ee1fb1b2b3a571dc4443b8b9d6aadc8563d2e	ef689da9-f114-4276-82f4-e5db0c65e953	t	2025-12-19 10:11:17.701	2025-12-12 10:11:17.703	\N	Xiaomi Mi MIX 3	2025-12-12 10:11:17.703	\N
cmj2ppec4000omo43oyby19ai	BP1A.250505.005	23	97ae781a20a4c51c43ab475e7f65c1e66b8e3651fe14fbcc789919f040dcc1bb	c16bfb94-e897-4d9f-b7e5-954c2cb71c83	t	2025-12-19 10:16:22.226	2025-12-12 10:16:22.228	\N	\N	2025-12-12 10:16:22.228	\N
cmj2qwddb0003mo3x67xtl2p3	BP1A.250505.005	58	eea51fc1df9b1030c852c9b997878fb4cfb48f4430eb21972db676bed760320e	8155732c-b41b-4b81-a48e-f4f1fddcaa4d	t	2025-12-19 10:49:47.182	2025-12-12 10:49:47.183	\N	Xiaomi Mi MIX 3	2025-12-12 10:49:47.183	\N
cmj2r43tq0009mo3xsqw5g9qq	BP1A.250505.005	58	3cd987a21160addd9c7bc5a0e344624bd4020754a20223a93f6812a96d6502c5	3b392de0-d675-4efc-9e0e-c131c992001c	t	2025-12-19 10:55:48.06	2025-12-12 10:55:48.063	\N	Xiaomi Mi MIX 3	2025-12-12 10:55:48.063	\N
cmj2rc86y000dmo3x45lscdnz	BP1A.250505.005	58	def266d57e3dfc6c643e0911ab2f85a755f8262d1c2f6b627d7eeabe608c1ec7	90e963db-d712-4b61-a070-ed931c673ba8	t	2025-12-19 11:02:06.969	2025-12-12 11:02:06.971	\N	Xiaomi Mi MIX 3	2025-12-12 11:02:06.971	\N
cmj2ri1wx000hmo3xk500ld45	BP1A.250505.005	58	e86c5a2fcf3a22bcabdeb9374746f034e1160278384fb59865579d9e1517377b	ad6af899-0752-4c28-aa39-10c7158d037e	t	2025-12-19 11:06:38.768	2025-12-12 11:06:38.77	\N	Xiaomi Mi MIX 3	2025-12-12 11:06:38.77	\N
cmj2s2rw3000mmo3x3pijl6di	BP1A.250505.005	58	1a3ad79ed17861a08ee49d467028b1f6aaf4a8dbb8b25f8e6586a3b7a84d0aff	70c72ba6-c076-4d80-9345-550b0c30a925	t	2025-12-19 11:22:45.554	2025-12-12 11:22:45.556	\N	Xiaomi Mi MIX 3	2025-12-12 11:22:45.556	\N
cmj2u93ku0003qx3x4bcmjnfk	BP1A.250505.005	58	103840ad8c6e934f5db3681f9d8f263e114dfe3a46b4847d77cfa48a62370c4a	2b60bd7d-bf6d-4032-a1ee-1cfa6075abe3	t	2025-12-19 12:23:39.867	2025-12-12 12:23:39.87	\N	Xiaomi Mi MIX 3	2025-12-12 12:23:39.87	\N
cmj2us7vb0003qx3xkvi2dnin	BP1A.250505.005	58	05538deed6ba8d9e3a5eca9bfb8909f7d71e5d7bf113cbdb9c32e64a0fedb8ee	0ccc051e-973e-453e-a666-0e2a99653783	t	2025-12-19 12:38:31.894	2025-12-12 12:38:31.895	\N	Xiaomi Mi MIX 3	2025-12-12 12:38:31.895	\N
cmj2wd9hn0003qx432tqsoqec	BP1A.250505.005	58	d4b512ec42d5f3253153d33c1925d2f2ba4fe8385466d96b2f8c4c67274db4b8	5f3828ad-6a69-4e58-9bd7-b64e9bddfc46	t	2025-12-19 13:22:53.386	2025-12-12 13:22:53.387	\N	Xiaomi Mi MIX 3	2025-12-12 13:22:53.387	\N
cmj49q3p10003rl3xjsey6vdj	BP1A.250505.005	58	5600096f218edc15cce8f38698f08288d112bdfe6214289a289b512971b7c75d	a51458f6-ae70-4645-a5df-edd78f71c369	t	2025-12-20 12:24:33.588	2025-12-13 12:24:33.589	\N	Xiaomi Mi MIX 3	2025-12-13 12:24:33.589	\N
cmj4k6wca0003li3xpbqw8qgk	BP1A.250505.005	58	9dcd0bb44485ecd38d1a48c8862f430171d2e3437341b4f15b44f58ef37dca9a	fd33d22a-957a-40dd-b8bc-490af5a3efc2	f	2025-12-20 17:17:33.369	2025-12-13 17:17:33.37	\N	Xiaomi Mi MIX 3	2025-12-13 17:17:33.37	2025-12-13 17:22:07.381
cmj4kcrs10005li3xw4mb4cnf	BP1A.250505.005	58	577336087556f420addbc26b87bfa0f6657f1e523d99cf1a60ff059224c63173	c112be2a-2e9e-4e04-bb90-43d16d91bf5d	f	2025-12-20 17:22:07.393	2025-12-13 17:22:07.394	\N	Xiaomi Mi MIX 3	2025-12-13 17:22:07.394	2025-12-13 17:26:40.442
cmj4kimhh0009li3xe44lqm9w	BP1A.250505.005	58	ca340542b8ac734a2b00972c980b91b112fc02612e506bd4b1e2e24535d7b128	bca6b0ee-4aff-448e-8347-115ddbbaa94e	f	2025-12-20 17:26:40.468	2025-12-13 17:26:40.469	\N	Xiaomi Mi MIX 3	2025-12-13 17:26:40.469	2025-12-13 17:31:13.549
cmj4koh7f000dli3x8wuz7czq	BP1A.250505.005	58	16fb9d4fc6e9521af6efca0a5ee986f42bb167eefc18325b03cb4d2f35550504	cd7618f5-7ca7-418b-ac6b-74285ac8cc74	f	2025-12-20 17:31:13.562	2025-12-13 17:31:13.564	\N	Xiaomi Mi MIX 3	2025-12-13 17:31:13.564	2025-12-13 17:35:47.29
cmj4kucfa000hli3x0ldrf37a	BP1A.250505.005	58	3d4eddb84ab32677d896e645a771874a59ffdc31b570c02e72ebea8c7aeac185	6a5bac3c-0b7b-4f72-9923-61f562e17999	f	2025-12-20 17:35:47.301	2025-12-13 17:35:47.302	\N	Xiaomi Mi MIX 3	2025-12-13 17:35:47.302	2025-12-13 17:40:21.04
cmj4l07ne000lli3xk3eclb74	BP1A.250505.005	58	bb5cb748c85b0da657f2cfa782e0a091cb156d434d4968c618431e4f7586ac6e	65991bc1-2386-4c9b-805c-849aaed6667a	t	2025-12-20 17:40:21.049	2025-12-13 17:40:21.05	\N	Xiaomi Mi MIX 3	2025-12-13 17:40:21.05	\N
cmj4nek2q000rli3x4byvrmdz	BP1A.250505.005	58	ad7a4784e4ec6005f341ed2ef7d1c648ede161fee5b405b9e731450f649e0c4c	4a563add-557d-420a-9623-bf1286816bc7	f	2025-12-20 18:47:29.57	2025-12-13 18:47:29.571	\N	Xiaomi Mi MIX 3	2025-12-13 18:47:29.571	2025-12-13 18:52:03.652
cmj4nkfkd000tli3x9lqq1hxf	BP1A.250505.005	58	b679f3d13749acd144eb163c0524c65c0163e33cc19588faa479f1de18b46afb	8f57008c-3bdf-4cac-a35a-ecde538e91ab	f	2025-12-20 18:52:03.66	2025-12-13 18:52:03.661	\N	Xiaomi Mi MIX 3	2025-12-13 18:52:03.661	2025-12-13 18:56:37.491
cmj4nqav0000xli3xjsidluoa	BP1A.250505.005	58	847cdeebbfc166e378fec412fbead2b1fbb9bdbe434120323de44b2309901225	a6cc9945-1959-4a3a-811d-c7cfb8aabcc3	f	2025-12-20 18:56:37.499	2025-12-13 18:56:37.5	\N	Xiaomi Mi MIX 3	2025-12-13 18:56:37.5	2025-12-13 19:01:10.892
cmj4nw5th0011li3xlwi89dot	BP1A.250505.005	58	3cbd75ffaa91a8f4e41ad01c52b556050a29aca82ac23ebff8b3ad80ceb89b5e	67c8f797-1b81-41c7-a5db-2cfee2995c8e	t	2025-12-20 19:01:10.9	2025-12-13 19:01:10.902	\N	Xiaomi Mi MIX 3	2025-12-13 19:01:10.902	\N
cmj4oi4od0017li3xajx35ox0	BP1A.250505.005	58	874eec7477d48df850600f3e2b6a624c3b33c1015efc193ad187e690edaa3542	927f7584-cd05-409a-8f47-43ff5c903224	f	2025-12-20 19:18:15.852	2025-12-13 19:18:15.853	\N	Xiaomi Mi MIX 3	2025-12-13 19:18:15.853	2025-12-13 19:22:51.746
cmj4oo1kc0001li43npm8bmv9	BP1A.250505.005	58	0f9d99127472e5cf210b39dc106312b6ee4e79b6bc6f0fb91efd43e3770b4a87	be0e557e-955d-47af-a5d9-4585bab29841	f	2025-12-20 19:22:51.755	2025-12-13 19:22:51.756	\N	Xiaomi Mi MIX 3	2025-12-13 19:22:51.756	2025-12-13 19:27:28.811
cmj4otzcs0005li439fuupqx2	BP1A.250505.005	58	0165d39188ca1d0a23b7e3afe5dac1d728a1385f6a7df08f1baa5220787416ff	713f0fef-f14b-4d75-8e01-1d27a46a6b63	f	2025-12-20 19:27:28.826	2025-12-13 19:27:28.828	\N	Xiaomi Mi MIX 3	2025-12-13 19:27:28.828	2025-12-13 19:32:04.422
cmj4ozw0n0001li3xb99iizx0	BP1A.250505.005	58	c8889436046659db558b28a7379320d9105558490c3aff4e3eb4a1466836c3ff	258470e8-4701-477d-b53b-735511e9a43b	f	2025-12-20 19:32:04.437	2025-12-13 19:32:04.439	\N	Xiaomi Mi MIX 3	2025-12-13 19:32:04.439	2025-12-13 19:36:39.574
cmj4p5sbi0005li3xsw32kss1	BP1A.250505.005	58	61aa83499c3c6aec0f0640c01742375f6daa9b33e54dcad4da43d8db29bcd11d	925f17f3-6a3a-4c94-9bc6-54136f7f5f88	f	2025-12-20 19:36:39.581	2025-12-13 19:36:39.582	\N	Xiaomi Mi MIX 3	2025-12-13 19:36:39.582	2025-12-13 19:41:16.374
cmj4pbpwe0009li3xaqvu221m	BP1A.250505.005	58	b684d6c08543b09ccf4b6f98c62ce4890d00e8e136ee5228754694863e0e3141	4dbd6104-e6d6-4bdb-ab6b-3af24a8e4839	t	2025-12-20 19:41:16.381	2025-12-13 19:41:16.382	\N	Xiaomi Mi MIX 3	2025-12-13 19:41:16.382	\N
cmj4poknk000fli3xvrul5uhz	BP1A.250505.005	58	4eeed29176c8280cbee9b2b2b8b2b45b81556e67d80d878beda92aae40abb58b	b6dbf87a-b450-49af-a2d5-c3a4794f3930	f	2025-12-20 19:51:16.111	2025-12-13 19:51:16.112	\N	Xiaomi Mi MIX 3	2025-12-13 19:51:16.112	2025-12-13 19:55:49.455
cmj4pufkq000hli3xu1r8axxs	BP1A.250505.005	58	df5c6df121e1d2ef108d51366da45ec51ff4be87ddbf76fe578423939923c6e5	5d47422f-fcd1-42e7-8309-343afbe14b7a	t	2025-12-20 19:55:49.464	2025-12-13 19:55:49.466	\N	Xiaomi Mi MIX 3	2025-12-13 19:55:49.466	\N
cmj4q1j68000nli3xjwgu0eeu	BP1A.250505.005	58	cac2f5687d4bea691390ecfcfad9b206cb5b26a654ab2cadbf8cab00bffe7b12	199f9cd1-fbca-4903-a822-862280cd21d3	f	2025-12-20 20:01:20.72	2025-12-13 20:01:20.721	\N	Xiaomi Mi MIX 3	2025-12-13 20:01:20.721	2025-12-13 20:06:20.571
cmj4q7yjt000pli3xs5wazmpu	BP1A.250505.005	58	0008a925602546f258ddd62a2f6e30e5f6ea894fb7fd33c959d0acb293d9e98d	e718fc4e-fd2f-4933-b890-cfe7bcbffa0a	t	2025-12-20 20:06:20.583	2025-12-13 20:06:20.585	\N	Xiaomi Mi MIX 3	2025-12-13 20:06:20.585	\N
\.


--
-- Data for Name: fdh_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fdh_migrations (id, name, description, "sourceConnectionId", "sourceQuery", "targetTable", "targetInsertQuery", status, "lastRunAt", "lastRunSuccess", "lastRunMessage", "lastRunRowsAffected", "createdAt", "updatedAt", cron_expression, is_recurring, next_run_at) FROM stdin;
1	Get users	\N	1	SELECT "context", "username", "phoneNumber", "passwordHash", "customerNumber" FROM fdh_mobile_users	fdh_mobile_users	INSERT INTO fdh_mobile_users ("context", "username", "phoneNumber", "passwordHash", "customerNumber", "created_at", "updated_at") VALUES ({{context}}, {{username}}, {{phoneNumber}}, {{passwordHash}}, {{customerNumber}}, NOW(), NOW())	COMPLETED	2025-12-13 14:07:46.337	t	Successfully migrated 70 rows.	70	2025-12-11 22:00:00.062	2025-12-13 14:07:46.339	\N	f	\N
\.


--
-- Data for Name: fdh_mobile_user_accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fdh_mobile_user_accounts (id, mobile_user_id, account_number, account_name, account_type, currency, balance, is_primary, is_active, created_at, updated_at, available_balance, cleared_balance, working_balance, category_id, category_name, account_status, holder_name, nick_name, online_limit, opening_date) FROM stdin;
10	55	1010100011707	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 13:09:01.092	2025-12-13 13:32:01.828	\N	\N	\N	Platinum	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
11	55	1010100011718	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 13:09:01.098	2025-12-13 13:32:05.145	\N	\N	\N	Platinum	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
12	55	1010100011726	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 13:09:01.104	2025-12-13 13:32:08.45	\N	\N	\N	Platinum	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
13	55	1010100011734	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 13:09:01.11	2025-12-13 13:32:11.984	\N	\N	\N	Platinum	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
14	55	1010100011742	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 13:09:01.117	2025-12-13 13:32:15.422	\N	\N	\N	Platinum	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
15	55	1010100011758	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 13:09:01.126	2025-12-13 13:32:18.735	\N	\N	\N	Platinum	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
16	55	1010100011769	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 13:09:01.131	2025-12-13 13:32:22.047	\N	\N	\N	Platinum	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
17	55	1010100011777	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 13:09:01.137	2025-12-13 13:32:25.379	\N	\N	\N	Platinum	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
18	55	1010100011785	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 13:09:01.142	2025-12-13 13:32:28.712	\N	\N	\N	Platinum	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
19	55	1010100011793	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 13:09:01.147	2025-12-13 13:32:32.062	\N	\N	\N	Platinum	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
20	55	1010100011807	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 13:09:01.152	2025-12-13 13:32:35.454	\N	\N	\N	Platinum	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
24	55	1010100011847	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 13:09:01.174	2025-12-13 13:42:13.691	\N	\N	\N	Platinum	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
25	55	1010100011858	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 13:09:01.18	2025-12-13 13:42:16.961	\N	\N	\N	Platinum	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
21	55	1010100011815	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 13:09:01.158	2025-12-13 13:42:03.76	\N	\N	\N	Platinum	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
22	55	1010100011823	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 13:09:01.163	2025-12-13 13:42:07.094	\N	\N	\N	Platinum	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
23	55	1010100011831	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 13:09:01.169	2025-12-13 13:42:10.398	\N	\N	\N	Platinum	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
26	55	1010100011866	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 13:09:01.185	2025-12-13 13:42:20.273	\N	\N	\N	Platinum	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
27	55	1010100011874	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 13:09:01.191	2025-12-13 13:42:23.558	\N	\N	\N	Platinum	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
28	55	1010100011882	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 13:09:01.196	2025-12-13 13:42:26.879	\N	\N	\N	Platinum	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
29	55	1010100011898	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 13:09:01.201	2025-12-13 13:42:30.175	\N	\N	\N	Platinum	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
2	55	1010100011629	HELBERT CHIKWAWA	\N	MWK	200000.00	f	t	2025-12-13 13:09:01.041	2025-12-13 13:31:34.781	200000.00	200000.00	200000.00	Platinum	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
3	55	1010100011637	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 13:09:01.052	2025-12-13 13:31:38.132	\N	\N	\N	Platinum	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
4	55	1010100011645	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 13:09:01.058	2025-12-13 13:31:41.483	\N	\N	\N	Platinum	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
5	55	1010100011653	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 13:09:01.063	2025-12-13 13:31:44.907	\N	\N	\N	Platinum	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
6	55	1010100011661	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 13:09:01.069	2025-12-13 13:31:48.255	\N	\N	\N	Platinum	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
7	55	1010100011677	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 13:09:01.074	2025-12-13 13:31:51.676	\N	\N	\N	Platinum	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
8	55	1010100011688	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 13:09:01.08	2025-12-13 13:31:54.991	\N	\N	\N	Platinum	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
9	55	1010100011696	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 13:09:01.086	2025-12-13 13:31:58.424	\N	\N	\N	Platinum	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
30	55	1010100011904	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 13:09:01.207	2025-12-13 13:42:33.467	\N	\N	\N	Platinum	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
31	55	1010100011912	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 13:09:01.212	2025-12-13 13:42:36.759	\N	\N	\N	Platinum	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
32	55	1010100011928	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 13:09:01.218	2025-12-13 13:42:40.05	\N	\N	\N	Platinum	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
33	55	1010100011939	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 13:09:01.223	2025-12-13 13:42:43.418	\N	\N	\N	Platinum	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
34	55	1010100011947	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 13:09:01.228	2025-12-13 13:42:46.714	\N	\N	\N	Platinum	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
35	55	1010100011955	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 13:09:01.234	2025-12-13 13:42:50.019	\N	\N	\N	Platinum	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
36	55	1010100011963	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 13:09:01.241	2025-12-13 13:42:53.29	\N	\N	\N	Platinum	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
37	55	1850002685954	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 13:09:01.247	2025-12-13 14:19:45.717	\N	\N	\N	6015	Savings Account - Premium	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2022-06-29
42	124	1850004546908	FDH MOBILE LOAN	\N	MWK	1006000.00	f	t	2025-12-13 14:08:42.311	2025-12-13 14:29:04.79	1006000.00	1006000.00	1006000.00	3128	FDH MOBILE LOAN	Active	FDH MOBILE LOAN	NOLIMIT	NOLIMIT	2023-10-20
44	126	1850003504481	AARON PHIRI	\N	MWK	\N	f	t	2025-12-13 14:08:44.214	2025-12-13 14:09:31.304	\N	\N	\N	6001	Savings Account - Ordinary	Active	AARON PHIRI	NOLIMIT	NOLIMIT	2023-02-08
47	127	1850000580268	FDH MOBILE LOAN	\N	MWK	\N	f	t	2025-12-13 14:08:45.137	2025-12-13 14:09:41.672	\N	\N	\N	3128	FDH MOBILE LOAN	Closed	FDH MOBILE LOAN	NOLIMIT	NOLIMIT	2019-05-02
49	127	1850001467503	FDH MOBILE LOAN	\N	MWK	\N	f	t	2025-12-13 14:08:45.151	2025-12-13 14:09:48.491	\N	\N	\N	3128	FDH MOBILE LOAN	Active	FDH MOBILE LOAN	NOLIMIT	NOLIMIT	2020-11-27
51	127	1850001886778	FDH MOBILE LOAN	\N	MWK	\N	f	t	2025-12-13 14:08:45.165	2025-12-13 14:09:55.429	\N	\N	\N	3128	FDH MOBILE LOAN	Active	FDH MOBILE LOAN	NOLIMIT	NOLIMIT	2021-08-27
54	127	1850003308259	FDH MOBILE LOAN	\N	MWK	\N	f	t	2025-12-13 14:08:45.194	2025-12-13 14:10:05.55	\N	\N	\N	3128	FDH MOBILE LOAN	Active	FDH MOBILE LOAN	NOLIMIT	NOLIMIT	2022-12-23
57	127	1850005007698	FDH MOBILE LOAN	\N	MWK	\N	f	t	2025-12-13 14:08:45.22	2025-12-13 14:10:15.672	\N	\N	\N	3128	FDH MOBILE LOAN	Active	FDH MOBILE LOAN	NOLIMIT	NOLIMIT	2024-01-19
62	129	1850001453518	FDH MOBILE LOAN	\N	MWK	\N	f	t	2025-12-13 14:08:46.968	2025-12-13 14:20:01.416	\N	\N	\N	3128	FDH MOBILE LOAN	Closed	FDH MOBILE LOAN	NOLIMIT	NOLIMIT	2020-11-19
110	139	1010100011637	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:54.966	2025-12-13 14:30:37.948	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
117	139	1010100011707	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:55.02	2025-12-13 15:32:17.922	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
72	133	1010100011645	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:50.31	2025-12-13 14:20:32.757	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
77	133	1010100011696	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:50.347	2025-12-13 14:26:23.69	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
111	139	1010100011645	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:54.972	2025-12-13 14:30:41.05	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
147	140	1850001673758	FDH MOBILE LOAN	\N	MWK	\N	f	t	2025-12-13 14:08:56.116	2025-12-13 15:52:34.65	\N	\N	\N	3128	FDH MOBILE LOAN	Active	FDH MOBILE LOAN	NOLIMIT	NOLIMIT	2021-04-16
70	133	1010100011629	HELBERT CHIKWAWA	\N	MWK	200000.00	f	t	2025-12-13 14:08:50.293	2025-12-13 14:20:26.536	200000.00	200000.00	200000.00	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
64	129	1850004282563	FDH MOBILE LOAN	\N	MWK	\N	f	t	2025-12-13 14:08:46.985	2025-12-13 14:20:07.724	\N	\N	\N	3128	FDH MOBILE LOAN	Active	FDH MOBILE LOAN	NOLIMIT	NOLIMIT	2023-08-18
145	140	1850000269767	NELSON MANDELA KHOLOWA	\N	MWK	1694744.19	f	t	2025-12-13 14:08:56.097	2025-12-13 15:52:28.272	1694744.19	1694744.19	1694744.19	1020	Current Accounts - Staff	Active	NELSON MANDELA KHOLOWA	NOLIMIT	0	2018-01-23
97	133	1010100011898	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:50.494	2025-12-13 14:29:57.429	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
66	129	1850004774857	FDH MOBILE LOAN	\N	MWK	\N	f	t	2025-12-13 14:08:47	2025-12-13 14:20:14.016	\N	\N	\N	3128	FDH MOBILE LOAN	Active	FDH MOBILE LOAN	NOLIMIT	NOLIMIT	2023-12-01
74	133	1010100011661	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:50.324	2025-12-13 14:20:39.055	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
114	139	1010100011677	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:54.992	2025-12-13 14:30:50.385	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
79	133	1010100011718	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:50.361	2025-12-13 14:26:29.847	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
81	133	1010100011734	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:50.377	2025-12-13 14:26:36.017	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
84	133	1010100011769	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:50.398	2025-12-13 14:26:45.282	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
86	133	1010100011785	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:50.415	2025-12-13 14:26:51.474	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
88	133	1010100011807	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:50.432	2025-12-13 14:26:57.7	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
91	133	1010100011831	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:50.457	2025-12-13 14:27:06.941	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
93	133	1010100011858	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:50.47	2025-12-13 14:27:13.168	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
95	133	1010100011874	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:50.482	2025-12-13 14:27:19.347	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
98	133	1010100011904	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:50.5	2025-12-13 14:30:00.551	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
100	133	1010100011928	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:50.516	2025-12-13 14:30:06.751	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
102	133	1010100011947	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:50.53	2025-12-13 14:30:12.963	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
104	133	1010100011963	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:50.543	2025-12-13 14:30:19.144	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
116	139	1010100011696	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:55.01	2025-12-13 14:30:56.603	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
118	139	1010100011718	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:55.027	2025-12-13 15:32:21.322	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
120	139	1010100011734	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:55.04	2025-12-13 15:32:27.492	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
123	139	1010100011769	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:55.066	2025-12-13 15:32:36.783	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
125	139	1010100011785	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:55.08	2025-12-13 15:32:42.905	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
127	139	1010100011807	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:55.095	2025-12-13 15:32:49.062	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
130	139	1010100011831	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:55.116	2025-12-13 15:32:58.334	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
132	139	1010100011858	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:55.13	2025-12-13 15:33:04.469	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
134	139	1010100011874	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:55.144	2025-12-13 15:33:10.586	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
137	139	1010100011904	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:55.164	2025-12-13 15:51:59.112	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
139	139	1010100011928	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:55.178	2025-12-13 15:52:05.259	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
141	139	1010100011947	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:55.194	2025-12-13 15:52:11.391	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
142	139	1010100011955	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:55.2	2025-12-13 16:15:41.813	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
38	124	1040000041942	SAMBANAYO KYUMBA	\N	MWK	\N	f	t	2025-12-13 14:08:42.268	2025-12-13 14:09:10.643	\N	\N	\N	6002	Savings Account - Staff	Active	SAMBANAYO KYUMBA	NOLIMIT	NOLIMIT	2011-01-29
41	124	1850002848128	FDH MOBILE LOAN	\N	MWK	\N	f	t	2025-12-13 14:08:42.302	2025-12-13 14:09:21.137	\N	\N	\N	3128	FDH MOBILE LOAN	Active	FDH MOBILE LOAN	NOLIMIT	NOLIMIT	2022-08-19
45	126	1850005938608	FDH MOBILE LOAN	\N	MWK	\N	f	t	2025-12-13 14:08:44.225	2025-12-13 14:09:34.782	\N	\N	\N	3128	FDH MOBILE LOAN	Active	FDH MOBILE LOAN	NOLIMIT	NOLIMIT	2024-06-28
46	127	1850000033194	FISHANI CHIRWA	\N	MWK	\N	f	t	2025-12-13 14:08:45.128	2025-12-13 14:09:38.222	\N	\N	\N	1020	Current Accounts - Staff	Active	FISHANI CHIRWA	NOLIMIT	500000	2012-12-06
48	127	1850001290441	FDH MOBILE LOAN	\N	MWK	\N	f	t	2025-12-13 14:08:45.143	2025-12-13 14:09:45.156	\N	\N	\N	3128	FDH MOBILE LOAN	Active	FDH MOBILE LOAN	NOLIMIT	NOLIMIT	2020-08-28
50	127	1850001529328	FDH MOBILE LOAN	\N	MWK	\N	f	t	2025-12-13 14:08:45.158	2025-12-13 14:09:52.076	\N	\N	\N	3128	FDH MOBILE LOAN	Closed	FDH MOBILE LOAN	NOLIMIT	NOLIMIT	2020-12-29
52	127	1850002067932	FDH MOBILE LOAN	\N	MWK	\N	f	t	2025-12-13 14:08:45.172	2025-12-13 14:09:58.81	\N	\N	\N	3128	FDH MOBILE LOAN	Active	FDH MOBILE LOAN	NOLIMIT	NOLIMIT	2021-11-26
53	127	1850002327098	FDH MOBILE LOAN	\N	MWK	\N	f	t	2025-12-13 14:08:45.185	2025-12-13 14:10:02.159	\N	\N	\N	3128	FDH MOBILE LOAN	Active	FDH MOBILE LOAN	NOLIMIT	NOLIMIT	2022-03-04
55	127	1850004165397	FDH MOBILE LOAN	\N	MWK	\N	f	t	2025-12-13 14:08:45.202	2025-12-13 14:10:08.919	\N	\N	\N	3128	FDH MOBILE LOAN	Active	FDH MOBILE LOAN	NOLIMIT	NOLIMIT	2023-07-21
56	127	1850004546967	FDH MOBILE LOAN	\N	MWK	\N	f	t	2025-12-13 14:08:45.211	2025-12-13 14:10:12.254	\N	\N	\N	3128	FDH MOBILE LOAN	Active	FDH MOBILE LOAN	NOLIMIT	NOLIMIT	2023-10-20
40	124	1850001768888	FDH MOBILE LOAN	\N	MWK	22992.58	f	t	2025-12-13 14:08:42.288	2025-12-13 14:13:12.767	22992.58	22992.58	22992.58	3128	FDH MOBILE LOAN	Active	FDH MOBILE LOAN	NOLIMIT	NOLIMIT	2021-06-18
90	133	1010100011823	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:50.45	2025-12-13 14:27:03.864	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
43	125	1170000158611	KENETH ALIZEYO	\N	MWK	368.85	f	t	2025-12-13 14:08:43.136	2025-12-14 10:54:30.847	368.85	368.85	368.85	6018	First Save Account	Active	KENETH ALIZEYO	NOLIMIT	NOLIMIT	2022-06-28
68	131	1850000635194	TREVOR ZINYEMBA	\N	MWK	13369570.81	f	t	2025-12-13 14:08:48.72	2025-12-14 10:54:44.821	13369570.81	13369570.81	13369570.81	1020	Current Accounts - Staff	Active	TREVOR ZINYEMBA	NOLIMIT	500000	2019-06-04
69	132	1850000122097	TREVOR ZINYEMBA	\N	MWK	121596.82	t	t	2025-12-13 14:08:49.645	2025-12-14 10:54:46.66	121596.82	121596.82	121596.82	6015	Savings Account - Premium	Active	TREVOR ZINYEMBA	NOLIMIT	NOLIMIT	2015-03-30
99	133	1010100011912	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:50.507	2025-12-13 14:30:03.675	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
149	140	1850002933807	FDH MOBILE LOAN	\N	MWK	\N	f	t	2025-12-13 14:08:56.136	2025-12-13 15:52:41.499	\N	\N	\N	3128	FDH MOBILE LOAN	Active	FDH MOBILE LOAN	NOLIMIT	NOLIMIT	2022-09-09
78	133	1010100011707	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:50.355	2025-12-13 14:26:26.782	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
92	133	1010100011847	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:50.463	2025-12-13 14:27:10.022	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
58	127	1850005898107	FDH MOBILE LOAN	\N	MWK	\N	f	t	2025-12-13 14:08:45.227	2025-12-13 14:19:48.857	\N	\N	\N	3128	FDH MOBILE LOAN	Closed	FDH MOBILE LOAN	NOLIMIT	NOLIMIT	2024-06-24
60	129	1850000157209	RUTH KAIRA	\N	MWK	1183757.94	f	t	2025-12-13 14:08:46.955	2025-12-13 14:19:55.12	1183757.94	1183757.94	1183757.94	1020	Current Accounts - Staff	Active	RUTH KAIRA	NOLIMIT	750000	2009-08-17
61	129	1850001122301	FDH MOBILE LOAN	\N	MWK	15800.00	f	t	2025-12-13 14:08:46.963	2025-12-13 14:19:58.274	15800.00	15800.00	15800.00	3128	FDH MOBILE LOAN	Active	FDH MOBILE LOAN	NOLIMIT	NOLIMIT	2020-05-29
63	129	1850001615847	FDH MOBILE LOAN	\N	MWK	\N	f	t	2025-12-13 14:08:46.975	2025-12-13 14:20:04.564	\N	\N	\N	3128	FDH MOBILE LOAN	Active	FDH MOBILE LOAN	NOLIMIT	NOLIMIT	2021-03-06
65	129	1850004385141	RUTH KAIRA	\N	MWK	\N	f	t	2025-12-13 14:08:46.993	2025-12-13 14:20:10.855	\N	\N	\N	6001	Savings Account - Ordinary	Active	RUTH KAIRA	NOLIMIT	NOLIMIT	2023-09-08
80	133	1010100011726	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:50.369	2025-12-13 14:26:32.936	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
82	133	1010100011742	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:50.385	2025-12-13 14:26:39.111	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
71	133	1010100011637	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:50.303	2025-12-13 14:20:29.655	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
73	133	1010100011653	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:50.316	2025-12-13 14:20:35.871	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
75	133	1010100011677	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:50.332	2025-12-13 14:20:42.204	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
76	133	1010100011688	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:50.339	2025-12-13 14:20:45.296	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
94	133	1010100011866	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:50.475	2025-12-13 14:27:16.256	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
96	133	1010100011882	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:50.488	2025-12-13 14:27:22.462	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
67	130	1850004160042	UMODZI MBUKWA	\N	MWK	749076.90	f	t	2025-12-13 14:08:47.847	2025-12-14 10:54:42.756	749076.90	749076.90	749076.90	6001	Savings Account - Ordinary	Active	UMODZI MBUKWA	NOLIMIT	NOLIMIT	2023-07-19
39	124	1040000047247	SAMBANAYO KYUMBA	\N	MWK	1394520.73	t	t	2025-12-13 14:08:42.28	2025-12-13 21:59:55.545	1394520.73	1426520.73	1394520.73	1020	Current Accounts - Staff	Active	SAMBANAYO KYUMBA	NOLIMIT	300000	2012-06-18
83	133	1010100011758	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:50.392	2025-12-13 14:26:42.207	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
85	133	1010100011777	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:50.407	2025-12-13 14:26:48.386	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
87	133	1010100011793	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:50.422	2025-12-13 14:26:54.586	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
89	133	1010100011815	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:50.441	2025-12-13 14:27:00.78	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
101	133	1010100011939	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:50.522	2025-12-13 14:30:09.857	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
103	133	1010100011955	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:50.536	2025-12-13 14:30:16.059	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
105	133	1850002685954	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:50.55	2025-12-13 14:30:22.227	\N	\N	\N	6015	Savings Account - Premium	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2022-06-29
150	140	1850005988656	FDH MOBILE LOAN	\N	MWK	\N	f	t	2025-12-13 14:08:56.145	2025-12-13 15:52:44.727	\N	\N	\N	3128	FDH MOBILE LOAN	Closed	FDH MOBILE LOAN	NOLIMIT	NOLIMIT	2024-07-05
109	139	1010100011629	HELBERT CHIKWAWA	\N	MWK	200000.00	f	t	2025-12-13 14:08:54.957	2025-12-13 14:30:34.751	200000.00	200000.00	200000.00	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
112	139	1010100011653	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:54.978	2025-12-13 14:30:44.178	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
113	139	1010100011661	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:54.985	2025-12-13 14:30:47.276	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
115	139	1010100011688	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:55.002	2025-12-13 14:30:53.508	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
59	128	1630000056933	ZULU EDWIN MPANANGOMBE	\N	MWK	1130.29	f	t	2025-12-13 14:08:46.057	2025-12-14 10:54:37.776	1130.29	1130.29	1130.29	6001	Savings Account - Ordinary	Active	ZULU EDWIN MPANANGOMBE	NOLIMIT	NOLIMIT	2011-01-27
106	134	1850000153475	WILLIAM MPINGANJIRA	\N	MWK	-3514252.08	f	t	2025-12-13 14:08:51.424	2025-12-14 10:54:50.869	-3514252.08	-3350752.08	-3514252.08	1020	Current Accounts - Staff	Active	WILLIAM MPINGANJIRA	NOLIMIT	0	2010-03-08
138	139	1010100011912	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:55.171	2025-12-13 15:52:02.187	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
140	139	1010100011939	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:55.187	2025-12-13 15:52:08.323	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
143	139	1010100011963	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:55.207	2025-12-13 15:52:22.07	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
144	139	1850002685954	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:55.214	2025-12-13 15:52:25.165	\N	\N	\N	6015	Savings Account - Premium	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2022-06-29
146	140	1850001508633	FDH MOBILE LOAN	\N	MWK	\N	f	t	2025-12-13 14:08:56.106	2025-12-13 15:52:31.389	\N	\N	\N	3128	FDH MOBILE LOAN	Active	FDH MOBILE LOAN	NOLIMIT	NOLIMIT	2020-12-17
119	139	1010100011726	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:55.033	2025-12-13 15:32:24.404	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
121	139	1010100011742	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:55.048	2025-12-13 15:32:30.647	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
122	139	1010100011758	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:55.057	2025-12-13 15:32:33.717	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
124	139	1010100011777	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:55.073	2025-12-13 15:32:39.838	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
126	139	1010100011793	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:55.088	2025-12-13 15:32:45.981	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
128	139	1010100011815	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:55.103	2025-12-13 15:32:52.141	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
129	139	1010100011823	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:55.11	2025-12-13 15:32:55.227	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
131	139	1010100011847	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:55.123	2025-12-13 15:33:01.393	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
133	139	1010100011866	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:55.137	2025-12-13 15:33:07.524	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
148	140	1850002035828	FDH MOBILE LOAN	\N	MWK	\N	f	t	2025-12-13 14:08:56.128	2025-12-13 15:52:38.334	\N	\N	\N	3128	FDH MOBILE LOAN	Active	FDH MOBILE LOAN	NOLIMIT	NOLIMIT	2021-11-12
135	139	1010100011882	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:55.15	2025-12-13 15:33:13.652	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
136	139	1010100011898	HELBERT CHIKWAWA	\N	MWK	\N	f	t	2025-12-13 14:08:55.157	2025-12-13 15:33:16.746	\N	\N	\N	1001	Platinum Current Account	Active	HELBERT CHIKWAWA	NOLIMIT	NOLIMIT	2024-07-29
108	138	1850000614715	SHERIFF ADAMS	\N	MWK	1743533.14	f	t	2025-12-13 14:08:54.288	2025-12-14 10:54:52.834	1743533.14	2743533.14	1743533.14	1020	Current Accounts - Staff	Active	SHERIFF ADAMS	NOLIMIT	300000	2019-05-27
107	134	1850000153483	WILLIAM MPINGANJIRA	\N	MWK	48691.93	f	t	2025-12-13 14:08:51.43	2025-12-13 21:02:36.664	48691.93	48691.93	48691.93	6002	Savings Account - Staff	Active	WILLIAM MPINGANJIRA	NOLIMIT	NOLIMIT	2010-03-08
\.


--
-- Data for Name: fdh_mobile_user_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fdh_mobile_user_profiles (id, mobile_user_id, first_name, last_name, email, phone, address, city, country, zip, created_at, updated_at) FROM stdin;
1	55	HELBERT	CHIKWAWA	chikwawahelbert@gmail.com	265888067666	NDIRANDE	BLANTYRE	\N	\N	2025-12-13 13:42:03.771	2025-12-13 13:42:03.771
2	124	SAMBANAYO	KYUMBA		+265995801686	MANJA	BLANTYRE	\N	\N	2025-12-13 14:09:10.652	2025-12-13 14:09:24.487
3	125	KENETH	ALIZEYO		+265889944226	THAWALE	MULANJE	\N	\N	2025-12-13 14:09:27.891	2025-12-13 14:09:27.891
4	126	AARON	PHIRI		+265998645894	BWELERA	BLANTYRE	\N	\N	2025-12-13 14:09:31.311	2025-12-13 14:09:34.79
5	127	FISHANI	CHIRWA		+265999122751	KAMPALA	BLANTYRE	\N	\N	2025-12-13 14:09:38.231	2025-12-13 14:19:48.868
6	128	EDWIN	ZULU		+265885460023	NTCHENACHENA	RUMPHI	\N	\N	2025-12-13 14:19:51.972	2025-12-13 14:19:51.972
7	129	RUTH	KAIRA	ruth@fdh.co.mw		FDH	BLANTYRE	\N	\N	2025-12-13 14:19:55.132	2025-12-13 14:20:14.025
8	130	UMODZI	MBUKWA		+265999156886	AREA	BLANTYRE	\N	\N	2025-12-13 14:20:17.126	2025-12-13 14:20:17.126
9	131	TREVOR	TREVOR		0999917221	MANJA	BLANTYRE	\N	\N	2025-12-13 14:20:20.28	2025-12-13 14:20:20.28
10	132	TREVOR	ZINYEMBA			MANJA	BLANTYRE	\N	\N	2025-12-13 14:20:23.462	2025-12-13 14:20:23.462
11	133	HELBERT	CHIKWAWA	chikwawahelbert@gmail.com	265888067666	NDIRANDE	BLANTYRE	\N	\N	2025-12-13 14:20:26.55	2025-12-13 14:20:26.55
12	134	WILLIAM	MPINGANJIRA	wmpinganjira@aol.com		PLOT	BLANTYRE	\N	\N	2025-12-13 14:30:25.403	2025-12-13 14:30:28.49
13	138	SHERIFF	SHERIFF		0888444225	CHIRIMBA	BLANTYRE	\N	\N	2025-12-13 14:30:31.643	2025-12-13 14:30:31.643
14	139	HELBERT	CHIKWAWA	chikwawahelbert@gmail.com	265888067666	NDIRANDE	BLANTYRE	\N	\N	2025-12-13 14:30:34.766	2025-12-13 14:30:34.766
15	140	NELSON	KHOLOWA			CHITAWIRA	BLANTYRE	\N	\N	2025-12-13 15:52:28.285	2025-12-13 15:52:44.743
\.


--
-- Data for Name: fdh_mobile_users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fdh_mobile_users (id, context, username, "phoneNumber", "customerNumber", "accountNumber", "passwordHash", "isActive", created_at, updated_at, token_version, memo_word) FROM stdin;
1	WALLET	\N	0966621003	\N	\N	$2b$12$h1RGORIB17kMtL0Dpxjy8.fQr9FV3M4U./SyYBUb00wCxe0GUBsbC	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
2	WALLET	\N	265888067666	\N	\N	$2b$12$60Q2zyDQxIL6ozT2ThiquOL6246KI3NvfMAKUvIMZjmkw/5qIXbOS	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
3	WALLET	\N	260970210154	\N	\N	$2b$12$3cIRAJUjXikjhWY0eVtnl.tJ5zpQsaYN4haE72xOcqcMszhE.B4H2	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
4	WALLET	\N	260978148389	\N	\N	$2b$12$lpnrZS0dn93uzueI8Qg2MOROtxtbfhmdmQ6ztugCMHQS9Fx4XEhtm	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
5	WALLET	\N	260776836233	\N	\N	$2b$12$O5vEXmBLm3VURxdVkvwhM.SxepSncqGvP6omfPB54zdTZ/1xqhyQG	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
6	WALLET	\N	260973674607	\N	\N	$2b$12$DA6rq8YhNFU6d0QBdnNCIeUr4y0wZ3ZW82CmkMDjMTeqOuHWXjGIO	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
7	WALLET	\N	263773077633	\N	\N	$2b$12$ctAKnYQChuJFqpeplP3XyOMyphD1NGFAr3qZrVrrjcM9yGi5arFGy	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
8	WALLET	\N	260961706289	\N	\N	$2b$12$ZIBWMHQhugcYPsmB.uO3Hu9sudDt4PBvW6jdgN3GlI/Q.PAKhyXT.	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
9	WALLET	\N	265999608664	\N	\N	$2b$12$dboLtAoZtbOILDoSkpOq0OkZXB1k9ol/pkcBEN/ht90vWUxenJ09a	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
11	WALLET	\N	265998765432	\N	\N	$2b$12$FMYxUJIaxdlTnidGV97Jn.JAm2Lg5DodVq4f/44i7O3nSvZlN4tpW	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
12	WALLET	\N	265970210154	\N	\N	$2b$12$FkxWhs8iFqAFvF30Mh5vMuLiVH6poE1N8W9zwTeYEgDHb1BDVYZKa	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
13	WALLET	\N	265999512222	\N	\N	$2b$12$MvSuZ3SA1wiOh4DGwYrhg.tGoe9XglpWaC0OUkXMEyur5ElvvbJGS	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
14	WALLET	\N	0966621003	\N	\N	$2b$12$h1RGORIB17kMtL0Dpxjy8.fQr9FV3M4U./SyYBUb00wCxe0GUBsbC	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
15	WALLET	\N	265888067666	\N	\N	$2b$12$60Q2zyDQxIL6ozT2ThiquOL6246KI3NvfMAKUvIMZjmkw/5qIXbOS	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
16	WALLET	\N	260970210154	\N	\N	$2b$12$3cIRAJUjXikjhWY0eVtnl.tJ5zpQsaYN4haE72xOcqcMszhE.B4H2	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
17	WALLET	\N	260978148389	\N	\N	$2b$12$lpnrZS0dn93uzueI8Qg2MOROtxtbfhmdmQ6ztugCMHQS9Fx4XEhtm	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
18	WALLET	\N	260776836233	\N	\N	$2b$12$O5vEXmBLm3VURxdVkvwhM.SxepSncqGvP6omfPB54zdTZ/1xqhyQG	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
19	WALLET	\N	260973674607	\N	\N	$2b$12$DA6rq8YhNFU6d0QBdnNCIeUr4y0wZ3ZW82CmkMDjMTeqOuHWXjGIO	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
20	WALLET	\N	263773077633	\N	\N	$2b$12$ctAKnYQChuJFqpeplP3XyOMyphD1NGFAr3qZrVrrjcM9yGi5arFGy	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
21	WALLET	\N	260961706289	\N	\N	$2b$12$ZIBWMHQhugcYPsmB.uO3Hu9sudDt4PBvW6jdgN3GlI/Q.PAKhyXT.	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
22	WALLET	\N	265999608664	\N	\N	$2b$12$dboLtAoZtbOILDoSkpOq0OkZXB1k9ol/pkcBEN/ht90vWUxenJ09a	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
24	WALLET	\N	265998765432	\N	\N	$2b$12$FMYxUJIaxdlTnidGV97Jn.JAm2Lg5DodVq4f/44i7O3nSvZlN4tpW	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
25	WALLET	\N	265970210154	\N	\N	$2b$12$FkxWhs8iFqAFvF30Mh5vMuLiVH6poE1N8W9zwTeYEgDHb1BDVYZKa	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
26	WALLET	\N	265999512222	\N	\N	$2b$12$MvSuZ3SA1wiOh4DGwYrhg.tGoe9XglpWaC0OUkXMEyur5ElvvbJGS	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
27	WALLET	\N	0966621003	\N	\N	$2b$12$h1RGORIB17kMtL0Dpxjy8.fQr9FV3M4U./SyYBUb00wCxe0GUBsbC	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
28	WALLET	\N	265888067666	\N	\N	$2b$12$60Q2zyDQxIL6ozT2ThiquOL6246KI3NvfMAKUvIMZjmkw/5qIXbOS	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
29	WALLET	\N	260970210154	\N	\N	$2b$12$3cIRAJUjXikjhWY0eVtnl.tJ5zpQsaYN4haE72xOcqcMszhE.B4H2	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
30	WALLET	\N	260978148389	\N	\N	$2b$12$lpnrZS0dn93uzueI8Qg2MOROtxtbfhmdmQ6ztugCMHQS9Fx4XEhtm	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
31	WALLET	\N	260776836233	\N	\N	$2b$12$O5vEXmBLm3VURxdVkvwhM.SxepSncqGvP6omfPB54zdTZ/1xqhyQG	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
32	WALLET	\N	260973674607	\N	\N	$2b$12$DA6rq8YhNFU6d0QBdnNCIeUr4y0wZ3ZW82CmkMDjMTeqOuHWXjGIO	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
33	WALLET	\N	263773077633	\N	\N	$2b$12$ctAKnYQChuJFqpeplP3XyOMyphD1NGFAr3qZrVrrjcM9yGi5arFGy	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
34	WALLET	\N	260961706289	\N	\N	$2b$12$ZIBWMHQhugcYPsmB.uO3Hu9sudDt4PBvW6jdgN3GlI/Q.PAKhyXT.	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
35	WALLET	\N	265999608664	\N	\N	$2b$12$dboLtAoZtbOILDoSkpOq0OkZXB1k9ol/pkcBEN/ht90vWUxenJ09a	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
37	WALLET	\N	265998765432	\N	\N	$2b$12$FMYxUJIaxdlTnidGV97Jn.JAm2Lg5DodVq4f/44i7O3nSvZlN4tpW	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
38	WALLET	\N	265970210154	\N	\N	$2b$12$FkxWhs8iFqAFvF30Mh5vMuLiVH6poE1N8W9zwTeYEgDHb1BDVYZKa	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
39	WALLET	\N	265999512222	\N	\N	$2b$12$MvSuZ3SA1wiOh4DGwYrhg.tGoe9XglpWaC0OUkXMEyur5ElvvbJGS	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
40	WALLET	\N	0966621003	\N	\N	$2b$12$h1RGORIB17kMtL0Dpxjy8.fQr9FV3M4U./SyYBUb00wCxe0GUBsbC	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
41	WALLET	\N	265888067666	\N	\N	$2b$12$60Q2zyDQxIL6ozT2ThiquOL6246KI3NvfMAKUvIMZjmkw/5qIXbOS	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
42	WALLET	\N	260970210154	\N	\N	$2b$12$3cIRAJUjXikjhWY0eVtnl.tJ5zpQsaYN4haE72xOcqcMszhE.B4H2	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
43	WALLET	\N	260978148389	\N	\N	$2b$12$lpnrZS0dn93uzueI8Qg2MOROtxtbfhmdmQ6ztugCMHQS9Fx4XEhtm	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
44	WALLET	\N	260776836233	\N	\N	$2b$12$O5vEXmBLm3VURxdVkvwhM.SxepSncqGvP6omfPB54zdTZ/1xqhyQG	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
45	WALLET	\N	260973674607	\N	\N	$2b$12$DA6rq8YhNFU6d0QBdnNCIeUr4y0wZ3ZW82CmkMDjMTeqOuHWXjGIO	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
46	WALLET	\N	263773077633	\N	\N	$2b$12$ctAKnYQChuJFqpeplP3XyOMyphD1NGFAr3qZrVrrjcM9yGi5arFGy	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
47	WALLET	\N	260961706289	\N	\N	$2b$12$ZIBWMHQhugcYPsmB.uO3Hu9sudDt4PBvW6jdgN3GlI/Q.PAKhyXT.	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
48	WALLET	\N	265999608664	\N	\N	$2b$12$dboLtAoZtbOILDoSkpOq0OkZXB1k9ol/pkcBEN/ht90vWUxenJ09a	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
50	WALLET	\N	265998765432	\N	\N	$2b$12$FMYxUJIaxdlTnidGV97Jn.JAm2Lg5DodVq4f/44i7O3nSvZlN4tpW	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
51	WALLET	\N	265970210154	\N	\N	$2b$12$FkxWhs8iFqAFvF30Mh5vMuLiVH6poE1N8W9zwTeYEgDHb1BDVYZKa	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
52	WALLET	\N	265999512222	\N	\N	$2b$12$MvSuZ3SA1wiOh4DGwYrhg.tGoe9XglpWaC0OUkXMEyur5ElvvbJGS	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
53	MOBILE_BANKING	aaron.p.4294	260975266094Archived	\N	\N	$2b$12$0xZoFLkxWOx.5GF8g/ICc.HnJmsxNNNUzEnrQ/IpHaBzTzZE6Gtx6	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
54	MOBILE_BANKING	sambanayo.k.4819	+265995801686	\N	\N	$2b$12$BW0pWoWH4z4KlgX.7LJhdOSs1ilgdMz53x4ZDrYvUt4L9wVPyadvm	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
56	MOBILE_BANKING	aaron.p.9471	+265998645894	\N	\N	$2b$12$MxoNn441HLdkMFF3aFyz1uXBeAoAA2HwpBkny8DJ5i4SwgyS0nDLK	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
57	MOBILE_BANKING	fishani.c.3745	+265999122751	\N	\N	$2b$12$SZeYm5O8DBuGjW7elJ6rBeTJ4F5EveXWFjGO5WcMp0dSJOkEEcebW	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
23	WALLET	\N	265977396223	\N	\N	$2b$12$A8/XeJajwQukihcBkeQUx.Jqs2bDu/m2koU1vA2G3lhk4ZhNPzrHW	t	2025-12-11 22:15:21.137	2025-12-12 10:03:33.847	0	\N
55	MOBILE_BANKING	helbert.c.5380	265888067666	29519407	\N	$2b$12$bod6Z07mFrKR3v0sSeCsZOEjNlXuo2CUTzaqdgSYW9K9CEUK8IsLy	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
59	MOBILE_BANKING	ruth.k.8153	+265888863944	\N	\N	$2b$12$3z8iPIYfiWcSyLJW0Lq51u1xc9MObTl7.2CnSIMveGXspmEPjO3ia	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
60	MOBILE_BANKING	umodzi.m.4451	+265999156886	\N	\N	$2b$12$DHGYIXthSArBT0def4yB5eT3nJD0u7on8mnVhRNDyRgvQFxlGjNxq	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
61	MOBILE_BANKING	trevor.z.2559	+265999917221	\N	\N	$2b$12$Z71uZ2lJP0vvNsoKZF20O.KobVdUYf533nfT..IL32wkXFrfewB3q	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
62	MOBILE_BANKING	trevor.z.3973	+265999917221	\N	\N	$2b$12$hKnDmQhQomqYGlZ.385V0Oh7Cmcjd9qMlNe7rINQhX3dE0i6NvzDa	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
63	MOBILE_BANKING	helbert.c.8435	265888067666	\N	\N	$2b$12$.A.JeltUCYNn2DIg1XEJq.gydO44IhXTQOw4kkc6Oo3n1p3bxUs8.	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
64	MOBILE_BANKING	william.m.3567	+265 999524219	\N	\N	$2b$12$4KfoAfSd1/Vc9fE2u7f5qemPAVhO1kXKpzDtllcvA34jzIed9Xpea	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
65	MOBILE_BANKING	..9428	+265999917221	\N	\N	$2b$12$VTKyyYwOUmKCTrXMNgtdPemxnljcCepy5JuZUeOY/M9GtuULNxZY2	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
66	MOBILE_BANKING	william.m.2133	+265999888920	\N	\N	$2b$12$SUFngzEwLUBpt0Fr1Nrflux91pEjbkwCyUNHrOStxyJMI3r6RAhci	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
67	MOBILE_BANKING	..8884	+265999917221	\N	\N	$2b$12$Jub846ZuJrxjwkyHt2eiZug.PUegAUdJop30aVlWBN5BPbAJS90ga	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
68	MOBILE_BANKING	sheriff.a.7509	+265999512222	\N	\N	$2b$12$sIfkcq7gL1.xoFXtLxORsOsGY70KQzsTHjlaGZxr8gmlG3zK28Cse	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
69	MOBILE_BANKING	sambanayo.k.5609	+265999917221	\N	\N	$2b$12$0C5sFRjl/OkpW9owdhJe6eiZJ1g1T9tIHvFUBwJbOt8A8UGdIif1W	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
70	MOBILE_BANKING	nelson.k.1594	+265888537597	\N	\N	$2b$12$v20fXf92WqNbR2XxHfzX5OCEwnlJcL8EUbjuNQYZTO1EYdLCu4E7q	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137	0	\N
58	MOBILE_BANKING	edwin.z.2493	+265885460023	\N	\N	$2b$12$M1gRIlgxow0DYKX55Ln1TeEP4p2nVVwIFnSc8TJaJ.yaG9tIK11F6	t	2025-12-11 22:15:21.137	2025-12-11 22:16:00.387	0	\N
71	WALLET	\N	0966621003	\N	\N	$2b$12$h1RGORIB17kMtL0Dpxjy8.fQr9FV3M4U./SyYBUb00wCxe0GUBsbC	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
72	WALLET	\N	265888067666	\N	\N	$2b$12$60Q2zyDQxIL6ozT2ThiquOL6246KI3NvfMAKUvIMZjmkw/5qIXbOS	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
73	WALLET	\N	260970210154	\N	\N	$2b$12$3cIRAJUjXikjhWY0eVtnl.tJ5zpQsaYN4haE72xOcqcMszhE.B4H2	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
74	WALLET	\N	260978148389	\N	\N	$2b$12$lpnrZS0dn93uzueI8Qg2MOROtxtbfhmdmQ6ztugCMHQS9Fx4XEhtm	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
75	WALLET	\N	260776836233	\N	\N	$2b$12$O5vEXmBLm3VURxdVkvwhM.SxepSncqGvP6omfPB54zdTZ/1xqhyQG	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
76	WALLET	\N	260973674607	\N	\N	$2b$12$DA6rq8YhNFU6d0QBdnNCIeUr4y0wZ3ZW82CmkMDjMTeqOuHWXjGIO	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
77	WALLET	\N	263773077633	\N	\N	$2b$12$ctAKnYQChuJFqpeplP3XyOMyphD1NGFAr3qZrVrrjcM9yGi5arFGy	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
78	WALLET	\N	260961706289	\N	\N	$2b$12$ZIBWMHQhugcYPsmB.uO3Hu9sudDt4PBvW6jdgN3GlI/Q.PAKhyXT.	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
79	WALLET	\N	265999608664	\N	\N	$2b$12$dboLtAoZtbOILDoSkpOq0OkZXB1k9ol/pkcBEN/ht90vWUxenJ09a	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
80	WALLET	\N	265977396223	\N	\N	$2b$12$HuVMyQXL5nk1ImjsWCocIe.LMChbB/wRoQPMH/YH8rNHwGPZ4pu0u	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
81	WALLET	\N	265998765432	\N	\N	$2b$12$FMYxUJIaxdlTnidGV97Jn.JAm2Lg5DodVq4f/44i7O3nSvZlN4tpW	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
82	WALLET	\N	265970210154	\N	\N	$2b$12$FkxWhs8iFqAFvF30Mh5vMuLiVH6poE1N8W9zwTeYEgDHb1BDVYZKa	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
83	WALLET	\N	265999512222	\N	\N	$2b$12$MvSuZ3SA1wiOh4DGwYrhg.tGoe9XglpWaC0OUkXMEyur5ElvvbJGS	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
84	WALLET	\N	0966621003	\N	\N	$2b$12$h1RGORIB17kMtL0Dpxjy8.fQr9FV3M4U./SyYBUb00wCxe0GUBsbC	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
85	WALLET	\N	265888067666	\N	\N	$2b$12$60Q2zyDQxIL6ozT2ThiquOL6246KI3NvfMAKUvIMZjmkw/5qIXbOS	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
86	WALLET	\N	260970210154	\N	\N	$2b$12$3cIRAJUjXikjhWY0eVtnl.tJ5zpQsaYN4haE72xOcqcMszhE.B4H2	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
87	WALLET	\N	260978148389	\N	\N	$2b$12$lpnrZS0dn93uzueI8Qg2MOROtxtbfhmdmQ6ztugCMHQS9Fx4XEhtm	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
88	WALLET	\N	260776836233	\N	\N	$2b$12$O5vEXmBLm3VURxdVkvwhM.SxepSncqGvP6omfPB54zdTZ/1xqhyQG	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
89	WALLET	\N	260973674607	\N	\N	$2b$12$DA6rq8YhNFU6d0QBdnNCIeUr4y0wZ3ZW82CmkMDjMTeqOuHWXjGIO	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
90	WALLET	\N	263773077633	\N	\N	$2b$12$ctAKnYQChuJFqpeplP3XyOMyphD1NGFAr3qZrVrrjcM9yGi5arFGy	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
91	WALLET	\N	260961706289	\N	\N	$2b$12$ZIBWMHQhugcYPsmB.uO3Hu9sudDt4PBvW6jdgN3GlI/Q.PAKhyXT.	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
92	WALLET	\N	265999608664	\N	\N	$2b$12$dboLtAoZtbOILDoSkpOq0OkZXB1k9ol/pkcBEN/ht90vWUxenJ09a	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
93	WALLET	\N	265977396223	\N	\N	$2b$12$HuVMyQXL5nk1ImjsWCocIe.LMChbB/wRoQPMH/YH8rNHwGPZ4pu0u	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
94	WALLET	\N	265998765432	\N	\N	$2b$12$FMYxUJIaxdlTnidGV97Jn.JAm2Lg5DodVq4f/44i7O3nSvZlN4tpW	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
95	WALLET	\N	265970210154	\N	\N	$2b$12$FkxWhs8iFqAFvF30Mh5vMuLiVH6poE1N8W9zwTeYEgDHb1BDVYZKa	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
96	WALLET	\N	265999512222	\N	\N	$2b$12$MvSuZ3SA1wiOh4DGwYrhg.tGoe9XglpWaC0OUkXMEyur5ElvvbJGS	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
97	WALLET	\N	0966621003	\N	\N	$2b$12$h1RGORIB17kMtL0Dpxjy8.fQr9FV3M4U./SyYBUb00wCxe0GUBsbC	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
98	WALLET	\N	265888067666	\N	\N	$2b$12$60Q2zyDQxIL6ozT2ThiquOL6246KI3NvfMAKUvIMZjmkw/5qIXbOS	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
99	WALLET	\N	260970210154	\N	\N	$2b$12$3cIRAJUjXikjhWY0eVtnl.tJ5zpQsaYN4haE72xOcqcMszhE.B4H2	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
100	WALLET	\N	260978148389	\N	\N	$2b$12$lpnrZS0dn93uzueI8Qg2MOROtxtbfhmdmQ6ztugCMHQS9Fx4XEhtm	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
101	WALLET	\N	260776836233	\N	\N	$2b$12$O5vEXmBLm3VURxdVkvwhM.SxepSncqGvP6omfPB54zdTZ/1xqhyQG	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
102	WALLET	\N	260973674607	\N	\N	$2b$12$DA6rq8YhNFU6d0QBdnNCIeUr4y0wZ3ZW82CmkMDjMTeqOuHWXjGIO	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
103	WALLET	\N	263773077633	\N	\N	$2b$12$ctAKnYQChuJFqpeplP3XyOMyphD1NGFAr3qZrVrrjcM9yGi5arFGy	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
104	WALLET	\N	260961706289	\N	\N	$2b$12$ZIBWMHQhugcYPsmB.uO3Hu9sudDt4PBvW6jdgN3GlI/Q.PAKhyXT.	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
105	WALLET	\N	265999608664	\N	\N	$2b$12$dboLtAoZtbOILDoSkpOq0OkZXB1k9ol/pkcBEN/ht90vWUxenJ09a	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
106	WALLET	\N	265977396223	\N	\N	$2b$12$HuVMyQXL5nk1ImjsWCocIe.LMChbB/wRoQPMH/YH8rNHwGPZ4pu0u	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
107	WALLET	\N	265998765432	\N	\N	$2b$12$FMYxUJIaxdlTnidGV97Jn.JAm2Lg5DodVq4f/44i7O3nSvZlN4tpW	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
108	WALLET	\N	265970210154	\N	\N	$2b$12$FkxWhs8iFqAFvF30Mh5vMuLiVH6poE1N8W9zwTeYEgDHb1BDVYZKa	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
109	WALLET	\N	265999512222	\N	\N	$2b$12$MvSuZ3SA1wiOh4DGwYrhg.tGoe9XglpWaC0OUkXMEyur5ElvvbJGS	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
110	WALLET	\N	0966621003	\N	\N	$2b$12$h1RGORIB17kMtL0Dpxjy8.fQr9FV3M4U./SyYBUb00wCxe0GUBsbC	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
111	WALLET	\N	265888067666	\N	\N	$2b$12$60Q2zyDQxIL6ozT2ThiquOL6246KI3NvfMAKUvIMZjmkw/5qIXbOS	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
112	WALLET	\N	260970210154	\N	\N	$2b$12$3cIRAJUjXikjhWY0eVtnl.tJ5zpQsaYN4haE72xOcqcMszhE.B4H2	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
113	WALLET	\N	260978148389	\N	\N	$2b$12$lpnrZS0dn93uzueI8Qg2MOROtxtbfhmdmQ6ztugCMHQS9Fx4XEhtm	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
114	WALLET	\N	260776836233	\N	\N	$2b$12$O5vEXmBLm3VURxdVkvwhM.SxepSncqGvP6omfPB54zdTZ/1xqhyQG	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
115	WALLET	\N	260973674607	\N	\N	$2b$12$DA6rq8YhNFU6d0QBdnNCIeUr4y0wZ3ZW82CmkMDjMTeqOuHWXjGIO	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
116	WALLET	\N	263773077633	\N	\N	$2b$12$ctAKnYQChuJFqpeplP3XyOMyphD1NGFAr3qZrVrrjcM9yGi5arFGy	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
117	WALLET	\N	260961706289	\N	\N	$2b$12$ZIBWMHQhugcYPsmB.uO3Hu9sudDt4PBvW6jdgN3GlI/Q.PAKhyXT.	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
118	WALLET	\N	265999608664	\N	\N	$2b$12$dboLtAoZtbOILDoSkpOq0OkZXB1k9ol/pkcBEN/ht90vWUxenJ09a	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
119	WALLET	\N	265977396223	\N	\N	$2b$12$HuVMyQXL5nk1ImjsWCocIe.LMChbB/wRoQPMH/YH8rNHwGPZ4pu0u	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
120	WALLET	\N	265998765432	\N	\N	$2b$12$FMYxUJIaxdlTnidGV97Jn.JAm2Lg5DodVq4f/44i7O3nSvZlN4tpW	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
121	WALLET	\N	265970210154	\N	\N	$2b$12$FkxWhs8iFqAFvF30Mh5vMuLiVH6poE1N8W9zwTeYEgDHb1BDVYZKa	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
122	WALLET	\N	265999512222	\N	\N	$2b$12$MvSuZ3SA1wiOh4DGwYrhg.tGoe9XglpWaC0OUkXMEyur5ElvvbJGS	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
123	MOBILE_BANKING	aaron.p.4294	260975266094Archived		\N	$2b$12$0xZoFLkxWOx.5GF8g/ICc.HnJmsxNNNUzEnrQ/IpHaBzTzZE6Gtx6	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
124	MOBILE_BANKING	sambanayo.k.4819	+265995801686	290564	\N	$2b$12$BW0pWoWH4z4KlgX.7LJhdOSs1ilgdMz53x4ZDrYvUt4L9wVPyadvm	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
125	MOBILE_BANKING	helbert.c.5380	265888067666	29519408	\N	$2b$12$bod6Z07mFrKR3v0sSeCsZOEjNlXuo2CUTzaqdgSYW9K9CEUK8IsLy	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
126	MOBILE_BANKING	aaron.p.9471	+265998645894	29604842	\N	$2b$12$MxoNn441HLdkMFF3aFyz1uXBeAoAA2HwpBkny8DJ5i4SwgyS0nDLK	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
127	MOBILE_BANKING	fishani.c.3745	+265999122751	43830	\N	$2b$12$SZeYm5O8DBuGjW7elJ6rBeTJ4F5EveXWFjGO5WcMp0dSJOkEEcebW	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
128	MOBILE_BANKING	edwin.z.2493	+265885460023	320828	\N	$2b$12$rh1lTi6LEeaz./zVCNxMF./O9p9S.p5/slEaebKXVywNw9c651ZGK	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
129	MOBILE_BANKING	ruth.k.8153	+265888863944	1024	\N	$2b$12$3z8iPIYfiWcSyLJW0Lq51u1xc9MObTl7.2CnSIMveGXspmEPjO3ia	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
130	MOBILE_BANKING	umodzi.m.4451	+265999156886	29708193	\N	$2b$12$DHGYIXthSArBT0def4yB5eT3nJD0u7on8mnVhRNDyRgvQFxlGjNxq	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
131	MOBILE_BANKING	trevor.z.2559	+265999917221	1503413	\N	$2b$12$Z71uZ2lJP0vvNsoKZF20O.KobVdUYf533nfT..IL32wkXFrfewB3q	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
132	MOBILE_BANKING	trevor.z.3973	+265999917221	98299	\N	$2b$12$hKnDmQhQomqYGlZ.385V0Oh7Cmcjd9qMlNe7rINQhX3dE0i6NvzDa	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
133	MOBILE_BANKING	helbert.c.8435	265888067666	29519407	\N	$2b$12$.A.JeltUCYNn2DIg1XEJq.gydO44IhXTQOw4kkc6Oo3n1p3bxUs8.	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
134	MOBILE_BANKING	william.m.3567	+265 999524219	1472	\N	$2b$12$4KfoAfSd1/Vc9fE2u7f5qemPAVhO1kXKpzDtllcvA34jzIed9Xpea	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
135	MOBILE_BANKING	..9428	+265999917221		\N	$2b$12$VTKyyYwOUmKCTrXMNgtdPemxnljcCepy5JuZUeOY/M9GtuULNxZY2	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
136	MOBILE_BANKING	william.m.2133	+265999888920		\N	$2b$12$SUFngzEwLUBpt0Fr1Nrflux91pEjbkwCyUNHrOStxyJMI3r6RAhci	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
137	MOBILE_BANKING	..8884	+265999917221		\N	$2b$12$Jub846ZuJrxjwkyHt2eiZug.PUegAUdJop30aVlWBN5BPbAJS90ga	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
138	MOBILE_BANKING	sheriff.a.7509	+265999512222	1128689	\N	$2b$12$sIfkcq7gL1.xoFXtLxORsOsGY70KQzsTHjlaGZxr8gmlG3zK28Cse	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
139	MOBILE_BANKING	sambanayo.k.5609	+265999917221	29519407	\N	$2b$12$0C5sFRjl/OkpW9owdhJe6eiZJ1g1T9tIHvFUBwJbOt8A8UGdIif1W	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
140	MOBILE_BANKING	nelson.k.1594	+265888537597	674648	\N	$2b$12$v20fXf92WqNbR2XxHfzX5OCEwnlJcL8EUbjuNQYZTO1EYdLCu4E7q	t	2025-12-13 14:07:46.235	2025-12-13 14:07:46.235	0	\N
\.


--
-- Data for Name: forms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.forms (id, name, description, category, schema, is_active, is_public, allow_multiple, requires_auth, created_by, version, created_at, updated_at) FROM stdin;
cmj2a1u0f0000pb429a3eq24b	Bank signup	\N	\N	{"fields": []}	t	f	f	t	1	1	2025-12-12 02:58:08.558	2025-12-12 02:58:08.558
\.


--
-- Data for Name: mobile_devices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mobile_devices (id, mobile_user_id, name, model, os, "deviceId", "credentialId", "publicKey", counter, transports, is_active, last_used_at, created_at, updated_at, last_login_ip, login_count, verification_ip, verification_location, verified_via) FROM stdin;
cmj2ppebc000mmo434zyx99rr	23	Xiaomi Mi MIX 3	\N	\N	BP1A.250505.005	\N	\N	0	{}	t	\N	2025-12-12 10:16:22.201	2025-12-12 10:16:22.201	\N	0	\N	\N	OTP_SMS
cmj249ikz0001pb3xc3v7kg4f	58	Xiaomi Mi MIX 3	\N	\N	BP1A.250505.005	\N	\N	0	{}	t	2025-12-13 20:01:20.698	2025-12-12 00:16:09.299	2025-12-13 20:01:20.7	\N	26	\N	\N	OTP_SMS
\.


--
-- Data for Name: requested_registrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.requested_registrations (id, source_ip, request_body, source, phone_number, customer_number, email_address, first_name, last_name, profile_type, company, status, processed_at, elixir_user_id, mobile_user_id, error_message, retry_count, last_retry_at, processed_by, notes, created_at, updated_at, validation_data, process_log) FROM stdin;
1	::ffff:172.19.0.1	{"service": "REGISTRATION", "last_name": "Kamanga", "first_name": "Jimmy", "phone_number": "260977396223", "profile_type": "INDIVIDUAL", "email_address": "jimmykamanga@gmail.com", "service_action": "MOBILE_BANKING_REGISTRATION", "customer_number": "1234561"}	THIRD_PARTY_API	260977396223	1234561	jimmykamanga@gmail.com	Jimmy	Kamanga	INDIVIDUAL	\N	PENDING	\N	\N	\N	\nInvalid `__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].requestedRegistration.update()` invocation in\n/app/.next/dev/server/chunks/[root-of-the-server]__70d50a51._.js:405:185\n\n  402 if (!accountsResult.ok || !accountsResult.accounts || accountsResult.accounts.length === 0) {\n  403     logStage(__TURBOPACK__imported__module__$5b$project$5d2f$types$2f$process$2d$stages$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["VALIDATION_STAGES"].T24_LOOKUP, 'failed', 'No accounts found', accountsResult.error || 'Customer has no accounts');\n  404     // No accounts found - mark as FAILED\n→ 405     const updated = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].requestedRegistration.update(\nForeign key constraint violated on the constraint: `requested_registrations_processed_by_fkey`	5	2025-12-13 16:37:03.112	\N	\N	2025-12-13 15:45:26.052	2025-12-13 16:37:03.113	\N	{}
\.


--
-- Data for Name: suspicious_activity_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.suspicious_activity_log (id, alert_id, mobile_user_id, account_number, suspicion_reason, risk_score, detection_details, related_transaction_ids, device_id, ip_address, location, is_resolved, resolved_at, resolution_action, admin_notes, detected_at, created_at) FROM stdin;
\.


--
-- Data for Name: workflow_steps; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.workflow_steps (id, workflow_id, type, label, "order", config, validation, is_active, created_at, updated_at) FROM stdin;
cmj4s2myd0002li3xazy5f9rd	cmj4s2my90000li3xkxwg5qic	FORM	Let	0	{}	\N	t	2025-12-13 20:58:11.509	2025-12-13 20:58:11.509
\.


--
-- Data for Name: workflows; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.workflows (id, name, description, is_active, version, created_at, updated_at) FROM stdin;
cmj4s2my90000li3xkxwg5qic	Money transfer		t	1	2025-12-13 20:58:11.506	2025-12-13 21:12:05.126
\.


--
-- Name: CoreBankingConnection_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."CoreBankingConnection_id_seq"', 1, true);


--
-- Name: CoreBankingEndpoint_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."CoreBankingEndpoint_id_seq"', 1, true);


--
-- Name: DatabaseConnection_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."DatabaseConnection_id_seq"', 1, true);


--
-- Name: account_alert_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.account_alert_settings_id_seq', 102, true);


--
-- Name: account_alerts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.account_alerts_id_seq', 1, false);


--
-- Name: admin_web_password_reset_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.admin_web_password_reset_tokens_id_seq', 1, false);


--
-- Name: admin_web_users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.admin_web_users_id_seq', 1, false);


--
-- Name: checkbook_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.checkbook_requests_id_seq', 1, false);


--
-- Name: fdh_account_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.fdh_account_categories_id_seq', 95, true);


--
-- Name: fdh_beneficiaries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.fdh_beneficiaries_id_seq', 1, false);


--
-- Name: fdh_migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.fdh_migrations_id_seq', 1, true);


--
-- Name: fdh_mobile_user_accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.fdh_mobile_user_accounts_id_seq', 150, true);


--
-- Name: fdh_mobile_user_profiles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.fdh_mobile_user_profiles_id_seq', 15, true);


--
-- Name: fdh_mobile_users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.fdh_mobile_users_id_seq', 140, true);


--
-- Name: requested_registrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.requested_registrations_id_seq', 1, true);


--
-- Name: suspicious_activity_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.suspicious_activity_log_id_seq', 1, false);


--
-- Name: CoreBankingConnection CoreBankingConnection_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CoreBankingConnection"
    ADD CONSTRAINT "CoreBankingConnection_pkey" PRIMARY KEY (id);


--
-- Name: CoreBankingEndpoint CoreBankingEndpoint_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CoreBankingEndpoint"
    ADD CONSTRAINT "CoreBankingEndpoint_pkey" PRIMARY KEY (id);


--
-- Name: DatabaseConnection DatabaseConnection_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DatabaseConnection"
    ADD CONSTRAINT "DatabaseConnection_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: account_alert_settings account_alert_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_alert_settings
    ADD CONSTRAINT account_alert_settings_pkey PRIMARY KEY (id);


--
-- Name: account_alerts account_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_alerts
    ADD CONSTRAINT account_alerts_pkey PRIMARY KEY (id);


--
-- Name: admin_web_password_reset_tokens admin_web_password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_web_password_reset_tokens
    ADD CONSTRAINT admin_web_password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: admin_web_users admin_web_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_web_users
    ADD CONSTRAINT admin_web_users_pkey PRIMARY KEY (id);


--
-- Name: app_screen_page_workflows app_screen_page_workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_screen_page_workflows
    ADD CONSTRAINT app_screen_page_workflows_pkey PRIMARY KEY (id);


--
-- Name: app_screen_pages app_screen_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_screen_pages
    ADD CONSTRAINT app_screen_pages_pkey PRIMARY KEY (id);


--
-- Name: app_screens app_screens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_screens
    ADD CONSTRAINT app_screens_pkey PRIMARY KEY (id);


--
-- Name: biller_configs biller_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.biller_configs
    ADD CONSTRAINT biller_configs_pkey PRIMARY KEY (id);


--
-- Name: biller_transactions biller_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.biller_transactions
    ADD CONSTRAINT biller_transactions_pkey PRIMARY KEY (id);


--
-- Name: checkbook_requests checkbook_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.checkbook_requests
    ADD CONSTRAINT checkbook_requests_pkey PRIMARY KEY (id);


--
-- Name: fdh_account_categories fdh_account_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fdh_account_categories
    ADD CONSTRAINT fdh_account_categories_pkey PRIMARY KEY (id);


--
-- Name: fdh_backups fdh_backups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fdh_backups
    ADD CONSTRAINT fdh_backups_pkey PRIMARY KEY (id);


--
-- Name: fdh_beneficiaries fdh_beneficiaries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fdh_beneficiaries
    ADD CONSTRAINT fdh_beneficiaries_pkey PRIMARY KEY (id);


--
-- Name: fdh_device_login_attempts fdh_device_login_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fdh_device_login_attempts
    ADD CONSTRAINT fdh_device_login_attempts_pkey PRIMARY KEY (id);


--
-- Name: fdh_device_sessions fdh_device_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fdh_device_sessions
    ADD CONSTRAINT fdh_device_sessions_pkey PRIMARY KEY (id);


--
-- Name: fdh_migrations fdh_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fdh_migrations
    ADD CONSTRAINT fdh_migrations_pkey PRIMARY KEY (id);


--
-- Name: fdh_mobile_user_accounts fdh_mobile_user_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fdh_mobile_user_accounts
    ADD CONSTRAINT fdh_mobile_user_accounts_pkey PRIMARY KEY (id);


--
-- Name: fdh_mobile_user_profiles fdh_mobile_user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fdh_mobile_user_profiles
    ADD CONSTRAINT fdh_mobile_user_profiles_pkey PRIMARY KEY (id);


--
-- Name: fdh_mobile_users fdh_mobile_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fdh_mobile_users
    ADD CONSTRAINT fdh_mobile_users_pkey PRIMARY KEY (id);


--
-- Name: forms forms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forms
    ADD CONSTRAINT forms_pkey PRIMARY KEY (id);


--
-- Name: mobile_devices mobile_devices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mobile_devices
    ADD CONSTRAINT mobile_devices_pkey PRIMARY KEY (id);


--
-- Name: requested_registrations requested_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requested_registrations
    ADD CONSTRAINT requested_registrations_pkey PRIMARY KEY (id);


--
-- Name: suspicious_activity_log suspicious_activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suspicious_activity_log
    ADD CONSTRAINT suspicious_activity_log_pkey PRIMARY KEY (id);


--
-- Name: workflow_steps workflow_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_steps
    ADD CONSTRAINT workflow_steps_pkey PRIMARY KEY (id);


--
-- Name: workflows workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT workflows_pkey PRIMARY KEY (id);


--
-- Name: account_alert_settings_account_number_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX account_alert_settings_account_number_idx ON public.account_alert_settings USING btree (account_number);


--
-- Name: account_alert_settings_mobile_user_id_account_number_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX account_alert_settings_mobile_user_id_account_number_key ON public.account_alert_settings USING btree (mobile_user_id, account_number);


--
-- Name: account_alert_settings_mobile_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX account_alert_settings_mobile_user_id_idx ON public.account_alert_settings USING btree (mobile_user_id);


--
-- Name: account_alerts_account_number_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX account_alerts_account_number_idx ON public.account_alerts USING btree (account_number);


--
-- Name: account_alerts_alert_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX account_alerts_alert_type_idx ON public.account_alerts USING btree (alert_type);


--
-- Name: account_alerts_mobile_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX account_alerts_mobile_user_id_idx ON public.account_alerts USING btree (mobile_user_id);


--
-- Name: account_alerts_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX account_alerts_status_idx ON public.account_alerts USING btree (status);


--
-- Name: account_alerts_triggered_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX account_alerts_triggered_at_idx ON public.account_alerts USING btree (triggered_at);


--
-- Name: admin_web_password_reset_tokens_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX admin_web_password_reset_tokens_token_key ON public.admin_web_password_reset_tokens USING btree (token);


--
-- Name: admin_web_users_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX admin_web_users_email_key ON public.admin_web_users USING btree (email);


--
-- Name: app_screen_page_workflows_order_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX app_screen_page_workflows_order_idx ON public.app_screen_page_workflows USING btree ("order");


--
-- Name: app_screen_page_workflows_page_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX app_screen_page_workflows_page_id_idx ON public.app_screen_page_workflows USING btree (page_id);


--
-- Name: app_screen_page_workflows_page_id_workflow_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX app_screen_page_workflows_page_id_workflow_id_key ON public.app_screen_page_workflows USING btree (page_id, workflow_id);


--
-- Name: app_screen_page_workflows_workflow_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX app_screen_page_workflows_workflow_id_idx ON public.app_screen_page_workflows USING btree (workflow_id);


--
-- Name: app_screen_pages_is_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX app_screen_pages_is_active_idx ON public.app_screen_pages USING btree (is_active);


--
-- Name: app_screen_pages_order_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX app_screen_pages_order_idx ON public.app_screen_pages USING btree ("order");


--
-- Name: app_screen_pages_screen_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX app_screen_pages_screen_id_idx ON public.app_screen_pages USING btree (screen_id);


--
-- Name: app_screen_pages_screen_id_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX app_screen_pages_screen_id_name_key ON public.app_screen_pages USING btree (screen_id, name);


--
-- Name: app_screens_context_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX app_screens_context_idx ON public.app_screens USING btree (context);


--
-- Name: app_screens_context_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX app_screens_context_name_key ON public.app_screens USING btree (context, name);


--
-- Name: app_screens_is_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX app_screens_is_active_idx ON public.app_screens USING btree (is_active);


--
-- Name: app_screens_order_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX app_screens_order_idx ON public.app_screens USING btree ("order");


--
-- Name: biller_configs_biller_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX biller_configs_biller_type_idx ON public.biller_configs USING btree (biller_type);


--
-- Name: biller_configs_biller_type_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX biller_configs_biller_type_key ON public.biller_configs USING btree (biller_type);


--
-- Name: biller_configs_is_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX biller_configs_is_active_idx ON public.biller_configs USING btree (is_active);


--
-- Name: biller_transactions_account_number_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX biller_transactions_account_number_idx ON public.biller_transactions USING btree (account_number);


--
-- Name: biller_transactions_biller_config_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX biller_transactions_biller_config_id_idx ON public.biller_transactions USING btree (biller_config_id);


--
-- Name: biller_transactions_biller_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX biller_transactions_biller_type_idx ON public.biller_transactions USING btree (biller_type);


--
-- Name: biller_transactions_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX biller_transactions_created_at_idx ON public.biller_transactions USING btree (created_at);


--
-- Name: biller_transactions_our_transaction_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX biller_transactions_our_transaction_id_idx ON public.biller_transactions USING btree (our_transaction_id);


--
-- Name: biller_transactions_our_transaction_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX biller_transactions_our_transaction_id_key ON public.biller_transactions USING btree (our_transaction_id);


--
-- Name: biller_transactions_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX biller_transactions_status_idx ON public.biller_transactions USING btree (status);


--
-- Name: checkbook_requests_account_number_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX checkbook_requests_account_number_idx ON public.checkbook_requests USING btree (account_number);


--
-- Name: checkbook_requests_mobile_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX checkbook_requests_mobile_user_id_idx ON public.checkbook_requests USING btree (mobile_user_id);


--
-- Name: checkbook_requests_requested_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX checkbook_requests_requested_at_idx ON public.checkbook_requests USING btree (requested_at);


--
-- Name: checkbook_requests_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX checkbook_requests_status_idx ON public.checkbook_requests USING btree (status);


--
-- Name: fdh_account_categories_category_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX fdh_account_categories_category_key ON public.fdh_account_categories USING btree (category);


--
-- Name: fdh_backups_filename_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX fdh_backups_filename_key ON public.fdh_backups USING btree (filename);


--
-- Name: fdh_beneficiaries_beneficiary_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fdh_beneficiaries_beneficiary_type_idx ON public.fdh_beneficiaries USING btree (beneficiary_type);


--
-- Name: fdh_beneficiaries_user_id_account_number_bank_code_benefici_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX fdh_beneficiaries_user_id_account_number_bank_code_benefici_key ON public.fdh_beneficiaries USING btree (user_id, account_number, bank_code, beneficiary_type);


--
-- Name: fdh_beneficiaries_user_id_account_number_beneficiary_type_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX fdh_beneficiaries_user_id_account_number_beneficiary_type_key ON public.fdh_beneficiaries USING btree (user_id, account_number, beneficiary_type);


--
-- Name: fdh_beneficiaries_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fdh_beneficiaries_user_id_idx ON public.fdh_beneficiaries USING btree (user_id);


--
-- Name: fdh_beneficiaries_user_id_phone_number_beneficiary_type_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX fdh_beneficiaries_user_id_phone_number_beneficiary_type_key ON public.fdh_beneficiaries USING btree (user_id, phone_number, beneficiary_type);


--
-- Name: fdh_device_login_attempts_attempted_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fdh_device_login_attempts_attempted_at_idx ON public.fdh_device_login_attempts USING btree (attempted_at);


--
-- Name: fdh_device_login_attempts_device_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fdh_device_login_attempts_device_id_idx ON public.fdh_device_login_attempts USING btree (device_id);


--
-- Name: fdh_device_login_attempts_mobile_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fdh_device_login_attempts_mobile_user_id_idx ON public.fdh_device_login_attempts USING btree (mobile_user_id);


--
-- Name: fdh_device_login_attempts_verification_token_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fdh_device_login_attempts_verification_token_idx ON public.fdh_device_login_attempts USING btree (verification_token);


--
-- Name: fdh_device_login_attempts_verification_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX fdh_device_login_attempts_verification_token_key ON public.fdh_device_login_attempts USING btree (verification_token);


--
-- Name: fdh_device_sessions_device_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fdh_device_sessions_device_id_idx ON public.fdh_device_sessions USING btree (device_id);


--
-- Name: fdh_device_sessions_is_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fdh_device_sessions_is_active_idx ON public.fdh_device_sessions USING btree (is_active);


--
-- Name: fdh_device_sessions_mobile_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fdh_device_sessions_mobile_user_id_idx ON public.fdh_device_sessions USING btree (mobile_user_id);


--
-- Name: fdh_device_sessions_session_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fdh_device_sessions_session_id_idx ON public.fdh_device_sessions USING btree (session_id);


--
-- Name: fdh_device_sessions_session_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX fdh_device_sessions_session_id_key ON public.fdh_device_sessions USING btree (session_id);


--
-- Name: fdh_device_sessions_tokenHash_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "fdh_device_sessions_tokenHash_idx" ON public.fdh_device_sessions USING btree ("tokenHash");


--
-- Name: fdh_device_sessions_tokenHash_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "fdh_device_sessions_tokenHash_key" ON public.fdh_device_sessions USING btree ("tokenHash");


--
-- Name: fdh_mobile_user_accounts_mobile_user_id_account_number_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX fdh_mobile_user_accounts_mobile_user_id_account_number_key ON public.fdh_mobile_user_accounts USING btree (mobile_user_id, account_number);


--
-- Name: fdh_mobile_user_accounts_mobile_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fdh_mobile_user_accounts_mobile_user_id_idx ON public.fdh_mobile_user_accounts USING btree (mobile_user_id);


--
-- Name: fdh_mobile_user_profiles_mobile_user_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX fdh_mobile_user_profiles_mobile_user_id_key ON public.fdh_mobile_user_profiles USING btree (mobile_user_id);


--
-- Name: forms_category_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX forms_category_idx ON public.forms USING btree (category);


--
-- Name: forms_is_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX forms_is_active_idx ON public.forms USING btree (is_active);


--
-- Name: mobile_devices_credentialId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "mobile_devices_credentialId_key" ON public.mobile_devices USING btree ("credentialId");


--
-- Name: mobile_devices_mobile_user_id_deviceId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "mobile_devices_mobile_user_id_deviceId_key" ON public.mobile_devices USING btree (mobile_user_id, "deviceId");


--
-- Name: mobile_devices_mobile_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX mobile_devices_mobile_user_id_idx ON public.mobile_devices USING btree (mobile_user_id);


--
-- Name: requested_registrations_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX requested_registrations_created_at_idx ON public.requested_registrations USING btree (created_at);


--
-- Name: requested_registrations_customer_number_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX requested_registrations_customer_number_idx ON public.requested_registrations USING btree (customer_number);


--
-- Name: requested_registrations_phone_number_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX requested_registrations_phone_number_idx ON public.requested_registrations USING btree (phone_number);


--
-- Name: requested_registrations_source_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX requested_registrations_source_idx ON public.requested_registrations USING btree (source);


--
-- Name: requested_registrations_source_ip_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX requested_registrations_source_ip_idx ON public.requested_registrations USING btree (source_ip);


--
-- Name: requested_registrations_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX requested_registrations_status_idx ON public.requested_registrations USING btree (status);


--
-- Name: suspicious_activity_log_alert_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX suspicious_activity_log_alert_id_idx ON public.suspicious_activity_log USING btree (alert_id);


--
-- Name: suspicious_activity_log_detected_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX suspicious_activity_log_detected_at_idx ON public.suspicious_activity_log USING btree (detected_at);


--
-- Name: suspicious_activity_log_is_resolved_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX suspicious_activity_log_is_resolved_idx ON public.suspicious_activity_log USING btree (is_resolved);


--
-- Name: suspicious_activity_log_mobile_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX suspicious_activity_log_mobile_user_id_idx ON public.suspicious_activity_log USING btree (mobile_user_id);


--
-- Name: suspicious_activity_log_risk_score_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX suspicious_activity_log_risk_score_idx ON public.suspicious_activity_log USING btree (risk_score);


--
-- Name: workflow_steps_is_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX workflow_steps_is_active_idx ON public.workflow_steps USING btree (is_active);


--
-- Name: workflow_steps_order_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX workflow_steps_order_idx ON public.workflow_steps USING btree ("order");


--
-- Name: workflow_steps_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX workflow_steps_type_idx ON public.workflow_steps USING btree (type);


--
-- Name: workflow_steps_workflow_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX workflow_steps_workflow_id_idx ON public.workflow_steps USING btree (workflow_id);


--
-- Name: workflows_is_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX workflows_is_active_idx ON public.workflows USING btree (is_active);


--
-- Name: workflows_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX workflows_name_key ON public.workflows USING btree (name);


--
-- Name: CoreBankingEndpoint CoreBankingEndpoint_connectionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CoreBankingEndpoint"
    ADD CONSTRAINT "CoreBankingEndpoint_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES public."CoreBankingConnection"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: account_alert_settings account_alert_settings_mobile_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_alert_settings
    ADD CONSTRAINT account_alert_settings_mobile_user_id_fkey FOREIGN KEY (mobile_user_id) REFERENCES public.fdh_mobile_users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: account_alerts account_alerts_mobile_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_alerts
    ADD CONSTRAINT account_alerts_mobile_user_id_fkey FOREIGN KEY (mobile_user_id) REFERENCES public.fdh_mobile_users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: admin_web_password_reset_tokens admin_web_password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_web_password_reset_tokens
    ADD CONSTRAINT admin_web_password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.admin_web_users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: app_screen_page_workflows app_screen_page_workflows_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_screen_page_workflows
    ADD CONSTRAINT app_screen_page_workflows_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.app_screen_pages(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: app_screen_page_workflows app_screen_page_workflows_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_screen_page_workflows
    ADD CONSTRAINT app_screen_page_workflows_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflows(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: app_screen_pages app_screen_pages_screen_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_screen_pages
    ADD CONSTRAINT app_screen_pages_screen_id_fkey FOREIGN KEY (screen_id) REFERENCES public.app_screens(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: biller_transactions biller_transactions_biller_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.biller_transactions
    ADD CONSTRAINT biller_transactions_biller_config_id_fkey FOREIGN KEY (biller_config_id) REFERENCES public.biller_configs(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: checkbook_requests checkbook_requests_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.checkbook_requests
    ADD CONSTRAINT checkbook_requests_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.admin_web_users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: checkbook_requests checkbook_requests_mobile_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.checkbook_requests
    ADD CONSTRAINT checkbook_requests_mobile_user_id_fkey FOREIGN KEY (mobile_user_id) REFERENCES public.fdh_mobile_users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: fdh_beneficiaries fdh_beneficiaries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fdh_beneficiaries
    ADD CONSTRAINT fdh_beneficiaries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.fdh_mobile_users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: fdh_device_login_attempts fdh_device_login_attempts_mobile_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fdh_device_login_attempts
    ADD CONSTRAINT fdh_device_login_attempts_mobile_user_id_fkey FOREIGN KEY (mobile_user_id) REFERENCES public.fdh_mobile_users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: fdh_device_sessions fdh_device_sessions_mobile_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fdh_device_sessions
    ADD CONSTRAINT fdh_device_sessions_mobile_user_id_fkey FOREIGN KEY (mobile_user_id) REFERENCES public.fdh_mobile_users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: fdh_migrations fdh_migrations_sourceConnectionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fdh_migrations
    ADD CONSTRAINT "fdh_migrations_sourceConnectionId_fkey" FOREIGN KEY ("sourceConnectionId") REFERENCES public."DatabaseConnection"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: fdh_mobile_user_accounts fdh_mobile_user_accounts_mobile_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fdh_mobile_user_accounts
    ADD CONSTRAINT fdh_mobile_user_accounts_mobile_user_id_fkey FOREIGN KEY (mobile_user_id) REFERENCES public.fdh_mobile_users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: fdh_mobile_user_profiles fdh_mobile_user_profiles_mobile_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fdh_mobile_user_profiles
    ADD CONSTRAINT fdh_mobile_user_profiles_mobile_user_id_fkey FOREIGN KEY (mobile_user_id) REFERENCES public.fdh_mobile_users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: mobile_devices mobile_devices_mobile_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mobile_devices
    ADD CONSTRAINT mobile_devices_mobile_user_id_fkey FOREIGN KEY (mobile_user_id) REFERENCES public.fdh_mobile_users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: requested_registrations requested_registrations_mobile_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requested_registrations
    ADD CONSTRAINT requested_registrations_mobile_user_id_fkey FOREIGN KEY (mobile_user_id) REFERENCES public.fdh_mobile_users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: requested_registrations requested_registrations_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requested_registrations
    ADD CONSTRAINT requested_registrations_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.admin_web_users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: suspicious_activity_log suspicious_activity_log_alert_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suspicious_activity_log
    ADD CONSTRAINT suspicious_activity_log_alert_id_fkey FOREIGN KEY (alert_id) REFERENCES public.account_alerts(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: suspicious_activity_log suspicious_activity_log_mobile_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suspicious_activity_log
    ADD CONSTRAINT suspicious_activity_log_mobile_user_id_fkey FOREIGN KEY (mobile_user_id) REFERENCES public.fdh_mobile_users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: workflow_steps workflow_steps_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_steps
    ADD CONSTRAINT workflow_steps_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflows(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict BL3C8uyfAfehcX6PxwACzQ5JLYpWaTGZ2ur8EpEGziYsNRLZlxqcTdfgyMRrqDB

