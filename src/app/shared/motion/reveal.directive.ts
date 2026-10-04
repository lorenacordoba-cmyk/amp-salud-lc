import { AfterViewInit, Directive, ElementRef, Input, OnDestroy, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appReveal]',
  standalone: true
})
export class RevealDirective implements AfterViewInit, OnDestroy {
  @Input() revealDelay = 0;
  private observer?: IntersectionObserver;

  constructor(private readonly element: ElementRef<HTMLElement>, private readonly renderer: Renderer2) {}

  ngAfterViewInit(): void {
    const el = this.element.nativeElement;
    this.renderer.addClass(el, 'js-reveal');
    this.renderer.setStyle(el, '--reveal-delay', `${this.revealDelay}ms`);

    if (typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.renderer.addClass(el, 'is-visible');
      return;
    }

    this.observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        this.renderer.addClass(el, 'is-visible');
        this.observer?.unobserve(el);
      }
    }, { threshold: 0.14, rootMargin: '0px 0px -7% 0px' });

    this.observer.observe(el);
  }

  ngOnDestroy(): void { this.observer?.disconnect(); }
}
