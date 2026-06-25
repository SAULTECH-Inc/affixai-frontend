// Snake_case API types that mirror the FastAPI Pydantic models.

export interface User {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  phone_number?: string | null;
  profile_image?: string | null;
  auth_provider: 'local' | 'google' | 'microsoft' | 'linkedin';
  role: 'user' | 'enterprise_user' | 'enterprise_admin' | 'super_admin';
  status: 'active' | 'inactive' | 'suspended' | 'pending_verification';
  email_verified: boolean;
  enterprise_id?: string | null;
  last_login_at?: string | null;
  preferences?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  verification_token?: string | null;
}

export type FieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'date'
  | 'number'
  | 'select'
  | 'textarea';

export type VaultSegment =
  | 'personal'
  | 'identity'
  | 'address'
  | 'contact'
  | 'employment'
  | 'education'
  | 'financial'
  | 'next_of_kin';

export interface FieldRegistryEntry {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string | null;
  options?: string[] | null;
  description?: string | null;
}

export interface SegmentRegistryEntry {
  segment: VaultSegment;
  label: string;
  fields: FieldRegistryEntry[];
  // Multi-entry sections (Education, Employment) render as a list of cards
  // — each card is one record. Single-entry sections render as one form.
  multi_entry?: boolean;
}

export interface VaultEntryOut {
  id: string;
  section: VaultSegment;
  fields: Record<string, string>;
  is_current: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FieldValue {
  value: string;
  source: 'user_input' | 'document_extraction' | 'third_party' | 'api_import';
  source_document_id?: string | null;
  confidence_score?: number | null;
  is_verified: boolean;
  updated_at: string;
}

export interface SegmentData {
  segment: VaultSegment;
  label: string;
  fields: Record<string, FieldValue>;
}

export interface ExtractedFieldOut {
  value: string;
  confidence: number;
  source_label: string;
}

export interface UnmatchedFieldOut {
  label: string;
  value: string;
  confidence: number;
}

export interface ExtractPreview {
  document_id: string;
  segments: Record<string, Record<string, ExtractedFieldOut>>;
  unmatched: UnmatchedFieldOut[];
  raw_text_preview: string;
  error?: string | null;
}

export interface StampedFieldOut {
  label: string;
  field_name: string;
  segment: string;
  value: string;
  page: number;
  x: number;
  y: number;
  match_confidence: number;
}

export interface AutoSignReport {
  fields_filled: StampedFieldOut[];
  labels_unmatched: string[];
  signatures_placed: number;
  initials_placed: number;
  photos_placed: number;
  pages: number;
  error?: string | null;
}

export interface AutoSignOut {
  document_id: string;
  download_url: string;
  report: AutoSignReport;
}

// Editor — manual placement
export type PlacementKind =
  | 'text'
  | 'number'
  | 'date'
  | 'time'
  | 'initials'
  | 'signature'
  | 'photo';

export interface Placement {
  kind: PlacementKind;
  page: number;
  x: number;
  y: number;
  value?: string | null;
  field_name?: string | null;
  fontsize?: number;
  width?: number;
  height?: number;
  // Font customization (text-kind placements only)
  font_family?: string;       // "helv" | "tiro" | "cour"
  bold?: boolean;
  italic?: boolean;
  color?: string;             // hex like "#000000"
}

export interface RestampOut {
  document_id: string;
  download_url: string;
  placed: number;
  failed: number;
  errors: string[];
}

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'expired'
  | 'incomplete';

export type SubscriptionPlan = 'trial' | 'pro' | 'enterprise';

export interface SubscriptionState {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  provider?: string | null;
  trial_ends_at?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end: boolean;
  has_paid_features: boolean;
  free_tier_enabled: boolean;
  active_provider: string;
  currency: string;
  days_left?: number | null;
}

export interface PlanOut {
  plan: SubscriptionPlan;
  name: string;
  description: string;
  price_id?: string | null;
  amount?: string | null; // Decimal from backend serializes as string
  currency?: string | null;
  interval?: string;
  features?: string[];
  free_trial_days?: number | null;
}

export type InvoiceStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface InvoiceOut {
  id: string;
  provider: string;
  provider_invoice_id: string;
  amount: string; // Decimal as string
  currency: string;
  status: InvoiceStatus;
  description?: string | null;
  hosted_url?: string | null;
  pdf_url?: string | null;
  paid_at?: string | null;
  created_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  // ISO 3166-1 alpha-2 country code. Drives which payment gateway the
  // user gets routed to + which regional price they see. The register
  // form auto-detects from the browser locale; the user can override.
  country_code?: string;
}
