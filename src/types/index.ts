export type BloodGroup =
  | "A+"
  | "A-"
  | "B+"
  | "B-"
  | "AB+"
  | "AB-"
  | "O+"
  | "O-";

export type UserRole = "guest" | "patient" | "donor" | "admin";

export type UrgencyLevel = "CRITICAL" | "URGENT" | "STANDARD";

export type RequestStatus =
  | "screening" // AI evaluating
  | "suspicious_review" // Flagged for medical review
  | "broadcasting" // Broadcasted to all matching eligible donors
  | "accepted" // Donor has accepted
  | "fulfilled" // Donation completed
  | "rejected"; // Cancelled or rejected

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  roles?: UserRole[];
  patientId?: string;
  donorId?: string;
  adminId?: string;
  state?: string;
  district?: string;
  city?: string;
  bloodGroup?: BloodGroup;
  dateOfBirth?: string;
  lastDonationDate?: string;
  isAvailable?: boolean;
  totalDonations?: number;
  hospitalAffiliation?: string;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AcceptanceHistoryItem {
  donorId?: string;
  donorName?: string;
  donorPhone?: string;
  donorPublicId?: string;
  acceptedAt?: string;
  releasedAt?: string;
  releasedByRole?: string;
  releaseReason?: string;
}

export interface EmergencyRequest {
  id: string;
  _id?: string;
  requestNumber?: string;
  patientId: any;
  patientPublicId?: string;
  patientName: string;
  contactPhone: string;
  bloodGroup: BloodGroup;
  unitsRequired: number;
  urgency: UrgencyLevel;
  hospitalName: string;
  hospitalId?: string;
  hospitalType?: string;
  hospitalVerificationStatus?: "verified" | "pending" | "needs_review";
  state?: string;
  district?: string;
  city?: string;
  additionalNotes?: string;
  documentPath?: string;
  documentOriginalName?: string;
  status: RequestStatus;
  anomalyScore: number;
  fraudIndicators: string[];
  isFlagged: boolean;
  broadcastTime?: string;
  eligibleDonorsNotifiedCount?: number;
  acceptedByDonorId?: any;
  acceptedByDonorName?: string;
  acceptedByDonorPhone?: string;
  acceptedByDonorPublicId?: string;
  declinedByDonorIds?: string[];
  releasedDonorIds?: string[];
  acceptedAt?: string;
  adminReviewedBy?: string;
  adminReviewNote?: string;
  createdAt: string;
  updatedAt?: string;
  requiredDate?: string;
  acceptanceHistory?: AcceptanceHistoryItem[];
  donorReference?: string;
  acceptanceReference?: string;
}

export interface NotificationItem {
  id: string;
  type: "emergency" | "update" | "system";
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  requestId?: string;
  urgency?: UrgencyLevel;
  bloodGroup?: BloodGroup;
}

export interface DonorEligibilityDetails {
  bloodGroup: BloodGroup;
  isAvailable: boolean;
  lastDonationDate: string;
  nextEligibleDate: string;
  daysSinceLastDonation: number;
  isEligible: boolean;
  ineligibilityReason?: string;
}

export interface Hospital {
  id?: string;
  _id?: string;
  hospitalId?: string;
  name: string;
  country?: string;
  state: string;
  district?: string;
  city: string;
  type?: "Government" | "Private" | "Other";
  address?: string;
  contactPhone?: string;
  sourceUrl?: string;
  verificationStatus?: "verified" | "pending" | "needs_review";
  isVerified?: boolean;
  isActive?: boolean;
  adminNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DonorSearchResult {
  id: string;
  donorId: string;
  name?: string;
  email?: string;
  phone?: string;
  bloodGroup: BloodGroup;
  state?: string;
  district?: string;
  city: string;
  isAvailable: boolean;
  isEligible: boolean;
  daysSinceLastDonation?: number | null;
  totalDonations: number;
  hospitalAffiliation?: string | null;
}

export interface DonorReceivedItem {
  _id: string;
  donorReference: string;
  patientRequestNumber?: string;
  patientPublicId?: string;
  sequence: number;
  status: string;
  acceptanceReference?: string;
  receivedAt: string;
  acceptedAt?: string;
  releasedAt?: string;
  releaseReason?: string;
  createdAt?: string;
  requestId?: {
    _id: string;
    requestNumber?: string;
    patientName: string;
    hospitalName: string;
    city: string;
    unitsRequired: number;
    bloodGroup: BloodGroup;
    status: string;
    urgency: string;
    createdAt: string;
  };
}

export interface DonorProfileData {
  donor: User & { isEligible?: boolean; daysSinceLastDonation?: number | null };
  receivedRequests: DonorReceivedItem[];
  acceptedRequests: any[];
  releasedEvents: any[];
  completedDonations: any[];
  stats: {
    totalReceived: number;
    totalAccepted: number;
    totalDeclined: number;
    totalReleased: number;
    totalCompleted: number;
  };
}

export interface PatientManagementItem extends User {
  totalRequests: number;
  openRequests: number;
  acceptedRequests: number;
  fulfilledRequests: number;
  cancelledRequests: number;
  reopenedRequests: number;
}

export interface PatientHistoryData {
  patient: User;
  requests: EmergencyRequest[];
  stats: {
    totalRequests: number;
    openRequests: number;
    acceptedRequests: number;
    fulfilledRequests: number;
    cancelledRequests: number;
    reopenedRequests: number;
  };
}

export interface BloodGroupReportItem {
  bloodGroup: BloodGroup;
  totalRegistered: number;
  availableDonors: number;
  eligibleDonors: number;
  unavailableDonors: number;
  ineligibleDonors: number;
  cityDistribution: { city: string; count: number }[];
  totalRequests: number;
  acceptedRequests: number;
  fulfilledRequests: number;
}

export interface DateReportsData {
  period: { from: string; to: string };
  metrics: {
    requestsCreated: number;
    requestsAccepted: number;
    requestsReleased: number;
    donationsCompleted: number;
    patientRegistrations: number;
    donorRegistrations: number;
  };
  requestsCreated: EmergencyRequest[];
  requestsAccepted: EmergencyRequest[];
  releasedEvents: any[];
  completedDonations: EmergencyRequest[];
}

