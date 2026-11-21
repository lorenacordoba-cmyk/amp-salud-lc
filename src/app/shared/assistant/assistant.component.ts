import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AfterViewChecked,
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import {
  AssistantTriage,
  ChatMessage,
  LegalArea,
  StudyNotificationResult,
  TriageUrgency
} from '../../interfaces';
import { AssistantApiService } from './assistant-api.service';
import { TurnstileService } from './turnstile.service';

const SESSION_ID_KEY = 'lc-legal-assistant-session-id-v3';
const SESSION_TOKEN_KEY = 'lc-legal-assistant-session-token-v3';
const GREETING =
  '¡Hola! Soy el asistente virtual del Estudio Jurídico Lorena Córdoba. ¿En qué puedo ayudarte? Contame con tus palabras qué pasó; no necesitás saber a qué rama del Derecho corresponde tu consulta.';

@Component({
  selector: 'app-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './assistant.component.html',
  styleUrls: ['./assistant.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssistantComponent implements OnInit, AfterViewInit, AfterViewChecked, OnDestroy {
  @ViewChild('assistantToggle') private readonly assistantToggle?: ElementRef<HTMLButtonElement>;
  @ViewChild('assistantPanel') private readonly assistantPanel?: ElementRef<HTMLElement>;
  @ViewChild('assistantBody') private readonly assistantBody?: ElementRef<HTMLDivElement>;
  @ViewChild('assistantInputEl') private readonly assistantInputEl?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('turnstileContainer') private readonly turnstileContainer?: ElementRef<HTMLDivElement>;

  private readonly api = inject(AssistantApiService);
  private readonly turnstile = inject(TurnstileService);
  private readonly cdr = inject(ChangeDetectorRef);
  private turnstileWidgetId?: string;
  private sessionInitialized = false;
  private notificationPollTimer: ReturnType<typeof setTimeout> | null = null;
  private lastRenderedChatState = '';
  private lastRenderedMessages: ChatMessage[] | null = null;
  private chatScrollFrame: number | null = null;
  private readonly onVisualViewportChange = (): void => this.updateMobileViewport();
  private readonly onWindowResize = (): void => {
    this.isDesktopViewport = window.innerWidth > 700;
    if (this.isDesktopViewport) this.constrainDesktopPosition();
    else this.dragAnchor = null;
    this.updateMobileViewport();
    this.cdr.markForCheck();
  };
  // Solo desplazamiento visual del panel en escritorio; la sesión de consulta se mantiene intacta.
  isDesktopViewport = typeof window !== 'undefined' && window.innerWidth > 700;
  panelPosition: { left: number; top: number } | null = null;
  isDragging = false;
  private dragAnchor: { pointerId: number; x: number; y: number; left: number; top: number } | null = null;

  assistantOpen = false;
  assistantLoading = false;
  restoringSession = false;
  securityLoading = false;
  assistantInput = '';
  sessionId = '';
  sessionToken = '';
  triage?: AssistantTriage;
  studyNotification: StudyNotificationResult = 'pending';
  consentToStudy = false;
  interviewClosed = false;
  errorMessage = '';
  needsVerification = false;

  assistantMessages: ChatMessage[] = [{ role: 'bot', text: GREETING }];

  async ngOnInit(): Promise<void> {
    this.sessionId = sessionStorage.getItem(SESSION_ID_KEY)?.trim() || '';
    this.sessionToken = sessionStorage.getItem(SESSION_TOKEN_KEY)?.trim() || '';

    // La sesión se crea/restaura de forma lazy al abrir el chat.
    // Así una simple visita a la web no crea Conversations ni filas en la base.
  }

  ngAfterViewInit(): void {
    // En móviles, el teclado virtual puede reducir el viewport visual sin cambiar
    // el viewport del layout. Mantener el pie del chat por encima del teclado.
    if (typeof window !== 'undefined') {
      this.isDesktopViewport = window.innerWidth > 700;
      window.addEventListener('resize', this.onWindowResize);
      window.visualViewport?.addEventListener('resize', this.onVisualViewportChange);
      window.visualViewport?.addEventListener('scroll', this.onVisualViewportChange);
      this.updateMobileViewport();
    }
  }

  /** El contenido del chat debe desplazarse DESPUÉS de que Angular dibuje
   * la respuesta o el indicador de procesamiento. En OnPush, una microtarea
   * tras markForCheck puede ejecutarse antes de que exista esa burbuja. */
  ngAfterViewChecked(): void {
    if (!this.assistantOpen || !this.assistantBody?.nativeElement) return;
    const renderedState = [
      this.assistantLoading,
      this.restoringSession,
      this.securityLoading,
      this.needsVerification,
      this.studyNotification,
      this.interviewClosed,
      this.errorMessage
    ].join('|');
    if (this.lastRenderedChatState === renderedState && this.lastRenderedMessages === this.assistantMessages) return;
    this.lastRenderedChatState = renderedState;
    this.lastRenderedMessages = this.assistantMessages;
    // Ajustar ahora y en el siguiente frame, tras el cálculo final del layout.
    this.scrollAssistantToBottom();
    this.scheduleChatScroll();
  }

  private scheduleChatScroll(): void {
    if (typeof window === 'undefined' || !this.assistantOpen) return;
    if (this.chatScrollFrame !== null) window.cancelAnimationFrame(this.chatScrollFrame);
    this.chatScrollFrame = window.requestAnimationFrame(() => {
      this.chatScrollFrame = null;
      if (this.assistantOpen) this.scrollAssistantToBottom();
    });
  }

  ngOnDestroy(): void {
    this.stopNotificationPolling();
    if (this.chatScrollFrame !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this.chatScrollFrame);
      this.chatScrollFrame = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.onWindowResize);
      window.visualViewport?.removeEventListener('resize', this.onVisualViewportChange);
      window.visualViewport?.removeEventListener('scroll', this.onVisualViewportChange);
    }
    this.turnstile.remove(this.turnstileWidgetId);
  }

  get hasStarted(): boolean {
    return this.assistantMessages.some(message => message.role === 'user');
  }

  get canChat(): boolean {
    return Boolean(this.sessionId && this.sessionToken && !this.needsVerification && !this.securityLoading && !this.interviewClosed);
  }

  get areaLabel(): string {
    const labels: Record<LegalArea, string> = {
      HEALTH: 'Derecho a la Salud',
      PREVISIONAL: 'Previsional',
      CONSUMER: 'Defensa del Consumidor',
      DAMAGES: 'Daños y Perjuicios',
      TAX: 'Derecho Tributario',
      MULTI_AREA: 'Consulta interdisciplinaria',
      OTHER: 'Otra consulta jurídica',
      UNKNOWN: 'Evaluando consulta'
    };
    return this.triage ? labels[this.triage.legalArea] : 'Evaluación inicial';
  }

  get urgencyLabel(): string {
    if (!this.triage || this.triage.urgency === 'NORMAL') return '';
    return this.triage.urgency === 'CRITICAL' ? 'Revisión urgente' : 'Prioridad alta';
  }

  get urgencyClass(): string {
    const urgency: TriageUrgency = this.triage?.urgency ?? 'NORMAL';
    return `urgency-${urgency.toLowerCase()}`;
  }

  /** Mover la ventana desde su cabecera, sin interferir con los controles del chat. */
  onPanelPointerDown(event: PointerEvent): void {
    if (!this.isDesktopViewport || !this.assistantOpen || event.button !== 0) return;
    if (event.target instanceof Element && event.target.closest('button, a, input')) return;
    const panel = this.assistantPanel?.nativeElement;
    const header = event.currentTarget as HTMLElement | null;
    if (!panel || !header) return;
    const rect = panel.getBoundingClientRect();
    this.dragAnchor = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
    this.isDragging = true;
    header.setPointerCapture(event.pointerId);
    event.preventDefault();
    this.cdr.markForCheck();
  }

  onPanelPointerMove(event: PointerEvent): void {
    const start = this.dragAnchor;
    if (!start || start.pointerId !== event.pointerId || !this.isDesktopViewport) return;
    const panel = this.assistantPanel?.nativeElement;
    if (!panel) return;
    const maxLeft = Math.max(8, window.innerWidth - panel.offsetWidth - 8);
    const maxTop = Math.max(8, window.innerHeight - panel.offsetHeight - 8);
    this.panelPosition = {
      left: Math.min(maxLeft, Math.max(8, start.left + event.clientX - start.x)),
      top: Math.min(maxTop, Math.max(8, start.top + event.clientY - start.y))
    };
    this.cdr.markForCheck();
  }

  onPanelPointerUp(event: PointerEvent): void {
    if (this.dragAnchor?.pointerId !== event.pointerId) return;
    const header = event.currentTarget as HTMLElement | null;
    if (header?.hasPointerCapture(event.pointerId)) header.releasePointerCapture(event.pointerId);
    this.dragAnchor = null;
    this.isDragging = false;
    this.cdr.markForCheck();
  }

  /** Alternativa accesible al arrastre: ubicar la ventana en el centro. */
  centerAssistant(): void {
    if (!this.isDesktopViewport) return;
    const panel = this.assistantPanel?.nativeElement;
    if (!panel) return;
    this.panelPosition = {
      left: Math.max(8, Math.round((window.innerWidth - panel.offsetWidth) / 2)),
      top: Math.max(8, Math.round((window.innerHeight - panel.offsetHeight) / 2))
    };
    this.cdr.markForCheck();
  }

  private constrainDesktopPosition(): void {
    if (!this.panelPosition) return;
    const panel = this.assistantPanel?.nativeElement;
    if (!panel) return;
    this.panelPosition = {
      left: Math.min(Math.max(8, window.innerWidth - panel.offsetWidth - 8), Math.max(8, this.panelPosition.left)),
      top: Math.min(Math.max(8, window.innerHeight - panel.offsetHeight - 8), Math.max(8, this.panelPosition.top))
    };
  }

  toggleAssistant(): void {
    this.assistantOpen = !this.assistantOpen;
    this.lastRenderedChatState = '';
    this.cdr.markForCheck();
    if (!this.assistantOpen) {
      this.dragAnchor = null;
      this.isDragging = false;
      this.assistantToggle?.nativeElement.focus({ preventScroll: true });
    }
    if (this.assistantOpen) {
      this.updateMobileViewport();
      void this.ensureSessionReady();
      queueMicrotask(() => {
        this.scrollAssistantToBottom();
        if (this.needsVerification) void this.renderTurnstile();
        else if (this.canChat) this.focusComposer();
      });
    }
  }

  openAssistant(): void {
    this.assistantOpen = true;
    this.lastRenderedChatState = '';
    this.updateMobileViewport();
    this.cdr.markForCheck();
    void this.ensureSessionReady();
    queueMicrotask(() => {
      this.scrollAssistantToBottom();
      if (this.needsVerification) void this.renderTurnstile();
      else if (this.canChat) this.focusComposer();
    });
  }

  private async ensureSessionReady(): Promise<void> {
    if (this.sessionInitialized || this.securityLoading || this.restoringSession) return;
    this.sessionInitialized = true;

    if (this.sessionId && this.sessionToken) {
      await this.restoreSession();
      return;
    }

    await this.prepareNewSecureSession();
  }

  onInputKeydown(event: KeyboardEvent): void {
    // Enter (también Shift+Enter): salto de línea nativo. Solo Ctrl/Cmd+Enter
    // envía, evitando envíos accidentales y respetando la composición IME.
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.isComposing) {
      event.preventDefault();
      void this.sendAssistantMessage();
    }
  }

  onComposerInput(): void {
    this.resizeComposer();
  }

  onComposerFocus(): void {
    this.updateMobileViewport();
    queueMicrotask(() => this.scrollAssistantToBottom());
  }

  trackMessage(index: number, _message: ChatMessage): number {
    // Las entradas solo se agregan o se retira la última burbuja optimista.
    return index;
  }

  async sendAssistantMessage(): Promise<void> {
    const message = this.assistantInput.trim();
    if (!message || this.assistantLoading) return;
    if (!this.canChat) {
      this.errorMessage = 'Primero necesitamos completar la verificación de seguridad.';
      this.cdr.markForCheck();
      return;
    }

    this.errorMessage = '';
    this.assistantMessages = [
      ...this.assistantMessages,
      { role: 'user', text: message, createdAt: new Date().toISOString() }
    ];
    this.assistantInput = '';
    this.resizeComposerSoon();
    this.assistantLoading = true;
    this.cdr.markForCheck();

    try {
      const data = await this.api.sendMessage(this.sessionId, this.sessionToken, message);
      this.triage = data.triage;
      this.studyNotification = data.notification;
      this.interviewClosed = data.closed === true;
      this.watchNotificationStatus();
      this.assistantMessages = [
        ...this.assistantMessages,
        {
          role: 'bot',
          text: data.reply || 'Gracias. Contame un poco más para poder orientar correctamente tu consulta.',
          createdAt: new Date().toISOString()
        }
      ];
    } catch (error) {
      // El backend no guardó el mensaje: recuperar el borrador y retirar la
      // burbuja optimista, para que un 429 o timeout no "pierda" la consulta.
      const last = this.assistantMessages.at(-1);
      if (last?.role === 'user' && last.text === message) {
        this.assistantMessages = this.assistantMessages.slice(0, -1);
      }
      this.assistantInput = message;
      this.resizeComposerSoon();
      await this.handleApiError(error);
    } finally {
      this.assistantLoading = false;
      this.cdr.markForCheck();
      // Reactivar el textarea en el DOM ANTES de recuperar el foco.
      // OnPush puede diferir el render tras la promesa de Groq.
      this.cdr.detectChanges();
      // La vista se desplaza en ngAfterViewChecked, una vez dibujada la respuesta.
      // El foco del editor no debe desplazar la página completa.
      queueMicrotask(() => this.focusComposer());
    }
  }

  async submitConsultation(): Promise<void> {
    if (!this.hasStarted || !this.sessionId || !this.sessionToken || this.assistantLoading || this.interviewClosed || ['sent', 'reviewing', 'sending'].includes(this.studyNotification)) return;
    if (!this.consentToStudy) {
      this.errorMessage = 'Para enviar la consulta, marcá primero la autorización para compartir tus datos con el estudio.';
      this.cdr.markForCheck();
      return;
    }
    this.assistantLoading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();
    try {
      const data = await this.api.submitConsultation(this.sessionId, this.sessionToken);
      this.studyNotification = data.notification;
      this.interviewClosed = data.closed === true;
      this.watchNotificationStatus();
      this.assistantMessages = [...this.assistantMessages, { role: 'bot', text: data.reply }];
    } catch (error) {
      await this.handleApiError(error);
    } finally {
      this.assistantLoading = false;
      this.cdr.detectChanges();
      queueMicrotask(() => { this.scrollAssistantToBottom(); this.focusComposer(); });
    }
  }

  async startNewConsultation(): Promise<void> {
    if (this.assistantLoading || this.securityLoading || ['reviewing', 'sending'].includes(this.studyNotification)) return;
    if (this.hasStarted && this.studyNotification !== 'sent' &&
        !window.confirm('Esta consulta todavía no fue enviada al estudio. ¿Querés descartarla e iniciar otra?')) return;

    this.stopNotificationPolling();
    const previousId = this.sessionId;
    const previousToken = this.sessionToken;
    this.clearSessionCredentials();
    this.sessionInitialized = false;
    this.resetUi();
    this.cdr.markForCheck();

    try {
      if (previousId && previousToken) await this.api.resetSession(previousId, previousToken);
    } catch {
      // Cerrar la sesión remota es best-effort; su TTL también limita su vida útil.
    }

    this.sessionInitialized = true;
    await this.prepareNewSecureSession();
  }

  private stopNotificationPolling(): void {
    if (this.notificationPollTimer !== null) {
      clearTimeout(this.notificationPollTimer);
      this.notificationPollTimer = null;
    }
  }

  // Consulta únicamente el estado local de Fastify: NO consume tokens Groq.
  // Mantiene la diferencia entre "resumen listo" y "correo entregado".
  private watchNotificationStatus(): void {
    this.stopNotificationPolling();
    if (!['reviewing', 'sending'].includes(this.studyNotification) || !this.sessionId || !this.sessionToken) return;
    const requestedId = this.sessionId;
    this.notificationPollTimer = setTimeout(() => {
      this.notificationPollTimer = null;
      void (async () => {
        try {
          const result = await this.api.getSession(requestedId, this.sessionToken);
          if (this.sessionId !== requestedId) return;
          const previous = this.studyNotification;
          this.studyNotification = result.notification;
          if (['reviewing', 'sending'].includes(previous) && result.notification === 'failed') {
            this.errorMessage = 'No pudimos confirmar el correo al estudio. La consulta sigue guardada y podés reintentar el envío.';
          }
          this.cdr.markForCheck();
        } catch {
          // Error de red pasajero: conservar estado sending, sin afirmar entrega.
        }
        if (['reviewing', 'sending'].includes(this.studyNotification) && this.sessionId === requestedId) this.watchNotificationStatus();
      })();
    }, 3500);
  }

  private async prepareNewSecureSession(): Promise<void> {
    this.errorMessage = '';
    const siteKey = environment.turnstileSiteKey?.trim();
    const hasRealUiKey = Boolean(siteKey && !siteKey.startsWith('REEMPLAZAR_'));

    if (!hasRealUiKey) {
      if (environment.production) {
        this.needsVerification = true;
        this.errorMessage = 'Falta configurar la clave pública de seguridad del asistente.';
        this.cdr.markForCheck();
        return;
      }
      await this.establishSession('');
      return;
    }

    this.needsVerification = true;
    this.cdr.markForCheck();
    queueMicrotask(() => void this.renderTurnstile());
  }

  private async renderTurnstile(): Promise<void> {
    const siteKey = environment.turnstileSiteKey?.trim();
    const container = this.turnstileContainer?.nativeElement;
    if (!this.needsVerification || !siteKey || !container || this.turnstileWidgetId) return;

    try {
      this.turnstileWidgetId = await this.turnstile.render(container, siteKey, {
        onSuccess: token => void this.establishSession(token),
        onExpired: () => {
          this.errorMessage = 'La verificación venció. Completala nuevamente.';
          this.cdr.markForCheck();
        },
        onError: () => {
          this.errorMessage = 'No pudimos completar la verificación de seguridad.';
          this.cdr.markForCheck();
        }
      });
    } catch {
      this.errorMessage = 'No se pudo cargar la verificación de seguridad. Revisá tu conexión.';
      this.cdr.markForCheck();
    }
  }

  private async establishSession(turnstileToken: string): Promise<void> {
    if (this.securityLoading || this.sessionId) return;
    this.securityLoading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    try {
      const credentials = await this.api.createSession(turnstileToken);
      this.sessionId = credentials.sessionId;
      this.sessionToken = credentials.sessionToken;
      sessionStorage.setItem(SESSION_ID_KEY, this.sessionId);
      sessionStorage.setItem(SESSION_TOKEN_KEY, this.sessionToken);
      this.needsVerification = false;
      this.turnstile.remove(this.turnstileWidgetId);
      this.turnstileWidgetId = undefined;
      queueMicrotask(() => this.focusComposer());
    } catch (error) {
      const http = error as HttpErrorResponse;
      this.errorMessage = http.error?.error || 'No pudimos iniciar una sesión segura. Intentá nuevamente.';
      this.sessionInitialized = false;
      this.turnstile.reset(this.turnstileWidgetId);
    } finally {
      this.securityLoading = false;
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    }
  }

  private async restoreSession(): Promise<void> {
    if (!this.sessionId || !this.sessionToken) return;

    this.restoringSession = true;
    this.cdr.markForCheck();
    try {
      const data = await this.api.getSession(this.sessionId, this.sessionToken);
      if (data.exists && data.transcript.length > 0) {
        this.assistantMessages = [{ role: 'bot', text: GREETING }, ...data.transcript];
        this.triage = data.triage;
        this.studyNotification = data.notification;
        this.interviewClosed = data.closed === true;
        this.watchNotificationStatus();
      }
    } catch (error) {
      const http = error as HttpErrorResponse;
      if (http.status === 401) {
        this.clearSessionCredentials();
        await this.prepareNewSecureSession();
      } else {
        this.sessionInitialized = false;
        this.errorMessage = 'No pudimos recuperar la consulta anterior. Cerrá y volvé a abrir el asistente para reintentar.';
      }
    } finally {
      this.restoringSession = false;
      this.cdr.markForCheck();
      queueMicrotask(() => {
        this.scrollAssistantToBottom();
        this.focusComposer();
      });
    }
  }

  private async handleApiError(error: unknown): Promise<void> {
    const http = error as HttpErrorResponse;
    if (http.status === 401) {
      this.clearSessionCredentials();
      this.errorMessage = 'La sesión venció por seguridad. Verificá el acceso para continuar con una nueva consulta.';
      await this.prepareNewSecureSession();
      return;
    }

    if (http.status === 409 && http.error?.code === 'SESSION_BUSY') {
      this.errorMessage = 'La respuesta anterior sigue procesándose. Esperá unos segundos y volvé a enviar: tu texto sigue guardado.';
      return;
    }

    if (http.status === 409 && http.error?.code === 'CONSULTATION_IN_PROGRESS') {
      this.errorMessage = 'La consulta ya se está preparando para el estudio. Esperá la confirmación del envío.';
      this.studyNotification = 'reviewing';
      this.watchNotificationStatus();
      return;
    }

    if (http.status === 409 && http.error?.code === 'SESSION_COMPLETED') {
      this.errorMessage = 'Esta consulta ya fue enviada al estudio. Si necesitás plantear otro asunto, iniciá una nueva consulta.';
      return;
    }

    if (http.status === 429) {
      const wait = Number(http.error?.retryAfterSeconds || http.headers?.get('Retry-After')) || 0;
      const waitHint = wait > 0 ? ` Podés reintentar dentro de ${Math.ceil(wait)} segundos.` : '';
      this.errorMessage = (http.error?.error || 'Se alcanzó temporalmente un límite. Intentá más tarde.') + waitHint;
      return;
    }

    if (http.status === 503) {
      this.errorMessage = http.error?.error || 'El servicio no está disponible temporalmente. Podés usar el formulario de contacto del estudio.';
      return;
    }

    this.errorMessage = http.error?.error || 'No pudimos conectar con el asistente en este momento.';
  }

  private clearSessionCredentials(): void {
    this.sessionId = '';
    this.sessionToken = '';
    sessionStorage.removeItem(SESSION_ID_KEY);
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
  }

  private resetUi(): void {
    this.stopNotificationPolling();
    this.triage = undefined;
    this.studyNotification = 'pending';
    this.interviewClosed = false;
    this.consentToStudy = false;
    this.errorMessage = '';
    this.assistantInput = '';
    this.resizeComposerSoon();
    this.needsVerification = false;
    this.turnstile.remove(this.turnstileWidgetId);
    this.turnstileWidgetId = undefined;
    this.assistantMessages = [{ role: 'bot', text: GREETING }];
  }

  private focusComposer(): void {
    if (!this.assistantOpen || this.assistantLoading || !this.canChat) return;
    const input = this.assistantInputEl?.nativeElement;
    const panel = this.assistantPanel?.nativeElement;
    if (!input || input.disabled || !panel) return;
    // No robar el foco si la persona salió del chat durante la espera.
    const focused = typeof document !== 'undefined' ? document.activeElement : null;
    if (focused && focused !== document.body && !panel.contains(focused)) return;
    input.focus({ preventScroll: true });
    this.resizeComposer();
  }

  private resizeComposerSoon(): void {
    queueMicrotask(() => this.resizeComposer());
  }

  private resizeComposer(): void {
    const input = this.assistantInputEl?.nativeElement;
    if (!input) return;
    input.style.height = 'auto';
    const maxHeight = typeof window !== 'undefined'
      ? (parseFloat(window.getComputedStyle(input).maxHeight) || 150)
      : 150;
    input.style.height = `${Math.min(input.scrollHeight, maxHeight)}px`;
    input.style.overflowY = input.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }

  private updateMobileViewport(): void {
    if (typeof window === 'undefined' || !window.matchMedia('(max-width: 700px)').matches) return;
    const panel = this.assistantPanel?.nativeElement;
    const viewport = window.visualViewport;
    if (!panel || !viewport) return;
    panel.style.setProperty('--assistant-visual-height', `${Math.round(viewport.height)}px`);
    panel.style.setProperty('--assistant-visual-top', `${Math.round(viewport.offsetTop)}px`);
    if (typeof document !== 'undefined' && document.activeElement === this.assistantInputEl?.nativeElement) {
      queueMicrotask(() => this.scrollAssistantToBottom());
    }
  }

  private scrollAssistantToBottom(): void {
    const body = this.assistantBody?.nativeElement;
    if (body) body.scrollTop = body.scrollHeight;
  }
}
