# Front Angular — Estudio Jurídico

Sitio Angular 22 con asistente jurídico integrado.

## Requisito

Node >= 22.22.3.

```bash
nvm use
npm ci
npm start
```

## Integración del chat

El componente ya no llama `fetch` directamente ni reconstruye `history`.

La red está centralizada en:

```text
src/app/shared/assistant/assistant-api.service.ts
```

El navegador guarda solo un `sessionId` en `localStorage`. Al montar el componente consulta al backend y recupera el transcript asociado.

## Desarrollo

`src/environments/environment.ts`:

```ts
apiUrl: 'http://localhost:3001'
```

## Producción

Editar:

```text
src/environments/environment.prod.ts
```

con la URL pública real de Node.

Netlify está configurado para Node 22.22.3 en `netlify.toml`.
