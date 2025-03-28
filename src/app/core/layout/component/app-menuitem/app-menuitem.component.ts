import { animate, state, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Component, HostBinding, Input, OnInit, ViewEncapsulation } from '@angular/core';
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
  @Input() item!: MenuItem;

  @Input() index!: number;

  @Input() @HostBinding('class.layout-root-menuitem') root!: boolean;

  @Input() parentKey!: string;

  active = false;

  key: string = '';

  ngOnInit(): void {
    
  }

  @HostBinding('class.active-menuitem')
    get activeClass() {
        return this.active && !this.root;
    }

  get submenuAnimation() {
    return this.root ? 'expanded' : this.active ? 'expanded' : 'collapsed';
  }
}
