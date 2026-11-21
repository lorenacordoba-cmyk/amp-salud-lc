export interface ConsultationForm {
  fullName: string;
  phone: string;
  email: string;
  consultationType: string;
  location: string;
  consultationReason: string;
  caseDescription: string;
}

export type ChatRole = 'user' | 'bot';

export interface ChatMessage {
  role: ChatRole;
  text: string;
  createdAt?: string;
}

export interface CaseRecord {
  cel: string;
  name: string;
  email: string;
  info: string;
}

export type LegalArea =
  | 'HEALTH'
  | 'PREVISIONAL'
  | 'CONSUMER'
  | 'DAMAGES'
  | 'TAX'
  | 'MULTI_AREA'
  | 'OTHER'
  | 'UNKNOWN';

export type TriageUrgency = 'CRITICAL' | 'HIGH' | 'NORMAL';

export interface AssistantTriage {
  legalArea: LegalArea;
  urgency: TriageUrgency;
}

export type StudyNotificationResult = 'pending' | 'reviewing' | 'sending' | 'sent' | 'partial' | 'failed';

export interface AssistantSubmitResponse {
  reply: string;
  notification: StudyNotificationResult;
  closed?: boolean;
}

export interface AssistantChatResponse {
  reply: string;
  triage: AssistantTriage;
  notification: StudyNotificationResult;
  closed?: boolean;
}

export interface AssistantSessionResponse {
  exists: boolean;
  transcript: ChatMessage[];
  triage?: AssistantTriage;
  notification: StudyNotificationResult;
  closed?: boolean;
}

export interface AssistantSessionCredentials {
  sessionId: string;
  sessionToken: string;
  expiresAt: string;
}
