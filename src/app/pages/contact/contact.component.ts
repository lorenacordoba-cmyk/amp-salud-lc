import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { type ConsultationForm } from '../../interfaces';
import { AssistantComponent } from '../../shared/assistant/assistant.component';
import { TurnstileService } from '../../shared/assistant/turnstile.service';
import { SiteFooterComponent } from '../../shared/site-footer/site-footer.component';
import { RevealDirective } from '../../shared/motion/reveal.directive';
import { PointerGlowDirective } from '../../shared/motion/pointer-glow.directive';
import { ContactApiService } from './contact-api.service';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AssistantComponent, SiteFooterComponent, RevealDirective, PointerGlowDirective],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss']
})
export class ContactComponent implements AfterViewInit, OnDestroy {
  @ViewChild('contactTurnstile') private readonly contactTurnstile?: ElementRef<HTMLDivElement>;

  private readonly api = inject(ContactApiService);
  private readonly turnstile = inject(TurnstileService);
  private turnstileWidgetId?: string;
  private turnstileToken = '';

  isSubmitting = false;
  submitMessage = '';
  submitError = '';
  securityReady = !environment.production && !environment.turnstileSiteKey;

  form: ConsultationForm = this.emptyForm();

  ngAfterViewInit(): void {
    void this.prepareTurnstile();
  }

  ngOnDestroy(): void {
    this.turnstile.remove(this.turnstileWidgetId);
  }

  async submitForm(): Promise<void> {
    this.submitMessage = '';
    this.submitError = '';

    if (!this.form.fullName || !this.form.phone || !this.form.email || !this.form.location || !this.form.consultationType || !this.form.consultationReason.trim() || !this.form.caseDescription) {
      this.submitError = 'Completá los campos obligatorios para enviar tu consulta.';
      return;
    }
    if (this.form.consultationReason.trim().length > 21) {
      this.submitError = 'El motivo de consulta debe tener menos de 22 caracteres.';
      return;
    }
    if (environment.production && !this.securityReady) {
      this.submitError = 'Completá la verificación de seguridad antes de enviar.';
      return;
    }

    this.isSubmitting = true;
    try {
      const result = await this.api.submit(this.form, this.turnstileToken);
      this.submitMessage = result.clientEmailDelivered === false
        ? `Consulta recibida correctamente. Referencia ${result.reference}. El estudio recibió tus datos, aunque no pudimos confirmar el email automático.`
        : `Consulta recibida correctamente. Referencia ${result.reference}. También te enviamos un email de confirmación.`;
      this.form = this.emptyForm();
      this.turnstileToken = '';
      if (this.turnstileWidgetId) {
        this.securityReady = false;
        this.turnstile.reset(this.turnstileWidgetId);
      }
    } catch (error) {
      const http = error as HttpErrorResponse;
      this.submitError = http.error?.error || 'No pudimos enviar la consulta en este momento. Intentá nuevamente en unos minutos.';
      if (http.status === 403 && this.turnstileWidgetId) {
        this.turnstileToken = '';
        this.securityReady = false;
        this.turnstile.reset(this.turnstileWidgetId);
      }
    } finally {
      this.isSubmitting = false;
    }
  }

  private async prepareTurnstile(): Promise<void> {
    const siteKey = environment.turnstileSiteKey?.trim();
    const hasRealKey = Boolean(siteKey && !siteKey.startsWith('REEMPLAZAR_'));
    if (!hasRealKey) {
      if (environment.production) this.submitError = 'Falta configurar la verificación de seguridad del formulario.';
      return;
    }

    const container = this.contactTurnstile?.nativeElement;
    if (!container) return;

    try {
      this.turnstileWidgetId = await this.turnstile.render(container, siteKey, {
        onSuccess: token => { this.turnstileToken = token; this.securityReady = true; },
        onExpired: () => { this.turnstileToken = ''; this.securityReady = false; },
        onError: () => { this.turnstileToken = ''; this.securityReady = false; this.submitError = 'No pudimos completar la verificación de seguridad.'; }
      }, 'legal_contact_form');
    } catch {
      this.submitError = 'No se pudo cargar la verificación de seguridad.';
    }
  }

  private emptyForm(): ConsultationForm {
    return {
      fullName: '',
      phone: '',
      email: '',
      consultationType: '',
      location: '',
      consultationReason: '',
      caseDescription: ''
    };
  }
}
