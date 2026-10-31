import {
  BloodGroup,
  DonorSearchResult,
  EmergencyRequest,
  Hospital,
  User,
  UserRole,
} from "../types";

const viteEnvironment = (
  import.meta as ImportMeta & { env?: Record<string, string | undefined> }
).env;
const API_BASE_URL = (viteEnvironment?.VITE_API_BASE_URL || "/api").replace(
  /\/$/,
  "",
);
const AUTH_TOKEN_KEY = "bg_auth_token";
const ACTIVE_ROLE_KEY = "bg_active_role";

type ApiUser = Omit<User, "id"> & { _id: string };
type ApiRequest = Omit<
  EmergencyRequest,
  "id" | "patientId" | "acceptedByDonorId"
> & {
  _id: string;
  patientId: string | { _id: string; name?: string; phone?: string; patientId?: string };
  acceptedByDonorId?: string | { _id: string; name?: string; phone?: string; bloodGroup?: BloodGroup; donorId?: string } | null;
};

export type PublicStats = {
  registeredDonors: number;
  fulfilledRequests: number;
  activeRequests: number;
  totalRequests: number;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getAuthToken() {
  return sessionStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string) {
  sessionStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken() {
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(ACTIVE_ROLE_KEY);
}

export function getStoredActiveRole(): UserRole | null {
  return (sessionStorage.getItem(ACTIVE_ROLE_KEY) as UserRole) || null;
}

export function setStoredActiveRole(role: UserRole) {
  sessionStorage.setItem(ACTIVE_ROLE_KEY, role);
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const activeRole = getStoredActiveRole();
  if (activeRole) headers.set("x-active-role", activeRole);

  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(
      `Cannot reach BloodGuard API at ${API_BASE_URL}. Start backend server.`,
      0,
    );
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(
      payload.error ||
        payload.message ||
        `Request failed (${response.status}).`,
      response.status,
    );
  }
  return payload as T;
}

function normalizeIndianPhone(phone: string) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.length === 12 && digits.startsWith("91")
    ? digits.slice(2)
    : digits;
}

function mapUser(user: ApiUser): User {
  const roles = Array.isArray(user.roles) && user.roles.length > 0
    ? user.roles
    : [(user.role as UserRole) || "donor"];

  return {
    ...user,
    id: user._id,
    roles,
    role: roles[0],
    phone: normalizeIndianPhone(user.phone),
  };
}

function mapRequest(
  request: ApiRequest & { declinedDonorIds?: unknown[]; releasedDonorIds?: unknown[] },
): EmergencyRequest {
  const patientId =
    typeof request.patientId === "object" && request.patientId !== null
      ? request.patientId._id
      : request.patientId;

  const acceptedByDonorId =
    typeof request.acceptedByDonorId === "object" &&
    request.acceptedByDonorId !== null
      ? request.acceptedByDonorId._id
      : (request.acceptedByDonorId ?? undefined);

  return {
    ...request,
    id: request._id,
    patientId: String(patientId || ""),
    acceptedByDonorId: acceptedByDonorId ? String(acceptedByDonorId) : undefined,
    declinedByDonorIds: (request.declinedDonorIds || []).map((id) =>
      typeof id === "object" && id !== null ? (id as { _id: string })._id : String(id),
    ),
    releasedDonorIds: (request.releasedDonorIds || []).map((id) =>
      typeof id === "object" && id !== null ? (id as { _id: string })._id : String(id),
    ),
  };
}

// ── Auth APIs ────────────────────────────────────────────────
export async function loginWithApi(credentials: {
  email: string;
  password: string;
}): Promise<User> {
  const data = await apiFetch<{ token: string; user: ApiUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
  setAuthToken(data.token);
  return mapUser(data.user);
}

export async function registerWithApi(formData: Record<string, unknown>): Promise<User> {
  const data = await apiFetch<{ token: string; user: ApiUser }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(formData),
  });
  setAuthToken(data.token);
  return mapUser(data.user);
}

export async function restoreApiUser(): Promise<User | null> {
  if (!getAuthToken()) return null;
  try {
    const data = await apiFetch<{ user: ApiUser }>("/auth/me");
    return mapUser(data.user);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 404)) {
      clearAuthToken();
      return null;
    }
    throw error;
  }
}

export async function setApiAvailability(isAvailable: boolean): Promise<boolean> {
  const data = await apiFetch<{ isAvailable: boolean }>("/auth/availability", {
    method: "PATCH",
    body: JSON.stringify({ isAvailable }),
  });
  return data.isAvailable;
}

export async function setApiLastDonationDate(lastDonationDate: string): Promise<string> {
  const data = await apiFetch<{ lastDonationDate: string }>("/auth/last-donation", {
    method: "PATCH",
    body: JSON.stringify({ lastDonationDate }),
  });
  return data.lastDonationDate;
}

// ── Emergency Request APIs ───────────────────────────────────
export async function getApiRequests(): Promise<EmergencyRequest[]> {
  const data = await apiFetch<{ requests: ApiRequest[] }>("/requests?limit=100");
  return (data.requests || []).map(mapRequest);
}

export async function createApiRequest(formData: FormData): Promise<EmergencyRequest> {
  const data = await apiFetch<{ request: ApiRequest }>("/requests", {
    method: "POST",
    body: formData,
  });
  return mapRequest(data.request);
}

export async function respondToApiRequest(
  requestId: string,
  action: "accept" | "decline",
): Promise<EmergencyRequest> {
  const data = await apiFetch<{ request: ApiRequest }>(`/requests/${requestId}/${action}`, {
    method: "POST",
  });
  return mapRequest(data.request);
}

export async function releaseApiRequest(
  requestId: string,
  reason: string,
): Promise<EmergencyRequest> {
  const data = await apiFetch<{ request: ApiRequest }>(`/requests/${requestId}/release`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
  return mapRequest(data.request);
}

export async function fulfillApiRequest(requestId: string): Promise<EmergencyRequest> {
  const data = await apiFetch<{ request: ApiRequest }>(`/requests/${requestId}/fulfill`, {
    method: "POST",
  });
  return mapRequest(data.request);
}

export async function cancelApiRequest(requestId: string): Promise<EmergencyRequest> {
  const data = await apiFetch<{ request: ApiRequest }>(`/requests/${requestId}/cancel`, {
    method: "POST",
  });
  return mapRequest(data.request);
}

// ── Location & Hospital APIs ────────────────────────────────
export interface LocationHierarchyState {
  name: string;
  districts: {
    name: string;
    cities: string[];
  }[];
}

export async function getLocationHierarchy(): Promise<{
  country: string;
  states: LocationHierarchyState[];
}> {
  return apiFetch<{ country: string; states: LocationHierarchyState[] }>(
    "/hospitals/hierarchy",
  );
}

export async function getStates(): Promise<string[]> {
  const data = await apiFetch<{ states: string[] }>("/hospitals/states");
  return data.states || [];
}

export async function getDistricts(state?: string): Promise<string[]> {
  if (!state) return [];
  const data = await apiFetch<{ districts: string[] }>(
    `/hospitals/districts?state=${encodeURIComponent(state)}`,
  );
  return data.districts || [];
}

export async function getCities(state?: string, district?: string): Promise<string[]> {
  if (!state) return [];
  const query = new URLSearchParams();
  query.set("state", state);
  if (district) query.set("district", district);
  const data = await apiFetch<{ cities: string[] }>(`/hospitals/cities?${query.toString()}`);
  return data.cities || [];
}

export async function getApiHospitals(
  filterOrCity?:
    | string
    | {
        state?: string;
        district?: string;
        city?: string;
        search?: string;
        type?: string;
        status?: string;
        all?: boolean;
      },
): Promise<Hospital[]> {
  const query = new URLSearchParams();
  if (typeof filterOrCity === "string") {
    query.set("city", filterOrCity);
  } else if (filterOrCity) {
    if (filterOrCity.state) query.set("state", filterOrCity.state);
    if (filterOrCity.district) query.set("district", filterOrCity.district);
    if (filterOrCity.city) query.set("city", filterOrCity.city);
    if (filterOrCity.search) query.set("search", filterOrCity.search);
    if (filterOrCity.type) query.set("type", filterOrCity.type);
    if (filterOrCity.status) query.set("status", filterOrCity.status);
    if (filterOrCity.all) query.set("all", "true");
  }

  const url = query.toString() ? `/hospitals?${query.toString()}` : "/hospitals";
  const data = await apiFetch<{ hospitals: Hospital[] }>(url);
  return data.hospitals || [];
}

export async function createCustomHospital(payload: {
  name: string;
  state?: string;
  district?: string;
  city?: string;
  address?: string;
  contactPhone?: string;
}): Promise<{ message: string; hospital: Hospital }> {
  return apiFetch<{ message: string; hospital: Hospital }>("/hospitals/custom", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getHospitalSummary(): Promise<{
  total: number;
  verified: number;
  pending: number;
  needsReview: number;
  inactive: number;
  stateBreakdown: { _id: string; total: number; verified: number; pending: number }[];
}> {
  return apiFetch("/hospitals/summary");
}

export async function verifyHospital(
  id: string,
  verificationStatus: "verified" | "pending" | "needs_review",
  isActive = true,
  adminNotes?: string,
): Promise<{ message: string; hospital: Hospital }> {
  return apiFetch(`/hospitals/${id}/verify`, {
    method: "PATCH",
    body: JSON.stringify({ verificationStatus, isActive, adminNotes }),
  });
}

export async function updateHospital(
  id: string,
  payload: Partial<Hospital>,
): Promise<{ message: string; hospital: Hospital }> {
  return apiFetch(`/hospitals/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function createAdminHospital(
  payload: Partial<Hospital>,
): Promise<{ message: string; hospital: Hospital }> {
  return apiFetch("/hospitals", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getLocationStats(params?: {
  state?: string;
  district?: string;
  city?: string;
  bloodGroup?: string;
}): Promise<{
  metrics: {
    totalDonors: number;
    availableDonors: number;
    eligibleDonors: number;
    totalRequests: number;
    fulfilledRequests: number;
    hospitals: {
      total: number;
      verified: number;
      pending: number;
      needsReview: number;
    };
  };
  cityDonorStats: { state: string; city: string; count: number; available: number }[];
  cityRequestStats: { state: string; city: string; count: number; fulfilled: number }[];
}> {
  const query = new URLSearchParams();
  if (params?.state) query.set("state", params.state);
  if (params?.district) query.set("district", params.district);
  if (params?.city) query.set("city", params.city);
  if (params?.bloodGroup) query.set("bloodGroup", params.bloodGroup);

  const url = query.toString() ? `/admin/location-stats?${query.toString()}` : "/admin/location-stats";
  return apiFetch(url);
}

// ── Donor Search API ─────────────────────────────────────────
export async function searchApiDonors(params: {
  bloodGroup?: string;
  state?: string;
  district?: string;
  city?: string;
  availability?: boolean;
  eligibleOnly?: boolean;
  compatible?: boolean;
}): Promise<{ donors: DonorSearchResult[]; count: number }> {
  const query = new URLSearchParams();
  if (params.bloodGroup) query.set("bloodGroup", params.bloodGroup);
  if (params.state) query.set("state", params.state);
  if (params.district) query.set("district", params.district);
  if (params.city) query.set("city", params.city);
  if (params.availability !== undefined) query.set("availability", String(params.availability));
  if (params.eligibleOnly !== undefined) query.set("eligibleOnly", String(params.eligibleOnly));
  if (params.compatible !== undefined) query.set("compatible", String(params.compatible));

  return apiFetch<{ donors: DonorSearchResult[]; count: number }>(`/donors/search?${query.toString()}`);
}

// ── Admin APIs ───────────────────────────────────────────────
export async function reviewApiRequest(
  requestId: string,
  decision: "approve" | "reject",
  note?: string,
): Promise<EmergencyRequest | { message: string }> {
  const data = await apiFetch<{ request?: ApiRequest; message: string }>(
    `/admin/requests/${requestId}/${decision}`,
    {
      method: "POST",
      body: JSON.stringify({ note: note || "Medical review completed" }),
    },
  );
  return data.request ? mapRequest(data.request) : data;
}

export async function getApiUsers(): Promise<User[]> {
  const data = await apiFetch<{ users: ApiUser[] }>("/admin/users?limit=100");
  return (data.users || []).map(mapUser);
}

export async function getApiAdminReports(params: {
  fromDate?: string;
  toDate?: string;
  city?: string;
  bloodGroup?: string;
  status?: string;
}): Promise<{
  metrics: Record<string, number>;
  cityDonors: { _id: string; count: number }[];
  bloodGroupStats: { _id: string; count: number }[];
  requests: EmergencyRequest[];
}> {
  const query = new URLSearchParams();
  if (params.fromDate) query.set("fromDate", params.fromDate);
  if (params.toDate) query.set("toDate", params.toDate);
  if (params.city) query.set("city", params.city);
  if (params.bloodGroup) query.set("bloodGroup", params.bloodGroup);
  if (params.status) query.set("status", params.status);

  const data = await apiFetch<any>(`/admin/reports?${query.toString()}`);
  return {
    ...data,
    requests: (data.requests || []).map(mapRequest),
  };
}

export function getDocumentUrl(requestId: string): string {
  const token = getAuthToken();
  return `${API_BASE_URL}/requests/${requestId}/document?token=${token || ""}`;
}

export async function getApiPublicStats(): Promise<PublicStats> {
  return apiFetch<PublicStats>("/public/stats");
}

export interface SmsLogItem {
  _id: string;
  recipientPhone: string;
  phone?: string;
  recipientType: "donor" | "patient" | "admin" | "unknown";
  provider: string;
  messageType: string;
  status: "sent" | "failed" | "queued";
  messageSnippet: string;
  message?: string;
  errorMessage?: string;
  providerResponse?: {
    return?: boolean;
    request_id?: string;
    message?: string[];
    data?: any;
  };
  createdAt: string;
}

export async function getApiSmsStatus() {
  return apiFetch<{
    provider: string;
    credentialsConfigured: boolean;
    configured: boolean;
    integrationReady: boolean;
    adminPhone: string;
    message: string;
  }>("/admin/sms/status");
}

export async function getApiSmsLogs(limit = 100) {
  return apiFetch<{ logs: SmsLogItem[]; total: number }>(
    `/admin/sms/logs?limit=${limit}`,
  );
}

export async function sendApiTestSms(phone: string, message?: string) {
  return apiFetch<{
    provider: string;
    phone: string;
    result: {
      success: boolean;
      requestId?: string;
      error?: string;
    };
    note?: string;
  }>("/admin/sms/test", {
    method: "POST",
    body: JSON.stringify({ phone, message }),
  });
}

// ── Admin API Enhancements ─────────────────────────────────────
export async function getApiAdminDonors(params: {
  bloodGroup?: string;
  donorId?: string;
  search?: string;
  city?: string;
  availability?: string;
  eligibleOnly?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  });
  return apiFetch<{
    donors: any[];
    total: number;
    page: number;
    pages: number;
  }>(`/admin/donors?${q.toString()}`);
}

export async function getApiAdminDonorProfile(id: string) {
  return apiFetch<any>(`/admin/donors/${id}/profile`);
}

export async function getApiAdminPatients(params: {
  patientId?: string;
  search?: string;
  city?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  });
  return apiFetch<{
    patients: any[];
    total: number;
    page: number;
    pages: number;
  }>(`/admin/patients?${q.toString()}`);
}

export async function getApiAdminPatientHistory(id: string) {
  return apiFetch<any>(`/admin/patients/${id}/history`);
}

export async function getApiAdminBloodGroups() {
  return apiFetch<{ bloodGroups: any[] }>("/admin/blood-groups");
}

export async function getApiAdminDateReports(params: {
  fromDate?: string;
  toDate?: string;
  city?: string;
  bloodGroup?: string;
}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  });
  return apiFetch<any>(`/admin/date-reports?${q.toString()}`);
}

export async function getApiAdminAnalytics() {
  return apiFetch<any>("/admin/analytics");
}


