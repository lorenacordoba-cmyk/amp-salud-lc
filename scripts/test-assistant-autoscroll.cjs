const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');

const file = path.join(__dirname, '../src/app/shared/assistant/assistant.component.ts');
const source = fs.readFileSync(file, 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../src/app/shared/assistant/assistant.component.scss'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, experimentalDecorators: true },
  reportDiagnostics: true
});
assert.equal(compiled.diagnostics.length, 0, 'El componente debe compilar sin diagnósticos de transpile');
assert.match(css, /\.assistant-body\s*>\s*\*\s*\{\s*flex-shrink:\s*0;\s*\}/);
assert.match(css, /\.assistant-body\s*\{[^}]*overflow-y:\s*auto;/s);

let nextFrameId = 0;
const frames = new Map();
const windowMock = {
  innerWidth: 1200,
  innerHeight: 800,
  requestAnimationFrame(callback) { const id = ++nextFrameId; frames.set(id, callback); return id; },
  cancelAnimationFrame(id) { frames.delete(id); },
  removeEventListener() {}
};
const mockExports = {};
const context = {
  exports: mockExports,
  window: windowMock,
  console,
  require(name) {
    if (name === '@angular/core') return {
      Component: () => x => x,
      ViewChild: () => () => {},
      ChangeDetectionStrategy: { OnPush: 0 },
      inject: () => ({})
    };
    if (name === '@angular/common') return { CommonModule: {} };
    if (name === '@angular/forms') return { FormsModule: {} };
    if (name.endsWith('/environment')) return { environment: {} };
    return new Proxy({}, { get: () => class {} });
  }
};
vm.runInNewContext(compiled.outputText, context, { filename: 'assistant.component.compiled.cjs' });
const component = Object.create(mockExports.AssistantComponent.prototype);
component.assistantOpen = true;
component.assistantLoading = false;
component.restoringSession = false;
component.securityLoading = false;
component.needsVerification = false;
component.studyNotification = 'pending';
component.interviewClosed = false;
component.errorMessage = '';
component.assistantMessages = [{ role: 'bot', text: '¡Hola!' }];
component.lastRenderedChatState = '';
component.lastRenderedMessages = null;
component.chatScrollFrame = null;
component.notificationPollTimer = null;
component.turnstile = { remove() {} };
const body = { scrollHeight: 750, clientHeight: 400, scrollTop: 0 };
component.assistantBody = { nativeElement: body };
function flushFrames() {
  const pending = [...frames.values()];
  frames.clear();
  pending.forEach(callback => callback());
}
function assertScrolled(label) {
  assert.equal(body.scrollTop, body.scrollHeight, label);
  assert.equal(component.chatScrollFrame, null, label + ': rAF finalizado');
}

// La bienvenida aparece al abrir.
component.ngAfterViewChecked();
assert.equal(body.scrollTop, 750);
flushFrames();
assertScrolled('Saludo inicial');

// El usuario envía un mensaje: el scroll ocurre cuando Angular ya dibujó la burbuja.
component.assistantMessages = [...component.assistantMessages, { role: 'user', text: 'Tengo un problema con OSDE' }];
component.assistantLoading = true;
body.scrollHeight = 820;
body.scrollTop = 400;
component.ngAfterViewChecked();
flushFrames();
assertScrolled('Mensaje y indicador de procesamiento');

// Groq responde: la nueva respuesta debe quedar visible sin mover la barra a mano.
component.assistantMessages = [...component.assistantMessages, { role: 'bot', text: '¿Cuándo solicitaste la cobertura?' }];
component.assistantLoading = false;
body.scrollHeight = 995;
body.scrollTop = 550;
component.ngAfterViewChecked();
flushFrames();
assertScrolled('Respuesta de Groq tras historial largo');

// No se debe forzar el scroll cuando solo cambia el ciclo de detección de Angular:
// así se permite revisar mensajes anteriores mientras no aparezcan mensajes nuevos.
body.scrollTop = 100;
component.ngAfterViewChecked();
assert.equal(body.scrollTop, 100);
assert.equal(frames.size, 0);

// El estado de envío o un error sí tienen que quedar visibles.
component.studyNotification = 'reviewing';
body.scrollHeight = 1050;
component.ngAfterViewChecked();
flushFrames();
assertScrolled('Estado de revisión del estudio');
component.errorMessage = 'Servicio temporalmente no disponible';
body.scrollHeight = 1100;
component.ngAfterViewChecked();
flushFrames();
assertScrolled('Error visible al pie del chat');

// Se vuelve a abrir el panel; hay que permitir otro scroll aunque no haya mensajes nuevos.
component.lastRenderedChatState = '';
body.scrollTop = 0;
component.ngAfterViewChecked();
flushFrames();
assertScrolled('Reapertura');

// Al destruir el componente, ninguna operación diferida debe quedar viva.
component.assistantMessages = [...component.assistantMessages, { role: 'bot', text: 'Cierre' }];
component.ngAfterViewChecked();
assert.ok(frames.size > 0);
component.ngOnDestroy();
assert.equal(frames.size, 0, 'No dejar rAF pendiente tras cerrar la vista');
console.log('OK: scroll tras render, indicador, Groq, estados, errores, reapertura, lectura manual y limpieza.');
