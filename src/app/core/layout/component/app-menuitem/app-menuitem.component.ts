import { animate, state, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostBinding, Input, OnInit, inject, ViewEncapsulation } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { RippleModule } from 'primeng/ripple';

@Component({
  selector: '[app-menuitem]',
  standalone: true,
  imports: [CommonModule, RouterModule, RippleModule],
  templateUrl: './app-menuitem.component.html',
  styleUrl: './app-menuitem.component.scss',
  encapsulation: ViewEncapsulation.None,
  animations: [
    trigger('children', [
      state(
        'collapsed',
        style({
          height: '0'
        })
      ),
      state(
        'expanded',
        style({
          height: '*'
        })
      ),
      transition('collapsed <=> expanded', animate('400ms cubic-bezier(0.86, 0, 0.07, 1)'))
    ])
  ]
})
export class AppMenuitemComponent implements OnInit {
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  @Input() item!: MenuItem;

  @Input() index!: number;

  @Input() @HostBinding('class.layout-root-menuitem') root!: boolean;

  @Input() parentKey!: string;

  active = false;

  key: string = '';

  ngOnInit(): void {
    
  }

  onItemClick(event: MouseEvent): void {
    if (!this.item.items || this.item.items.length === 0) {
      return;
    }

    event.preventDefault();
    this.active = !this.active;

    if (this.active) {
      this.scrollExpandedChildrenIntoView();
    }
  }

  @HostBinding('class.active-menuitem')
    get activeClass() {
        return this.active && !this.root;
    }

  get submenuAnimation() {
    return this.root ? 'expanded' : this.active ? 'expanded' : 'collapsed';
  }

  private scrollExpandedChildrenIntoView(): void {
    window.setTimeout(() => {
      const lastChild = this.elementRef.nativeElement.querySelector('ul > li:last-child');
      if (lastChild instanceof HTMLElement) {
        lastChild.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest'
        });
        return;
      }

      this.elementRef.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }, 420);
  }
}
