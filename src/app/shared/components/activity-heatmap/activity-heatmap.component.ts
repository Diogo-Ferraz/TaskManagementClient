import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild
} from '@angular/core';

export interface HeatmapDayCell {
  date: Date;
  count: number;
  intensityLevel: number;
}

interface HeatmapPoint {
  day: HeatmapDayCell;
  x: number;
  y: number;
  size: number;
}

@Component({
  selector: 'app-activity-heatmap',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './activity-heatmap.component.html',
  styleUrl: './activity-heatmap.component.scss'
})
export class ActivityHeatmapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('heatmapCanvas')
  private readonly canvasRef?: ElementRef<HTMLCanvasElement>;

  @ViewChild('canvasWrap')
  private readonly canvasWrapRef?: ElementRef<HTMLDivElement>;

  @Input() weeks: HeatmapDayCell[][] = [];
  @Input() totalActivities = 0;

  hoverText = '';

  private resizeObserver?: ResizeObserver;
  private drawPoints: HeatmapPoint[] = [];

  ngAfterViewInit(): void {
    const wrap = this.canvasWrapRef?.nativeElement;
    if (!wrap) {
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      this.renderHeatmap();
    });
    this.resizeObserver.observe(wrap);
    this.renderHeatmap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['weeks'] || changes['totalActivities']) {
      this.renderHeatmap();
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  onCanvasMouseMove(event: MouseEvent): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const active = this.drawPoints.find(
      (point) => x >= point.x && x <= point.x + point.size && y >= point.y && y <= point.y + point.size
    );

    if (!active) {
      this.hoverText = '';
      return;
    }

    const date = active.day.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const activityText = active.day.count === 1 ? 'update' : 'updates';
    this.hoverText = `${date} • ${active.day.count} ${activityText}`;
  }

  onCanvasMouseLeave(): void {
    this.hoverText = '';
  }

  get legendRanges(): Array<{ color: string; label: string }> {
    const palette = this.resolvePalette();
    return [
      { color: palette[1], label: '1-2' },
      { color: palette[2], label: '3-5' },
      { color: palette[3], label: '6-8' },
      { color: palette[4], label: '9+' }
    ];
  }

  private renderHeatmap(): void {
    const canvas = this.canvasRef?.nativeElement;
    const wrap = this.canvasWrapRef?.nativeElement;
    if (!canvas || !wrap) {
      return;
    }

    const width = Math.floor(wrap.clientWidth);
    const height = Math.floor(wrap.clientHeight);
    if (width <= 0 || height <= 0) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const cols = Math.max(1, this.weeks.length);
    const rows = 7;
    const horizontalGap = 4;
    const verticalGap = 4;
    const gridWidth = width - horizontalGap * Math.max(0, cols - 1);
    const gridHeight = height - verticalGap * Math.max(0, rows - 1);
    const cellWidth = gridWidth / cols;
    const cellHeight = gridHeight / rows;
    const cellSize = Math.max(4, Math.floor(Math.min(cellWidth, cellHeight)));
    const totalGridWidth = cellSize * cols + horizontalGap * Math.max(0, cols - 1);
    const totalGridHeight = cellSize * rows + verticalGap * Math.max(0, rows - 1);
    const offsetX = Math.max(0, (width - totalGridWidth) / 2);
    const offsetY = Math.max(0, (height - totalGridHeight) / 2);
    const radius = Math.max(2, Math.floor(cellSize * 0.2));
    const palette = this.resolvePalette();

    this.drawPoints = [];
    for (let col = 0; col < cols; col++) {
      const week = this.weeks[col] ?? [];
      for (let row = 0; row < rows; row++) {
        const day = week[row];
        if (!day) {
          continue;
        }

        const x = offsetX + col * (cellSize + horizontalGap);
        const y = offsetY + row * (cellSize + verticalGap);
        const color = palette[Math.max(0, Math.min(4, day.intensityLevel))];

        this.roundedRect(ctx, x, y, cellSize, cellSize, radius);
        ctx.fillStyle = color;
        ctx.fill();

        if (day.intensityLevel > 0) {
          this.roundedRect(ctx, x + 0.5, y + 0.5, cellSize - 1, cellSize - 1, radius);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        this.drawPoints.push({ day, x, y, size: cellSize });
      }
    }
  }

  private resolvePalette(): string[] {
    const style = getComputedStyle(document.documentElement);
    const fallback = ['#edf1f5', '#b8d8ff', '#91c2ff', '#6eaef8', '#478ef2'];

    return [
      this.readVar(style, '--surface-200', fallback[0]),
      this.readFirstDefinedVar(style, ['--p-primary-200', '--primary-200'], fallback[1]),
      this.readFirstDefinedVar(style, ['--p-primary-300', '--primary-300'], fallback[2]),
      this.readFirstDefinedVar(style, ['--p-primary-400', '--primary-400'], fallback[3]),
      this.readFirstDefinedVar(style, ['--p-primary-color', '--primary-color'], fallback[4])
    ];
  }

  private readFirstDefinedVar(style: CSSStyleDeclaration, tokens: string[], fallback: string): string {
    for (const token of tokens) {
      const value = style.getPropertyValue(token).trim();
      if (value) {
        return value;
      }
    }

    return fallback;
  }

  private readVar(style: CSSStyleDeclaration, token: string, fallback: string): string {
    const value = style.getPropertyValue(token).trim();
    return value || fallback;
  }

  private roundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
