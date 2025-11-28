
export type Role = 'guest' | 'applicant' | 'committee' | 'admin';
export type Area = 'Blaenavon' | 'Thornhill & Upper Cwmbran' | 'Trevethin, Penygarn & St. Cadocs' | 'Cross-Area';
export type AppStatus = 'Draft' | 'Submitted-Stage1' | 'Rejected-Stage1' | 'Invited-Stage2' | 'Submitted-Stage2' | 'Finalist' | 'Funded' | 'Rejected';

export interface User {
  uid: string;
  email: string;
  username?: string; // For easier login
  role: Role;
  area?: Area; // For committee members
  displayName?: string;
  password?: string; // Only for mock auth handling
  // Profile fields
  bio?: string;
  phone?: string;
  photoUrl?: string;
}

export interface Application {
  id: string;
  userId: string;
  applicantName: string;
  orgName: string;
  projectTitle: string;
  area: Area;
  summary: string;
  amountRequested: number;
  totalCost: number;
  status: AppStatus;
  priority?: string;
  createdAt: number;
  ref: string; // e.g. PB-26-001
  pdfUrl?: string; // URL to PDF (Stage 1 EOI)
  stage2PdfUrl?: string; // URL to PDF (Stage 2 Full App)
}

export interface ScoreCriterion {
  id: string;
  name: string;
  guidance: string; // Tooltip summary
  weight: number;
  details: string; // Full HTML guidance
}

export interface Score {
  appId: string;
  scorerId: string;
  scorerName: string;
  scores: Record<string, number>; // criterionId -> score (0-3)
  notes: Record<string, string>; // criterionId -> justification
  isFinal: boolean;
  total: number; // calculated
  timestamp: number;
}

export const AREAS: Area[] = [
  'Blaenavon',
  'Thornhill & Upper Cwmbran',
  'Trevethin, Penygarn & St. Cadocs'
];