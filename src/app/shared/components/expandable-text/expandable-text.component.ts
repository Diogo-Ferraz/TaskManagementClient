import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-expandable-text',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './expandable-text.component.html',
  styleUrl: './expandable-text.component.scss'
})
export class ExpandableTextComponent {
  @Input() text: string | null | undefined = '';
  @Input() maxLength = 120;

  expanded = false;

  get normalizedText(): string {
    return (this.text ?? '').trim();
  }

  get canExpand(): boolean {
    return this.normalizedText.length > this.maxLength;
  }

  get displayText(): string {
    if (!this.canExpand || this.expanded) {
      return this.normalizedText;
    }

    return `${this.normalizedText.slice(0, this.maxLength).trimEnd()}...`;
  }

  toggle(): void {
    this.expanded = !this.expanded;
  }
}
