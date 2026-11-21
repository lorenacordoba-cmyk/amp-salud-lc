import { Injectable } from '@angular/core';

interface TurnstileApi {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  reset(widgetId?: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

@Injectable({ providedIn: 'root' })
export class TurnstileService {
  private scriptPromise?: Promise<TurnstileApi>;

  load(): Promise<TurnstileApi> {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (this.scriptPromise) return this.scriptPromise;

    this.scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-lc-turnstile]');
      if (existing) {
        const poll = window.setInterval(() => {
          if (window.turnstile) {
            window.clearInterval(poll);
            resolve(window.turnstile);
          }
        }, 50);
        window.setTimeout(() => {
          window.clearInterval(poll);
          if (!window.turnstile) reject(new Error('Turnstile no pudo inicializarse.'));
        }, 10_000);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset['lcTurnstile'] = 'true';
      script.onload = () => window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile no disponible.'));
      script.onerror = () => reject(new Error('No se pudo cargar la verificación de seguridad.'));
      document.head.appendChild(script);
    });

    return this.scriptPromise;
  }

  async render(
    container: HTMLElement,
    siteKey: string,
    callbacks: { onSuccess: (token: string) => void; onExpired: () => void; onError: () => void },
    action = 'legal_triage_session'
  ): Promise<string> {
    const api = await this.load();
    return api.render(container, {
      sitekey: siteKey,
      theme: 'auto',
      size: 'flexible',
      language: 'es',
      action,
      callback: callbacks.onSuccess,
      'expired-callback': callbacks.onExpired,
      'error-callback': callbacks.onError
    });
  }

  reset(widgetId?: string): void {
    if (window.turnstile && widgetId) window.turnstile.reset(widgetId);
  }

  remove(widgetId?: string): void {
    if (window.turnstile && widgetId) window.turnstile.remove(widgetId);
  }
}
