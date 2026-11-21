import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AssistantChatResponse,
  AssistantSubmitResponse,
  AssistantSessionCredentials,
  AssistantSessionResponse
} from '../../interfaces';

export interface AssistantClientContext {
  timezone: string;
  locale: string;
  pagePath: string;
  clientDateTime: string;
}

@Injectable({ providedIn: 'root' })
export class AssistantApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/ai`;
  private readonly pendingRequests = new Map<string, { message: string; clientRequestId: string }>();

  createSession(turnstileToken = ''): Promise<AssistantSessionCredentials> {
    return firstValueFrom(
      this.http
        .post<AssistantSessionCredentials>(`${this.baseUrl}/session`, { turnstileToken })
        .pipe(timeout(15_000))
    );
  }

  async sendMessage(sessionId: string, sessionToken: string, message: string): Promise<AssistantChatResponse> {
    const pending = this.pendingRequests.get(sessionId);
    const clientRequestId = pending?.message === message
      ? pending.clientRequestId
      : this.newRequestId();
    this.pendingRequests.set(sessionId, { message, clientRequestId });
    try {
      const result = await firstValueFrom(
        this.http.post<AssistantChatResponse>(`${this.baseUrl}/chat`, {
          sessionId, clientRequestId, message,
          clientContext: this.getClientContext()
        }, { headers: this.sessionHeaders(sessionToken) }).pipe(timeout(210_000))
      );
      this.pendingRequests.delete(sessionId);
      return result;
    } catch (error) {
      // Conservar el mismo id para recuperar la respuesta de un pedido que
      // terminó en Fastify después de un timeout de red.
      throw error;
    }
  }

  submitConsultation(sessionId: string, sessionToken: string): Promise<AssistantSubmitResponse> {
    return firstValueFrom(
      this.http.post<AssistantSubmitResponse>(`${this.baseUrl}/submit`, {
        sessionId,
        consentToStudy: true
      }, { headers: this.sessionHeaders(sessionToken) }).pipe(timeout(210_000))
    );
  }

  getSession(sessionId: string, sessionToken: string): Promise<AssistantSessionResponse> {
    return firstValueFrom(
      this.http
        .get<AssistantSessionResponse>(`${this.baseUrl}/session/${encodeURIComponent(sessionId)}`, {
          headers: this.sessionHeaders(sessionToken)
        })
        .pipe(timeout(12_000))
    );
  }

  resetSession(sessionId: string, sessionToken: string): Promise<void> {
    this.pendingRequests.delete(sessionId);
    return firstValueFrom(
      this.http
        .post<void>(`${this.baseUrl}/reset`, { sessionId }, { headers: this.sessionHeaders(sessionToken) })
        .pipe(timeout(12_000))
    );
  }

  private newRequestId(): string {
    // En celulares que abren el desarrollo por http://IP-LAN, randomUUID() puede
    // no existir (contexto no seguro); getRandomValues sí suele estar disponible.
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  private sessionHeaders(sessionToken: string): HttpHeaders {
    return new HttpHeaders({ 'X-Session-Token': sessionToken });
  }

  private getClientContext(): AssistantClientContext {
    const resolved = Intl.DateTimeFormat().resolvedOptions();
    return {
      timezone: resolved.timeZone || 'America/Argentina/Buenos_Aires',
      locale: navigator.language || 'es-AR',
      pagePath: window.location.pathname,
      clientDateTime: new Date().toISOString()
    };
  }
}
