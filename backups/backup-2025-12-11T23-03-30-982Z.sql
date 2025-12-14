--
-- PostgreSQL database dump
--

\restrict Yct3l71rEoJ8UjEifddFm0YjIP6iMMTNVYtxJddXXNbvVCH6cWyHfIK5B56fULr

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
-- Name: BeneficiaryType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."BeneficiaryType" AS ENUM (
    'WALLET',
    'BANK_INTERNAL',
    'BANK_EXTERNAL'
);


ALTER TYPE public."BeneficiaryType" OWNER TO postgres;

--
-- Name: CoreBankingAuthType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."CoreBankingAuthType" AS ENUM (
    'BASIC',
    'BEARER'
);


ALTER TYPE public."CoreBankingAuthType" OWNER TO postgres;

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
-- Name: fdh_backups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fdh_backups (
    id text NOT NULL,
    filename text NOT NULL,
    size_bytes bigint NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
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
    updated_at timestamp(3) without time zone NOT NULL
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
    updated_at timestamp(3) without time zone NOT NULL
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
-- Name: mobile_devices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mobile_devices (
    id text NOT NULL,
    mobile_user_id integer NOT NULL,
    name text,
    model text,
    os text,
    "deviceId" text,
    "credentialId" text NOT NULL,
    "publicKey" text NOT NULL,
    counter bigint DEFAULT 0 NOT NULL,
    transports text[],
    is_active boolean DEFAULT true NOT NULL,
    last_used_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.mobile_devices OWNER TO postgres;

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
-- Name: admin_web_password_reset_tokens id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_web_password_reset_tokens ALTER COLUMN id SET DEFAULT nextval('public.admin_web_password_reset_tokens_id_seq'::regclass);


--
-- Name: admin_web_users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_web_users ALTER COLUMN id SET DEFAULT nextval('public.admin_web_users_id_seq'::regclass);


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
-- Name: fdh_mobile_users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fdh_mobile_users ALTER COLUMN id SET DEFAULT nextval('public.fdh_mobile_users_id_seq'::regclass);


--
-- Data for Name: CoreBankingConnection; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."CoreBankingConnection" (id, name, username, password, "baseUrl", "authType", token, "isActive", "createdAt", "updatedAt", "lastTestedAt", "lastTestOk", "lastTestMessage") FROM stdin;
1	FDH esb	admin	admin	https://fdh-esb.ngrok.dev/	BASIC	\N	t	2025-12-11 19:12:05.426	2025-12-11 19:39:24.906	2025-12-11 19:39:24.903	t	HTTP 200 OK
\.


--
-- Data for Name: CoreBankingEndpoint; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."CoreBankingEndpoint" (id, "connectionId", name, method, path, "bodyTemplate", "isActive", "createdAt", "updatedAt") FROM stdin;
1	1	Get accounts	GET	api/esb/accounts/1.0/account/{{customer_number}}	\N	t	2025-12-11 19:40:15.113	2025-12-11 19:40:15.113
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
eeaea01c-a968-498c-9f34-81c1819a6597	a6bc945c1422d45f84c7102eacf655f367966b98dbb236a78e777cb03b115140	2025-12-11 22:41:05.054044+00	20251211224018_add_mobile_user_accounts	\N	\N	2025-12-11 22:41:04.994343+00	1
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
-- Data for Name: fdh_backups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fdh_backups (id, filename, size_bytes, created_at) FROM stdin;
\.


--
-- Data for Name: fdh_beneficiaries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fdh_beneficiaries (id, user_id, name, beneficiary_type, phone_number, account_number, bank_code, bank_name, branch, description, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: fdh_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fdh_migrations (id, name, description, "sourceConnectionId", "sourceQuery", "targetTable", "targetInsertQuery", status, "lastRunAt", "lastRunSuccess", "lastRunMessage", "lastRunRowsAffected", "createdAt", "updatedAt", cron_expression, is_recurring, next_run_at) FROM stdin;
1	Get users	\N	1	SELECT "context", "username", "phoneNumber", "passwordHash" FROM fdh_mobile_users	fdh_mobile_users	INSERT INTO fdh_mobile_users ("context", "username", "phoneNumber", "passwordHash", "created_at", "updated_at") VALUES ({{context}}, {{username}}, {{phoneNumber}}, {{passwordHash}}, NOW(), NOW())	COMPLETED	2025-12-11 22:15:21.22	t	Successfully migrated 70 rows.	70	2025-12-11 22:00:00.062	2025-12-11 22:15:21.221	\N	f	\N
\.


--
-- Data for Name: fdh_mobile_user_accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fdh_mobile_user_accounts (id, mobile_user_id, account_number, account_name, account_type, currency, balance, is_primary, is_active, created_at, updated_at) FROM stdin;
1	58	A123456	Test Savings	SAVINGS	MWK	\N	t	t	2025-12-11 22:53:26.332	2025-12-11 22:53:26.332
\.


--
-- Data for Name: fdh_mobile_users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fdh_mobile_users (id, context, username, "phoneNumber", "customerNumber", "accountNumber", "passwordHash", "isActive", created_at, updated_at) FROM stdin;
1	WALLET	\N	0966621003	\N	\N	$2b$12$h1RGORIB17kMtL0Dpxjy8.fQr9FV3M4U./SyYBUb00wCxe0GUBsbC	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
2	WALLET	\N	265888067666	\N	\N	$2b$12$60Q2zyDQxIL6ozT2ThiquOL6246KI3NvfMAKUvIMZjmkw/5qIXbOS	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
3	WALLET	\N	260970210154	\N	\N	$2b$12$3cIRAJUjXikjhWY0eVtnl.tJ5zpQsaYN4haE72xOcqcMszhE.B4H2	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
4	WALLET	\N	260978148389	\N	\N	$2b$12$lpnrZS0dn93uzueI8Qg2MOROtxtbfhmdmQ6ztugCMHQS9Fx4XEhtm	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
5	WALLET	\N	260776836233	\N	\N	$2b$12$O5vEXmBLm3VURxdVkvwhM.SxepSncqGvP6omfPB54zdTZ/1xqhyQG	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
6	WALLET	\N	260973674607	\N	\N	$2b$12$DA6rq8YhNFU6d0QBdnNCIeUr4y0wZ3ZW82CmkMDjMTeqOuHWXjGIO	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
7	WALLET	\N	263773077633	\N	\N	$2b$12$ctAKnYQChuJFqpeplP3XyOMyphD1NGFAr3qZrVrrjcM9yGi5arFGy	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
8	WALLET	\N	260961706289	\N	\N	$2b$12$ZIBWMHQhugcYPsmB.uO3Hu9sudDt4PBvW6jdgN3GlI/Q.PAKhyXT.	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
9	WALLET	\N	265999608664	\N	\N	$2b$12$dboLtAoZtbOILDoSkpOq0OkZXB1k9ol/pkcBEN/ht90vWUxenJ09a	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
10	WALLET	\N	265977396223	\N	\N	$2b$12$HuVMyQXL5nk1ImjsWCocIe.LMChbB/wRoQPMH/YH8rNHwGPZ4pu0u	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
11	WALLET	\N	265998765432	\N	\N	$2b$12$FMYxUJIaxdlTnidGV97Jn.JAm2Lg5DodVq4f/44i7O3nSvZlN4tpW	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
12	WALLET	\N	265970210154	\N	\N	$2b$12$FkxWhs8iFqAFvF30Mh5vMuLiVH6poE1N8W9zwTeYEgDHb1BDVYZKa	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
13	WALLET	\N	265999512222	\N	\N	$2b$12$MvSuZ3SA1wiOh4DGwYrhg.tGoe9XglpWaC0OUkXMEyur5ElvvbJGS	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
14	WALLET	\N	0966621003	\N	\N	$2b$12$h1RGORIB17kMtL0Dpxjy8.fQr9FV3M4U./SyYBUb00wCxe0GUBsbC	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
15	WALLET	\N	265888067666	\N	\N	$2b$12$60Q2zyDQxIL6ozT2ThiquOL6246KI3NvfMAKUvIMZjmkw/5qIXbOS	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
16	WALLET	\N	260970210154	\N	\N	$2b$12$3cIRAJUjXikjhWY0eVtnl.tJ5zpQsaYN4haE72xOcqcMszhE.B4H2	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
17	WALLET	\N	260978148389	\N	\N	$2b$12$lpnrZS0dn93uzueI8Qg2MOROtxtbfhmdmQ6ztugCMHQS9Fx4XEhtm	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
18	WALLET	\N	260776836233	\N	\N	$2b$12$O5vEXmBLm3VURxdVkvwhM.SxepSncqGvP6omfPB54zdTZ/1xqhyQG	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
19	WALLET	\N	260973674607	\N	\N	$2b$12$DA6rq8YhNFU6d0QBdnNCIeUr4y0wZ3ZW82CmkMDjMTeqOuHWXjGIO	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
20	WALLET	\N	263773077633	\N	\N	$2b$12$ctAKnYQChuJFqpeplP3XyOMyphD1NGFAr3qZrVrrjcM9yGi5arFGy	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
21	WALLET	\N	260961706289	\N	\N	$2b$12$ZIBWMHQhugcYPsmB.uO3Hu9sudDt4PBvW6jdgN3GlI/Q.PAKhyXT.	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
22	WALLET	\N	265999608664	\N	\N	$2b$12$dboLtAoZtbOILDoSkpOq0OkZXB1k9ol/pkcBEN/ht90vWUxenJ09a	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
23	WALLET	\N	265977396223	\N	\N	$2b$12$HuVMyQXL5nk1ImjsWCocIe.LMChbB/wRoQPMH/YH8rNHwGPZ4pu0u	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
24	WALLET	\N	265998765432	\N	\N	$2b$12$FMYxUJIaxdlTnidGV97Jn.JAm2Lg5DodVq4f/44i7O3nSvZlN4tpW	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
25	WALLET	\N	265970210154	\N	\N	$2b$12$FkxWhs8iFqAFvF30Mh5vMuLiVH6poE1N8W9zwTeYEgDHb1BDVYZKa	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
26	WALLET	\N	265999512222	\N	\N	$2b$12$MvSuZ3SA1wiOh4DGwYrhg.tGoe9XglpWaC0OUkXMEyur5ElvvbJGS	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
27	WALLET	\N	0966621003	\N	\N	$2b$12$h1RGORIB17kMtL0Dpxjy8.fQr9FV3M4U./SyYBUb00wCxe0GUBsbC	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
28	WALLET	\N	265888067666	\N	\N	$2b$12$60Q2zyDQxIL6ozT2ThiquOL6246KI3NvfMAKUvIMZjmkw/5qIXbOS	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
29	WALLET	\N	260970210154	\N	\N	$2b$12$3cIRAJUjXikjhWY0eVtnl.tJ5zpQsaYN4haE72xOcqcMszhE.B4H2	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
30	WALLET	\N	260978148389	\N	\N	$2b$12$lpnrZS0dn93uzueI8Qg2MOROtxtbfhmdmQ6ztugCMHQS9Fx4XEhtm	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
31	WALLET	\N	260776836233	\N	\N	$2b$12$O5vEXmBLm3VURxdVkvwhM.SxepSncqGvP6omfPB54zdTZ/1xqhyQG	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
32	WALLET	\N	260973674607	\N	\N	$2b$12$DA6rq8YhNFU6d0QBdnNCIeUr4y0wZ3ZW82CmkMDjMTeqOuHWXjGIO	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
33	WALLET	\N	263773077633	\N	\N	$2b$12$ctAKnYQChuJFqpeplP3XyOMyphD1NGFAr3qZrVrrjcM9yGi5arFGy	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
34	WALLET	\N	260961706289	\N	\N	$2b$12$ZIBWMHQhugcYPsmB.uO3Hu9sudDt4PBvW6jdgN3GlI/Q.PAKhyXT.	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
35	WALLET	\N	265999608664	\N	\N	$2b$12$dboLtAoZtbOILDoSkpOq0OkZXB1k9ol/pkcBEN/ht90vWUxenJ09a	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
36	WALLET	\N	265977396223	\N	\N	$2b$12$HuVMyQXL5nk1ImjsWCocIe.LMChbB/wRoQPMH/YH8rNHwGPZ4pu0u	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
37	WALLET	\N	265998765432	\N	\N	$2b$12$FMYxUJIaxdlTnidGV97Jn.JAm2Lg5DodVq4f/44i7O3nSvZlN4tpW	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
38	WALLET	\N	265970210154	\N	\N	$2b$12$FkxWhs8iFqAFvF30Mh5vMuLiVH6poE1N8W9zwTeYEgDHb1BDVYZKa	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
39	WALLET	\N	265999512222	\N	\N	$2b$12$MvSuZ3SA1wiOh4DGwYrhg.tGoe9XglpWaC0OUkXMEyur5ElvvbJGS	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
40	WALLET	\N	0966621003	\N	\N	$2b$12$h1RGORIB17kMtL0Dpxjy8.fQr9FV3M4U./SyYBUb00wCxe0GUBsbC	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
41	WALLET	\N	265888067666	\N	\N	$2b$12$60Q2zyDQxIL6ozT2ThiquOL6246KI3NvfMAKUvIMZjmkw/5qIXbOS	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
42	WALLET	\N	260970210154	\N	\N	$2b$12$3cIRAJUjXikjhWY0eVtnl.tJ5zpQsaYN4haE72xOcqcMszhE.B4H2	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
43	WALLET	\N	260978148389	\N	\N	$2b$12$lpnrZS0dn93uzueI8Qg2MOROtxtbfhmdmQ6ztugCMHQS9Fx4XEhtm	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
44	WALLET	\N	260776836233	\N	\N	$2b$12$O5vEXmBLm3VURxdVkvwhM.SxepSncqGvP6omfPB54zdTZ/1xqhyQG	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
45	WALLET	\N	260973674607	\N	\N	$2b$12$DA6rq8YhNFU6d0QBdnNCIeUr4y0wZ3ZW82CmkMDjMTeqOuHWXjGIO	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
46	WALLET	\N	263773077633	\N	\N	$2b$12$ctAKnYQChuJFqpeplP3XyOMyphD1NGFAr3qZrVrrjcM9yGi5arFGy	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
47	WALLET	\N	260961706289	\N	\N	$2b$12$ZIBWMHQhugcYPsmB.uO3Hu9sudDt4PBvW6jdgN3GlI/Q.PAKhyXT.	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
48	WALLET	\N	265999608664	\N	\N	$2b$12$dboLtAoZtbOILDoSkpOq0OkZXB1k9ol/pkcBEN/ht90vWUxenJ09a	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
49	WALLET	\N	265977396223	\N	\N	$2b$12$HuVMyQXL5nk1ImjsWCocIe.LMChbB/wRoQPMH/YH8rNHwGPZ4pu0u	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
50	WALLET	\N	265998765432	\N	\N	$2b$12$FMYxUJIaxdlTnidGV97Jn.JAm2Lg5DodVq4f/44i7O3nSvZlN4tpW	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
51	WALLET	\N	265970210154	\N	\N	$2b$12$FkxWhs8iFqAFvF30Mh5vMuLiVH6poE1N8W9zwTeYEgDHb1BDVYZKa	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
52	WALLET	\N	265999512222	\N	\N	$2b$12$MvSuZ3SA1wiOh4DGwYrhg.tGoe9XglpWaC0OUkXMEyur5ElvvbJGS	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
53	MOBILE_BANKING	aaron.p.4294	260975266094Archived	\N	\N	$2b$12$0xZoFLkxWOx.5GF8g/ICc.HnJmsxNNNUzEnrQ/IpHaBzTzZE6Gtx6	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
54	MOBILE_BANKING	sambanayo.k.4819	+265995801686	\N	\N	$2b$12$BW0pWoWH4z4KlgX.7LJhdOSs1ilgdMz53x4ZDrYvUt4L9wVPyadvm	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
55	MOBILE_BANKING	helbert.c.5380	265888067666	\N	\N	$2b$12$bod6Z07mFrKR3v0sSeCsZOEjNlXuo2CUTzaqdgSYW9K9CEUK8IsLy	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
56	MOBILE_BANKING	aaron.p.9471	+265998645894	\N	\N	$2b$12$MxoNn441HLdkMFF3aFyz1uXBeAoAA2HwpBkny8DJ5i4SwgyS0nDLK	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
57	MOBILE_BANKING	fishani.c.3745	+265999122751	\N	\N	$2b$12$SZeYm5O8DBuGjW7elJ6rBeTJ4F5EveXWFjGO5WcMp0dSJOkEEcebW	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
59	MOBILE_BANKING	ruth.k.8153	+265888863944	\N	\N	$2b$12$3z8iPIYfiWcSyLJW0Lq51u1xc9MObTl7.2CnSIMveGXspmEPjO3ia	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
60	MOBILE_BANKING	umodzi.m.4451	+265999156886	\N	\N	$2b$12$DHGYIXthSArBT0def4yB5eT3nJD0u7on8mnVhRNDyRgvQFxlGjNxq	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
61	MOBILE_BANKING	trevor.z.2559	+265999917221	\N	\N	$2b$12$Z71uZ2lJP0vvNsoKZF20O.KobVdUYf533nfT..IL32wkXFrfewB3q	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
62	MOBILE_BANKING	trevor.z.3973	+265999917221	\N	\N	$2b$12$hKnDmQhQomqYGlZ.385V0Oh7Cmcjd9qMlNe7rINQhX3dE0i6NvzDa	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
63	MOBILE_BANKING	helbert.c.8435	265888067666	\N	\N	$2b$12$.A.JeltUCYNn2DIg1XEJq.gydO44IhXTQOw4kkc6Oo3n1p3bxUs8.	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
64	MOBILE_BANKING	william.m.3567	+265 999524219	\N	\N	$2b$12$4KfoAfSd1/Vc9fE2u7f5qemPAVhO1kXKpzDtllcvA34jzIed9Xpea	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
65	MOBILE_BANKING	..9428	+265999917221	\N	\N	$2b$12$VTKyyYwOUmKCTrXMNgtdPemxnljcCepy5JuZUeOY/M9GtuULNxZY2	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
66	MOBILE_BANKING	william.m.2133	+265999888920	\N	\N	$2b$12$SUFngzEwLUBpt0Fr1Nrflux91pEjbkwCyUNHrOStxyJMI3r6RAhci	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
67	MOBILE_BANKING	..8884	+265999917221	\N	\N	$2b$12$Jub846ZuJrxjwkyHt2eiZug.PUegAUdJop30aVlWBN5BPbAJS90ga	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
68	MOBILE_BANKING	sheriff.a.7509	+265999512222	\N	\N	$2b$12$sIfkcq7gL1.xoFXtLxORsOsGY70KQzsTHjlaGZxr8gmlG3zK28Cse	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
69	MOBILE_BANKING	sambanayo.k.5609	+265999917221	\N	\N	$2b$12$0C5sFRjl/OkpW9owdhJe6eiZJ1g1T9tIHvFUBwJbOt8A8UGdIif1W	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
70	MOBILE_BANKING	nelson.k.1594	+265888537597	\N	\N	$2b$12$v20fXf92WqNbR2XxHfzX5OCEwnlJcL8EUbjuNQYZTO1EYdLCu4E7q	t	2025-12-11 22:15:21.137	2025-12-11 22:15:21.137
58	MOBILE_BANKING	edwin.z.2493	+265885460023	\N	\N	$2b$12$M1gRIlgxow0DYKX55Ln1TeEP4p2nVVwIFnSc8TJaJ.yaG9tIK11F6	t	2025-12-11 22:15:21.137	2025-12-11 22:16:00.387
\.


--
-- Data for Name: mobile_devices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mobile_devices (id, mobile_user_id, name, model, os, "deviceId", "credentialId", "publicKey", counter, transports, is_active, last_used_at, created_at, updated_at) FROM stdin;
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
-- Name: admin_web_password_reset_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.admin_web_password_reset_tokens_id_seq', 1, false);


--
-- Name: admin_web_users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.admin_web_users_id_seq', 1, false);


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

SELECT pg_catalog.setval('public.fdh_mobile_user_accounts_id_seq', 1, true);


--
-- Name: fdh_mobile_users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.fdh_mobile_users_id_seq', 70, true);


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
-- Name: fdh_mobile_users fdh_mobile_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fdh_mobile_users
    ADD CONSTRAINT fdh_mobile_users_pkey PRIMARY KEY (id);


--
-- Name: mobile_devices mobile_devices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mobile_devices
    ADD CONSTRAINT mobile_devices_pkey PRIMARY KEY (id);


--
-- Name: admin_web_password_reset_tokens_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX admin_web_password_reset_tokens_token_key ON public.admin_web_password_reset_tokens USING btree (token);


--
-- Name: admin_web_users_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX admin_web_users_email_key ON public.admin_web_users USING btree (email);


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
-- Name: fdh_mobile_user_accounts_mobile_user_id_account_number_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX fdh_mobile_user_accounts_mobile_user_id_account_number_key ON public.fdh_mobile_user_accounts USING btree (mobile_user_id, account_number);


--
-- Name: fdh_mobile_user_accounts_mobile_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fdh_mobile_user_accounts_mobile_user_id_idx ON public.fdh_mobile_user_accounts USING btree (mobile_user_id);


--
-- Name: mobile_devices_credentialId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "mobile_devices_credentialId_key" ON public.mobile_devices USING btree ("credentialId");


--
-- Name: mobile_devices_mobile_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX mobile_devices_mobile_user_id_idx ON public.mobile_devices USING btree (mobile_user_id);


--
-- Name: CoreBankingEndpoint CoreBankingEndpoint_connectionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CoreBankingEndpoint"
    ADD CONSTRAINT "CoreBankingEndpoint_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES public."CoreBankingConnection"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: admin_web_password_reset_tokens admin_web_password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_web_password_reset_tokens
    ADD CONSTRAINT admin_web_password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.admin_web_users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: fdh_beneficiaries fdh_beneficiaries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fdh_beneficiaries
    ADD CONSTRAINT fdh_beneficiaries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.fdh_mobile_users(id) ON UPDATE CASCADE ON DELETE CASCADE;


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
-- Name: mobile_devices mobile_devices_mobile_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mobile_devices
    ADD CONSTRAINT mobile_devices_mobile_user_id_fkey FOREIGN KEY (mobile_user_id) REFERENCES public.fdh_mobile_users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict Yct3l71rEoJ8UjEifddFm0YjIP6iMMTNVYtxJddXXNbvVCH6cWyHfIK5B56fULr

