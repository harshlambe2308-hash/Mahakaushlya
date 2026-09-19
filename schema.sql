-- ============================================================================
-- MahaKaushalya - MERGED schema (single source of truth)
-- ============================================================================
-- Reconciles the trainee-portal and government-portal table definitions.
-- Conflict decisions are documented per-table below.
--
--   * users     - login identity + role (trainee | officer | admin | analyst)
--   * trainees  - merged profile (conflict resolved, see notes)
--   * outcomes  - merged (conflict resolved, see notes)
--   * batches, followups - from the government portal definition
-- ============================================================================

begin;

set check_function_bodies = off;

-- ============================================================================
-- Enums
-- ============================================================================
do $$ begin
  create type public.user_role as enum ('trainee', 'officer', 'admin', 'analyst');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.completion_status as enum ('enrolled', 'completed', 'dropped');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.outcome_type as enum (
    'wage_employment', 'self_employment', 'higher_education', 'apprenticeship'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.outcome_status as enum (
    'employed', 'self_employed', 'higher_studies', 'unemployed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.verification_status as enum ('pending', 'verified', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.followup_channel as enum ('sms', 'whatsapp');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.followup_status as enum ('pending', 'responded');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- USERS
-- ============================================================================
-- role column distinguishes trainee vs admin/caseworker/analyst accounts.
-- In Supabase deployments the id comes from auth.users via handle_new_user;
-- no hard FK so this schema also works standalone.
create table if not exists public.users (
  id uuid not null default gen_random_uuid (),
  role public.user_role not null default 'trainee'::user_role,
  email text,
  phone text,
  password_hash text,
  district text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint users_pkey primary key (id),
  constraint users_email_key unique (email),
  constraint users_phone_key unique (phone),
  constraint users_officer_district_required check (
    (role <> all (array['officer'::user_role, 'admin'::user_role, 'analyst'::user_role]))
    or (district is not null)
  ),
  constraint users_password_hash_not_blank check (
    (password_hash is null) or (length(btrim(password_hash)) > 0)
  )
);

create index if not exists users_role_district_idx on public.users using btree (role, district);
create index if not exists users_district_idx on public.users using btree (district);

-- ============================================================================
-- BATCHES (government portal)
-- ============================================================================
create table if not exists public.batches (
  id uuid not null default gen_random_uuid (),
  batch_code text not null,
  scheme_name text not null,
  course_name text not null,
  training_center text not null,
  district text not null,
  start_date date null,
  end_date date null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint batches_pkey primary key (id),
  constraint batches_batch_code_key unique (batch_code),
  constraint batches_date_order check (
    (end_date is null) or (start_date is null) or (end_date >= start_date)
  )
);

create table if not exists public.trainees (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  prn text not null,
  full_name text not null,
  email text null,
  phone text null,
  aadhaar_hash text null,
  district text null,
  training_center text null,
  training_partner text null,
  batch_id uuid null,
  batch_name text null,
  course_name text null,
  trade text null,
  completion_status public.completion_status not null default 'completed'::completion_status,
  address_line text null,
  state text null,
  pincode text null,
  bank_account_last4 character(4) null,
  bank_ifsc text null,
  profile_photo_url text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint trainees_pkey primary key (id),
  constraint trainees_aadhaar_hash_key unique (aadhaar_hash),
  constraint trainees_prn_key unique (prn),
  constraint trainees_user_id_key unique (user_id),
  constraint trainees_batch_id_fkey foreign key (batch_id) references public.batches (id) on delete set null,
  constraint trainees_user_id_fkey foreign key (user_id) references public.users (id) on delete cascade,
  constraint trainees_pincode_format check ((pincode is null) or (pincode ~ '^[0-9]{6}$'::text)),
  constraint trainees_prn_not_blank check ((length(btrim(prn)) > 0)),
  constraint trainees_phone_format check (
    (phone is null) or (phone ~ '^[+]?[0-9 ()-]{7,20}$'::text)
  ),
  constraint trainees_bank_last4_format check (
    (bank_account_last4 is null) or (bank_account_last4 ~ '^[0-9]{4}$'::text)
  ),
  constraint trainees_email_format check (
    (email is null) or (email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'::text)
  ),
  constraint trainees_ifsc_format check (
    (bank_ifsc is null) or (bank_ifsc ~* '^[A-Z]{4}0[A-Z0-9]{6}$'::text)
  ),
  constraint trainees_name_not_blank check ((length(btrim(full_name)) > 0)),
  constraint trainees_aadhaar_hash_format check (
    (aadhaar_hash is null) or (aadhaar_hash ~ '^[0-9a-fA-F]{64}$'::text)
  )
);

create index if not exists trainees_district_idx on public.trainees using btree (district);
create index if not exists trainees_batch_id_idx on public.trainees using btree (batch_id);
create index if not exists trainees_user_id_idx on public.trainees using btree (user_id);


-- ============================================================================
-- OUTCOMES (merged)
-- ============================================================================
-- CONFLICTS RESOLVED:
--  5. government schema used outcome_type enum (wage_employment|...) +
--     employer_business_name/monthly_income; trainee repo used a plain
--     status enum (employed|self_employed|higher_studies|unemployed) +
--     employer_name/monthly_salary.
--     -> kept BOTH: status (API-facing) + outcome_type (statutory
--        category); kept both name variants as separate columns.
--  6. verification_status normalized to lowercase enum
--     ('pending'|'verified'|'rejected'); the government controller's
--     'Pending Verification' string is mapped by the API layer.
-- ============================================================================
create table if not exists public.outcomes (
  id uuid not null default gen_random_uuid (),
  trainee_id uuid not null,
  status public.outcome_status not null,
  outcome_type public.outcome_type null,
  employer_name text null,
  employer_business_name text null,
  monthly_salary numeric(12, 2) null,
  monthly_income numeric(12, 2) null,
  designation text null,
  joining_date date null,
  work_location text null,
  proof_document_url text null,
  verification_status public.verification_status not null default 'pending'::verification_status,
  remarks text null,
  verified_by uuid null,
  verified_at timestamp with time zone null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint outcomes_pkey primary key (id),
  constraint outcomes_trainee_id_fkey foreign key (trainee_id) references public.trainees (id) on delete cascade,
  constraint outcomes_verified_by_fkey foreign key (verified_by) references public.users (id) on delete set null,
  constraint outcomes_income_nonnegative check (
    ((monthly_income is null) or (monthly_income >= (0)::numeric))
    and ((monthly_salary is null) or (monthly_salary >= (0)::numeric))
  ),
  constraint outcomes_proof_url_format check (
    (proof_document_url is null) or (proof_document_url ~ '^https?://'::text)
  ),
  constraint outcomes_verification_consistency check (
    (
      (verification_status = 'verified'::verification_status)
      and (verified_by is not null)
      and (verified_at is not null)
    )
    or (verification_status <> 'verified'::verification_status)
  )
);

create index if not exists outcomes_trainee_id_idx on public.outcomes using btree (trainee_id);
create index if not exists outcomes_verification_status_idx on public.outcomes using btree (verification_status);
create index if not exists outcomes_verified_by_idx on public.outcomes using btree (verified_by);

-- ============================================================================
-- FOLLOWUPS (merged)
-- ============================================================================
-- CONFLICT RESOLVED: government schema had response_text + free-text channel;
-- trainee repo had question + channel enum(sms,whatsapp) + response.
-- Kept BOTH: question/response (portal flow) and response_text (free-form
-- survey mirror).
-- ============================================================================
create table if not exists public.followups (
  id uuid not null default gen_random_uuid (),
  trainee_id uuid not null,
  outcome_id uuid null,
  channel public.followup_channel not null default 'sms'::followup_channel,
  status public.followup_status not null default 'pending'::followup_status,
  question text null,
  response text null,
  response_text text null,
  sent_at timestamp with time zone not null default now(),
  responded_at timestamp with time zone null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint followups_pkey primary key (id),
  constraint followups_trainee_id_fkey foreign key (trainee_id) references public.trainees (id) on delete cascade,
  constraint followups_outcome_id_fkey foreign key (outcome_id) references public.outcomes (id) on delete set null,
  constraint followups_response_consistency check (
    ((status = 'responded'::followup_status) and (responded_at is not null))
    or (status <> 'responded'::followup_status)
  )
);

create index if not exists followups_trainee_id_idx on public.followups using btree (trainee_id);
create index if not exists followups_status_idx on public.followups using btree (status);

commit;
