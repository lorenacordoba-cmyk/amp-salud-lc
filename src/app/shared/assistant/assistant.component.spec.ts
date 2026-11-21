import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AssistantComponent } from './assistant.component';
import { AssistantApiService } from './assistant-api.service';
import { TurnstileService } from './turnstile.service';
import { AssistantChatResponse } from '../../interfaces';

describe('Asistente jurídico — continuidad del chat', () => {
  let api: {
    createSession: ReturnType<typeof vi.fn>;
    sendMessage: ReturnType<typeof vi.fn>;
    getSession: ReturnType<typeof vi.fn>;
    resetSession: ReturnType<typeof vi.fn>;
    submitConsultation: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    sessionStorage.clear();
    api = {
      createSession: vi.fn().mockResolvedValue({ sessionId: 'sesion-1', sessionToken: 'token-1', expiresAt: '2099-01-01' }),
      sendMessage: vi.fn(),
      getSession: vi.fn(),
      resetSession: vi.fn(),
      submitConsultation: vi.fn()
    };
    await TestBed.configureTestingModule({
      imports: [AssistantComponent],
      providers: [
        { provide: AssistantApiService, useValue: api },
        { provide: TurnstileService, useValue: { remove: vi.fn(), render: vi.fn(), reset: vi.fn() } }
      ]
    }).compileComponents();
  });

  it('conserva el campo para responder después de la respuesta de Groq', async () => {
    const response: AssistantChatResponse = {
      reply: '¿Qué cobertura médica tiene tu mamá?',
      triage: {
        legalArea: 'HEALTH', urgency: 'NORMAL'
      },
      notification: 'pending'
    };
    api.sendMessage.mockResolvedValue(response);
    const fixture = TestBed.createComponent(AssistantComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.openAssistant();
    // Se espera la apertura y el establecimiento de la sesión simulado.
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.canChat).toBe(true);

    component.assistantInput = 'Mi mamá necesita un medicamento';
    await component.sendAssistantMessage();
    fixture.detectChanges();

    expect(api.sendMessage).toHaveBeenCalledWith('sesion-1', 'token-1', 'Mi mamá necesita un medicamento');
    expect(component.assistantMessages.at(-1)?.text).toBe(response.reply);
    expect(component.assistantInput).toBe('');
    expect(fixture.nativeElement.querySelector('.assistant-footer textarea')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.assistant-meta')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.assistant-footer textarea').disabled).toBe(false);
  });
  it('muestra el cierre de inmediato mientras el especialista revisa; sin afirmar entrega', async () => {
    api.sendMessage.mockResolvedValue({
      reply: 'Gracias, ya tengo la información necesaria. Un profesional del estudio revisará tu consulta.',
      triage: { legalArea: 'HEALTH', urgency: 'HIGH' },
      notification: 'reviewing',
      closed: true
    } satisfies AssistantChatResponse);
    api.getSession.mockResolvedValue({ exists: true, transcript: [], triage: { legalArea: 'HEALTH', urgency: 'HIGH' }, notification: 'sending' });
    const fixture = TestBed.createComponent(AssistantComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.openAssistant();
    await fixture.whenStable();
    component.assistantInput = 'Autorizo expresamente el contacto por email';
    await component.sendAssistantMessage();
    fixture.detectChanges();
    expect(component.assistantMessages.at(-1)?.text).toContain('ya tengo la información');
    expect(component.studyNotification).toBe('reviewing');
    expect(component.canChat).toBe(false);
    expect(fixture.nativeElement.querySelector('.handoff-card')?.textContent).toContain('Preparando el informe');
  });
  it('no bloquea la conversación solo porque SMTP está enviando; se necesita cierre explícito', async () => {
    api.sendMessage.mockResolvedValue({
      reply: '¿Me contás qué ocurrió?',
      triage: { legalArea: 'HEALTH', urgency: 'HIGH' },
      notification: 'sending', closed: false
    } satisfies AssistantChatResponse);
    const fixture = TestBed.createComponent(AssistantComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.openAssistant();
    await fixture.whenStable();
    component.assistantInput = 'Mi mamá necesita una operación';
    await component.sendAssistantMessage();
    fixture.detectChanges();
    expect(component.canChat).toBe(true);
    expect(fixture.nativeElement.querySelector('.assistant-footer textarea').disabled).toBe(false);
  });
  it('envía una consulta incompleta con consentimiento sin esperar readyForLawyer', async () => {
    api.sendMessage.mockResolvedValue({
      reply: '¿Podés contarme algo más?',
      triage: { legalArea: 'HEALTH', urgency: 'NORMAL' },
      notification: 'pending'
    } satisfies AssistantChatResponse);
    api.submitConsultation.mockResolvedValue({ reply: 'La consulta fue enviada al estudio.', notification: 'sent', closed: true });
    const fixture = TestBed.createComponent(AssistantComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.openAssistant();
    await fixture.whenStable();
    component.assistantInput = 'Mi prepaga no autoriza la cirugía';
    await component.sendAssistantMessage();
    fixture.detectChanges();
    expect(component.studyNotification).toBe('pending');
    component.consentToStudy = true;
    await component.submitConsultation();
    fixture.detectChanges();
    expect(api.submitConsultation).toHaveBeenCalledWith('sesion-1','token-1');
    expect(component.studyNotification).toBe('sent');
    expect(component.canChat).toBe(false);
    expect(fixture.nativeElement.querySelector('.handoff-card')).not.toBeNull();
  });
});

describe('Asistente jurídico — teclado, foco y uso móvil', () => {
  let api: { createSession: ReturnType<typeof vi.fn>; sendMessage: ReturnType<typeof vi.fn>; getSession: ReturnType<typeof vi.fn>; resetSession: ReturnType<typeof vi.fn>; submitConsultation: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    sessionStorage.clear();
    api = {
      createSession: vi.fn().mockResolvedValue({ sessionId: 's1', sessionToken: 't1', expiresAt: '2099-01-01' }),
      sendMessage: vi.fn(), getSession: vi.fn(), resetSession: vi.fn(), submitConsultation: vi.fn()
    };
    await TestBed.configureTestingModule({
      imports: [AssistantComponent],
      providers: [
        { provide: AssistantApiService, useValue: api },
        { provide: TurnstileService, useValue: { remove: vi.fn(), render: vi.fn(), reset: vi.fn() } }
      ]
    }).compileComponents();
  });

  it('deja Enter y Shift+Enter para insertar saltos de línea (sin enviar)', async () => {
    const fixture = TestBed.createComponent(AssistantComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const sendSpy = vi.spyOn(component, 'sendAssistantMessage');
    for (const init of [{ key: 'Enter' }, { key: 'Enter', shiftKey: true }]) {
      const event = new KeyboardEvent('keydown', { ...init, cancelable: true });
      component.onInputKeydown(event);
      expect(event.defaultPrevented).toBe(false);
    }
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('envía mediante Ctrl+Enter o Cmd+Enter, una sola vez por atajo', () => {
    const fixture = TestBed.createComponent(AssistantComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const sendSpy = vi.spyOn(component, 'sendAssistantMessage').mockResolvedValue(undefined);
    for (const modifier of [{ ctrlKey: true }, { metaKey: true }]) {
      const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true, ...modifier });
      component.onInputKeydown(event);
      expect(event.defaultPrevented).toBe(true);
    }
    expect(sendSpy).toHaveBeenCalledTimes(2);
  });

  it('devuelve el foco al escribir después de recibir respuesta y conserva el campo activo', async () => {
    api.sendMessage.mockResolvedValue({
      reply: '¿Qué obra social tenés?',
      triage: { legalArea: 'HEALTH', urgency: 'NORMAL' },
      notification: 'pending'
    } satisfies AssistantChatResponse);
    const fixture = TestBed.createComponent(AssistantComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.openAssistant();
    await fixture.whenStable();
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('.assistant-footer textarea') as HTMLTextAreaElement;
    const focusSpy = vi.spyOn(input, 'focus');
    component.assistantInput = 'Me negaron un medicamento';
    await component.sendAssistantMessage();
    fixture.detectChanges();
    expect(focusSpy).toHaveBeenCalled();
    expect(input.disabled).toBe(false);
    expect(input.getAttribute('enterkeyhint')).toBe('enter');
  });

  it('conserva el borrador y permite reintentarlo después de un 429', async () => {
    api.sendMessage.mockRejectedValue({ status: 429, error: { code: 'GROQ_RATE_LIMIT', retryAfterSeconds: 2 }, headers: { get: () => null } });
    const fixture = TestBed.createComponent(AssistantComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.openAssistant();
    await fixture.whenStable();
    fixture.detectChanges();
    component.assistantInput = 'Consulta sobre cobertura\nY medicación';
    await component.sendAssistantMessage();
    fixture.detectChanges();
    expect(component.assistantInput).toBe('Consulta sobre cobertura\nY medicación');
    expect(component.assistantMessages.some(message => message.role === 'user')).toBe(false);
    expect(fixture.nativeElement.querySelector('.assistant-footer textarea').disabled).toBe(false);
  });
});
