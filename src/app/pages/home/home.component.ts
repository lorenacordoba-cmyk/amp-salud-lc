import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface ConsultationForm {
	fullName: string;
	phone: string;
	email: string;
	consultationType: string;
	coverageType: string;
	location: string;
	caseDescription: string;
	hasWrittenDenial: string;
}

@Component({
	selector: 'app-home',
	standalone: true,
	imports: [CommonModule, FormsModule],
	templateUrl: './home.component.html',
	styleUrls: ['./home.component.scss']
})
export class HomeComponent {
	private readonly counterStorageKey = 'consultation_case_counter';

	caseNumber = 1;
	isSubmitting = false;
	submitMessage = '';
	submitError = '';

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

	constructor() {
		this.caseNumber = this.getStoredCaseNumber();
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
			const response = await fetch('https://formsubmit.co/ajax/lorenacordoba@gmail.com', {
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
