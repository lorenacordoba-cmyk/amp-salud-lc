import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { type CaseRecord, type ChatMessage } from '../../interfaces';

@Component({
  selector: 'app-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './assistant.component.html',
  styleUrls: ['./assistant.component.scss']
})
export class AssistantComponent {
  @ViewChild('assistantBody') private readonly assistantBody?: ElementRef<HTMLDivElement>;
  private readonly aiApiUrl = `${environment.apiUrl}/api/ai/chat`;
  assistantOpen = false;
  assistantLoading = false;
  assistantInput = '';
  completedCase?: CaseRecord;
  assistantMessages: ChatMessage[] = [{ role: 'bot', text: 'Hola, soy el asistente virtual del Estudio Jurídico Lorena Córdoba. ¿Cómo puedo ayudarte con tu consulta?' }];

  constructor(private readonly cdr: ChangeDetectorRef) {}
  toggleAssistant(): void { this.assistantOpen=!this.assistantOpen; this.cdr.detectChanges(); queueMicrotask(()=>this.scrollAssistantToBottom()); }
  openAssistant(): void { this.assistantOpen=true; this.cdr.detectChanges(); queueMicrotask(()=>this.scrollAssistantToBottom()); }
  private scrollAssistantToBottom(): void { const body=this.assistantBody?.nativeElement; if(body) body.scrollTop=body.scrollHeight; }
  async sendAssistantMessage(): Promise<void> {
    const message=this.assistantInput.trim(); if(!message||this.assistantLoading) return;
    this.assistantMessages.push({role:'user',text:message}); this.assistantInput=''; this.assistantLoading=true; this.cdr.detectChanges(); queueMicrotask(()=>this.scrollAssistantToBottom());
    try {
      const history=this.assistantMessages.slice(0,-1).map(entry=>({role:entry.role==='user'?'user':'model',parts:[{text:entry.text}]}));
      const response=await fetch(this.aiApiUrl,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({message,history})});
      if(!response.ok) throw new Error('No fue posible contactar al asistente.');
      const data:{reply?:string;caseData?:CaseRecord}=await response.json(); this.completedCase=data.caseData;
      this.assistantMessages.push({role:'bot',text:data.reply||'Gracias. Contame un poco más para ayudarte a ordenar tu caso.'});
    } catch { this.assistantMessages.push({role:'bot',text:'Hay un problema temporal con el asistente IA. Podés usar la página de contacto para enviarnos tu consulta.'}); }
    finally { this.assistantLoading=false; this.cdr.detectChanges(); queueMicrotask(()=>this.scrollAssistantToBottom()); }
  }
}
