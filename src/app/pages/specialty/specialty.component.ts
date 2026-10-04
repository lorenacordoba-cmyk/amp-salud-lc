import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AssistantComponent } from '../../shared/assistant/assistant.component';
import { SiteFooterComponent } from '../../shared/site-footer/site-footer.component';
import { RevealDirective } from '../../shared/motion/reveal.directive';
import { PointerGlowDirective } from '../../shared/motion/pointer-glow.directive';

type Specialty = {
  icon: string;
  title: string;
  eyebrow: string;
  intro: string;
  description: string;
  services: string[];
  whenToConsult: string[];
  note: string;
  image: string;
  imageAlt: string;
};

@Component({
  selector: 'app-specialty',
  standalone: true,
  imports: [CommonModule, RouterLink, AssistantComponent, SiteFooterComponent, RevealDirective, PointerGlowDirective],
  templateUrl: './specialty.component.html',
  styleUrls: ['./specialty.component.scss']
})
export class SpecialtyComponent {
  specialty!: Specialty;

  private readonly specialties: Record<string, Specialty> = {
    'amparos-de-salud': {
      icon: '✦', title: 'Amparos de salud', eyebrow: 'Derecho de la salud',
      intro: 'Cuando una cobertura médica se demora, se limita o se niega, el tiempo puede ser decisivo.',
      description: 'Analizamos la indicación médica, la respuesta de la obra social o prepaga y la urgencia del caso para definir la vía de reclamo adecuada. Cuando corresponde, evaluamos la presentación de una acción de amparo y una medida cautelar para obtener una respuesta judicial rápida.',
      services: ['Medicamentos y tratamientos de alto costo','Cirugías, estudios y prácticas médicas','Prestaciones vinculadas a discapacidad','Internaciones, rehabilitación y cuidados domiciliarios','Coberturas parciales o negativas de prepagas y obras sociales','Demoras de autorización que comprometen la continuidad del tratamiento'],
      whenToConsult: ['Recibiste una negativa expresa o una cobertura inferior a la indicada.','La autorización se demora y existe una indicación médica vigente.','Te exigen trámites reiterados sin brindar una solución concreta.','La interrupción del tratamiento puede generar un perjuicio en tu salud.'],
      note: 'La viabilidad de un amparo depende de la documentación médica, la urgencia y las circunstancias concretas de cada caso.',
      image: 'specialties/amparos-salud.svg', imageAlt: 'Ilustración jurídica vinculada al derecho de la salud'
    },
    'derecho-del-consumidor': {
      icon: '§', title: 'Derecho del consumidor', eyebrow: 'Relaciones de consumo',
      intro: 'Defensa frente a incumplimientos, cobros indebidos y prácticas abusivas de proveedores de bienes y servicios.',
      description: 'Evaluamos la relación de consumo, la documentación disponible, los reclamos previos y los daños ocasionados para determinar la estrategia adecuada, tanto en instancias conciliatorias como judiciales.',
      services: ['Incumplimientos contractuales','Cobros indebidos y débitos no autorizados','Servicios defectuosos o no prestados','Compras, financiación y comercio electrónico','Prácticas abusivas y falta de información','Daño directo, daño moral y daño punitivo cuando corresponda'],
      whenToConsult: ['El proveedor no cumplió lo ofrecido o contratado.','Te cobraron importes que no reconocés o que ya habías cancelado.','Hiciste reclamos y no recibiste una solución razonable.','El incumplimiento te produjo un perjuicio económico o personal.'],
      note: 'Conservar contratos, facturas, comprobantes, capturas y reclamos previos suele ser clave para acreditar el conflicto.',
      image: 'specialties/consumidor.svg', imageAlt: 'Ilustración jurídica vinculada al derecho del consumidor'
    },
    'danos-y-perjuicios': {
      icon: '◇', title: 'Daños y perjuicios', eyebrow: 'Responsabilidad civil',
      intro: 'Un daño puede generar derecho a reparación cuando existe responsabilidad y puede demostrarse el perjuicio sufrido.',
      description: 'Estudiamos los hechos, la responsabilidad de las partes, la prueba disponible y los distintos rubros indemnizatorios para diseñar un reclamo fundado y proporcional al daño.',
      services: ['Responsabilidad contractual y extracontractual','Daños materiales y lucro cesante','Daño moral y consecuencias no patrimoniales','Incumplimientos que generan perjuicios indemnizables','Negociaciones y mediaciones prejudiciales','Demandas judiciales de reparación integral'],
      whenToConsult: ['Sufriste un perjuicio por una conducta u omisión de otra persona o empresa.','Necesitás determinar quién resulta jurídicamente responsable.','Querés conocer qué daños pueden reclamarse y cómo probarlos.','Recibiste una propuesta de acuerdo y necesitás evaluarla.'],
      note: 'Los plazos para reclamar varían según el origen del daño, por lo que conviene analizar el caso con la documentación disponible.',
      image: 'specialties/danos.svg', imageAlt: 'Ilustración jurídica vinculada a daños y perjuicios'
    },
    'derecho-previsional': {
      icon: '⌁', title: 'Derecho previsional', eyebrow: 'Jubilaciones y seguridad social',
      intro: 'Asesoramiento en jubilaciones, haberes, reajustes y reclamos previsionales frente a organismos administrativos.',
      description: 'Revisamos antecedentes previsionales, resoluciones, recibos de haberes y documentación laboral para detectar posibles diferencias y definir si corresponde realizar un reclamo administrativo o judicial.',
      services: ['Análisis del haber jubilatorio inicial','Reajustes y actualización de haberes','Reconocimiento de servicios y aportes','Jubilaciones y pensiones','Reclamos frente a ANSES','Evaluación de vías administrativas y judiciales'],
      whenToConsult: ['Tenés dudas sobre cómo se calculó el haber inicial.','Detectás diferencias o falta de actualización en tus haberes.','ANSES rechazó o demoró un trámite previsional.','Necesitás revisar aportes o períodos de servicios.'],
      note: 'Para una revisión previsional precisa suelen ser necesarios la resolución de otorgamiento, recibos de haberes y antecedentes de aportes.',
      image: 'specialties/previsional.svg', imageAlt: 'Ilustración jurídica vinculada al derecho previsional'
    }
  };

  constructor(private readonly route: ActivatedRoute, private readonly router: Router) {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    const specialty = this.specialties[slug];
    if (!specialty) { this.router.navigateByUrl('/'); return; }
    this.specialty = specialty;
  }
}
