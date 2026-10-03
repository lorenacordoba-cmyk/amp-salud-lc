export interface ConsultationForm {
	fullName: string;
	phone: string;
	email: string;
	consultationType: string;
	coverageType: string;
	location: string;
	caseDescription: string;
	hasWrittenDenial: string;
}

export interface ChatMessage {
	role: 'user' | 'bot';
	text: string;
}

export interface CaseRecord {
	cel: string;
	name: string;
	email: string;
	info: string;
}
