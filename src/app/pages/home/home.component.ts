import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { type CaseRecord, type ChatMessage, type ConsultationForm } from '../../interfaces';

@Component({
	selector: 'app-home',
	standalone: true,
	imports: [CommonModule, FormsModule],
	templateUrl: './home.component.html',
	styleUrls: ['./home.component.scss']
})
export class HomeComponent {
	@ViewChild('assistantBody') private readonly assistantBody?: ElementRef<HTMLDivElement>;
	private readonly counterStorageKey = 'consultation_case_counter';
	private readonly aiApiUrl = `${environment.apiUrl}/api/ai/chat`;

	caseNumber = 1;
	isSubmitting = false;
	submitMessage = '';
	submitError = '';
	assistantOpen = false;
	assistantLoading = false;
	assistantInput = '';
	completedCase?: CaseRecord;
	assistantMessages: ChatMessage[] = [
		{
			role: 'bot',
			text: 'Hola, soy Sol la asistente virtual de Córdoba & Asociados. ¿Con quien tengo el gusto de hablar? ¿En que situacion te puedo ayudar?'
		}
	];

	form: ConsultationForm = {
		fullName: '',
		phone: '',
		email: '',
		consultationType: '',
		coverageType: '',
		location: '',
		caseDescription: '',
		hasWrittenDenial: 'No'
	};

	constructor(private readonly cdr: ChangeDetectorRef) {
		this.caseNumber = this.getStoredCaseNumber();
	}

	toggleAssistant(): void {
		this.assistantOpen = !this.assistantOpen;
		this.cdr.detectChanges();
		queueMicrotask(() => this.scrollAssistantToBottom());
	}

	private scrollAssistantToBottom(): void {
		const body = this.assistantBody?.nativeElement;
		if (!body) {
			return;
		}

		body.scrollTop = body.scrollHeight;
	}

	async sendAssistantMessage(): Promise<void> {
		const message = this.assistantInput.trim();
		if (!message || this.assistantLoading) {
			return;
		}

		this.assistantMessages.push({ role: 'user', text: message });
		this.assistantInput = '';
		this.assistantLoading = true;
		this.cdr.detectChanges();
		queueMicrotask(() => this.scrollAssistantToBottom());

		try {
			const history = this.assistantMessages.slice(0, -1).map((entry) => ({
				role: entry.role === 'user' ? 'user' : 'model',
				parts: [{ text: entry.text }]
			}));

			const response = await fetch(this.aiApiUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json'
				},
				body: JSON.stringify({
					message,
					history
				})
			});

			if (!response.ok) {
				throw new Error('No fue posible contactar al asistente.');
			}

			const data: { reply?: string; caseData?: CaseRecord } = await response.json();
			this.completedCase = data.caseData;
			this.assistantMessages.push({
				role: 'bot',
				text: data.reply || 'Gracias. Contame un poco más para ayudarte a ordenar tu caso.'
			});
		} catch (_error) {
			this.assistantMessages.push({
				role: 'bot',
				text: 'Hay un problema temporal con el asistente IA. Podés escribirnos directamente por WhatsApp o completar el formulario de consulta.'
			});
		} finally {
			this.assistantLoading = false;
			this.cdr.detectChanges();
			queueMicrotask(() => this.scrollAssistantToBottom());
		}
	}

	async submitForm(): Promise<void> {
		this.submitMessage = '';
		this.submitError = '';

		if (!this.form.fullName || !this.form.phone || !this.form.email || !this.form.location || !this.form.caseDescription) {
			this.submitError = 'Completá los campos obligatorios para enviar tu consulta.';
			return;
		}

		this.isSubmitting = true;

		const subject = `caso ${this.caseNumber}`;
		const body = [
			`Nombre completo: ${this.form.fullName}`,
			`Telefono / WhatsApp: ${this.form.phone}`,
			`Email: ${this.form.email}`,
			`Tipo de consulta: ${this.form.consultationType || 'No especificado'}`,
			`Tipo de cobertura: ${this.form.coverageType || 'No especificado'}`,
			`Lugar de residencia: ${this.form.location}`,
			`Tiene negativa por escrito: ${this.form.hasWrittenDenial}`,
			'',
			'Descripcion breve del caso:',
			this.form.caseDescription
		].join('\n');

		try {
			const response = await fetch('https://formsubmit.co/ajax/91b516e76f1ef887eca6f9b919b7cfb6', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json'
				},
				body: JSON.stringify({
					_subject: subject,
					template: 'table',
					captcha: 'false',
					message: body
				})
			});

			if (!response.ok) {
				throw new Error('No se pudo enviar la consulta.');
			}

			this.submitMessage = `Consulta enviada correctamente con asunto "${subject}".`;
			this.incrementCaseNumber();
			this.resetForm();
		} catch (_error) {
			this.submitError = 'No pudimos enviar la consulta en este momento. Intentá nuevamente en unos minutos.';
		} finally {
			this.isSubmitting = false;
		}
	}

	private getStoredCaseNumber(): number {
		const raw = localStorage.getItem(this.counterStorageKey);
		const parsed = Number(raw);

		if (Number.isInteger(parsed) && parsed > 0) {
			return parsed;
		}

		localStorage.setItem(this.counterStorageKey, '1');
		return 1;
	}

	private incrementCaseNumber(): void {
		this.caseNumber += 1;
		localStorage.setItem(this.counterStorageKey, String(this.caseNumber));
	}

	private resetForm(): void {
		this.form = {
			fullName: '',
			phone: '',
			email: '',
			consultationType: '',
			coverageType: '',
			location: '',
			caseDescription: '',
			hasWrittenDenial: 'No'
		};
	}
}
