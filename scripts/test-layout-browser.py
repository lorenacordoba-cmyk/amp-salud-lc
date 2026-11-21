"""QA visual del contenedor del asistente (requiere playwright Python y Chromium local)."""
from pathlib import Path
from playwright.sync_api import sync_playwright
css = (Path(__file__).resolve().parent.parent/'src/app/shared/assistant/assistant.component.scss').read_text()
html = '''<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'''+css+'''</style></head><body style="margin:0">
<section class="assistant-panel is-open">
<header class="assistant-header"><div class="assistant-title"><strong>Asistente jurídico</strong><span>Atención inicial</span></div><div class="assistant-header-actions"><button class="assistant-close">×</button></div></header>
<div class="assistant-meta"><span class="area-pill">Derecho a la Salud</span></div>
<div class="assistant-body" id="body"></div>
<footer class="assistant-footer"><textarea rows="1">Consulta del cliente</textarea><button class="send-button">➤</button><p class="privacy-note">Atención inicial automatizada.</p></footer>
</section></body></html>'''
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    for width,height,label in [(1280,900,'escritorio'),(390,844,'móvil')]:
        page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
        page.set_content(html)
        page.evaluate('''() => {const body=document.getElementById('body'); for(let i=0;i<25;i++){const el=document.createElement('div');el.className='message-row';el.innerHTML='<div class="message-avatar">LC</div><div class="assistant-message">'+('Respuesta de prueba para revisar el desplazamiento vertical. '.repeat(3))+'</div>';body.appendChild(el);} const spinner=document.createElement('div'); spinner.className='message-row';spinner.id='spinner';spinner.innerHTML='<div class="message-avatar">LC</div><div class="assistant-message typing"><span>•</span><span>•</span><span>•</span></div>';body.appendChild(spinner); body.scrollTop=body.scrollHeight;}''')
        r=page.evaluate('''() => {const body=document.getElementById('body'),last=document.getElementById('spinner'),footer=document.querySelector('.assistant-footer'),panel=document.querySelector('.assistant-panel');const bb=body.getBoundingClientRect(),lr=last.getBoundingClientRect(),fb=footer.getBoundingClientRect(),pb=panel.getBoundingClientRect();return {scrollHeight:body.scrollHeight,clientHeight:body.clientHeight,scrollTop:body.scrollTop,lastVisible:lr.bottom<=bb.bottom+1 && lr.top>=bb.top-1,footerVisible:fb.bottom<=innerHeight+1,bodyWithinPanel:bb.bottom<=fb.top+1,panelHeight:pb.height};}''')
        print(label,r)
        assert r['scrollHeight'] > r['clientHeight'], 'Debe existir scroll interno con muchas respuestas'
        assert r['lastVisible'], 'La respuesta final y el indicador deben ser visibles después del scroll'
        assert r['footerVisible'], 'El editor debe seguir visible en pantalla'
        assert r['bodyWithinPanel'], 'El área de chat no debe tapar el editor'
        page.close()
    browser.close()
print('OK: scroll real de Chromium, conversación larga, spinner visible y editor fijo, escritorio/móvil.')
