import { Directive, ElementRef, HostListener, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appPointerGlow]',
  standalone: true
})
export class PointerGlowDirective {
  private readonly canMove = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  constructor(private readonly element: ElementRef<HTMLElement>, private readonly renderer: Renderer2) {
    this.renderer.addClass(this.element.nativeElement, 'js-pointer-glow');
  }

  @HostListener('pointermove', ['$event'])
  onPointerMove(event: PointerEvent): void {
    if (!this.canMove) return;
    const el = this.element.nativeElement;
    const rect = el.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    const rx = ((event.clientY - rect.top) / rect.height - .5) * -2.1;
    const ry = ((event.clientX - rect.left) / rect.width - .5) * 2.1;
    this.renderer.setStyle(el, '--pointer-x', `${x}%`);
    this.renderer.setStyle(el, '--pointer-y', `${y}%`);
    this.renderer.setStyle(el, '--tilt-x', `${rx}deg`);
    this.renderer.setStyle(el, '--tilt-y', `${ry}deg`);
  }

  @HostListener('pointerleave')
  onPointerLeave(): void {
    const el = this.element.nativeElement;
    this.renderer.setStyle(el, '--tilt-x', '0deg');
    this.renderer.setStyle(el, '--tilt-y', '0deg');
  }
}
