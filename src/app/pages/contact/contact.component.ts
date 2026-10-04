import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { type ConsultationForm } from '../../interfaces';
import { AssistantComponent } from '../../shared/assistant/assistant.component';
import { SiteFooterComponent } from '../../shared/site-footer/site-footer.component';
import { RevealDirective } from '../../shared/motion/reveal.directive';
import { PointerGlowDirective } from '../../shared/motion/pointer-glow.directive';

@Component({selector:'app-contact',standalone:true,imports:[CommonModule,FormsModule,RouterLink,AssistantComponent,SiteFooterComponent,RevealDirective,PointerGlowDirective],templateUrl:'./contact.component.html',styleUrls:['./contact.component.scss']})
export class ContactComponent {
  private readonly counterStorageKey='consultation_case_counter';
  caseNumber=this.getStoredCaseNumber(); isSubmitting=false; submitMessage=''; submitError='';
  form:ConsultationForm={fullName:'',phone:'',email:'',consultationType:'',coverageType:'',location:'',caseDescription:'',hasWrittenDenial:'No'};
  async submitForm():Promise<void>{this.submitMessage='';this.submitError='';if(!this.form.fullName||!this.form.phone||!this.form.email||!this.form.location||!this.form.caseDescription){this.submitError='Completá los campos obligatorios para enviar tu consulta.';return;}this.isSubmitting=true;const subject=`caso ${this.caseNumber}`;const body=[`Nombre completo: ${this.form.fullName}`,`Telefono / WhatsApp: ${this.form.phone}`,`Email: ${this.form.email}`,`Tipo de consulta: ${this.form.consultationType||'No especificado'}`,`Tipo de cobertura: ${this.form.coverageType||'No especificado'}`,`Lugar de residencia: ${this.form.location}`,`Tiene negativa por escrito: ${this.form.hasWrittenDenial}`,'','Descripcion breve del caso:',this.form.caseDescription].join('\n');try{const response=await fetch('https://formsubmit.co/ajax/91b516e76f1ef887eca6f9b919b7cfb6',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({_subject:subject,template:'table',captcha:'false',message:body})});if(!response.ok)throw new Error();this.submitMessage=`Consulta enviada correctamente con asunto "${subject}".`;this.caseNumber+=1;localStorage.setItem(this.counterStorageKey,String(this.caseNumber));this.form={fullName:'',phone:'',email:'',consultationType:'',coverageType:'',location:'',caseDescription:'',hasWrittenDenial:'No'};}catch{this.submitError='No pudimos enviar la consulta en este momento. Intentá nuevamente en unos minutos.';}finally{this.isSubmitting=false;}}
  private getStoredCaseNumber():number{const parsed=Number(localStorage.getItem(this.counterStorageKey));if(Number.isInteger(parsed)&&parsed>0)return parsed;localStorage.setItem(this.counterStorageKey,'1');return 1;}
}
