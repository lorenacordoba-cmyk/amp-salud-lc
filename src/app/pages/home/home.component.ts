import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AssistantComponent } from '../../shared/assistant/assistant.component';
import { SiteFooterComponent } from '../../shared/site-footer/site-footer.component';
import { RevealDirective } from '../../shared/motion/reveal.directive';
import { PointerGlowDirective } from '../../shared/motion/pointer-glow.directive';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, AssistantComponent, SiteFooterComponent, RevealDirective, PointerGlowDirective],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  @ViewChild(AssistantComponent) private assistant?: AssistantComponent;
  mobileMenuOpen = false;
  toggleMobileMenu(): void { this.mobileMenuOpen = !this.mobileMenuOpen; }
  closeMobileMenu(): void { this.mobileMenuOpen = false; }
  openAssistant(): void { this.assistant?.openAssistant(); }
}
