import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { DealTrendPoint } from './models';

Chart.register(...registerables);

function shortMoney(value: number): string {
  const v = Math.abs(value);
  if (v >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${value}`;
}

function fullMoney(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

@Component({
  selector: 'app-deals-chart',
  template: '<canvas #canvas></canvas>',
  styles: [':host { display: block; position: relative; height: 300px; }'],
})
export class DealsChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() points: DealTrendPoint[] = [];
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private chart?: Chart;
  private viewReady = false;

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.render();
  }

  ngOnChanges(): void {
    if (this.viewReady) this.render();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private render(): void {
    const labels = this.points.map((p) => this.shortLabel(p.date));
    const volume = this.points.map((p) => p.volume);
    const deals = this.points.map((p) => p.deals);

    if (this.chart) {
      this.chart.data.labels = labels;
      this.chart.data.datasets[0].data = volume;
      this.chart.data.datasets[1].data = deals;
      this.chart.update();
      return;
    }

    const config: any = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Won Volume',
            data: volume,
            yAxisID: 'y',
            backgroundColor: 'rgba(13, 110, 253, 0.2)',
            borderColor: '#0d6efd',
            borderWidth: 1,
            borderRadius: 4,
            order: 2,
          },
          {
            label: 'Deals Won',
            data: deals,
            type: 'line',
            yAxisID: 'y1',
            borderColor: '#198754',
            backgroundColor: '#198754',
            tension: 0.35,
            pointRadius: 3,
            borderWidth: 2,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          y: {
            position: 'left',
            beginAtZero: true,
            ticks: { callback: (v: number) => shortMoney(Number(v)) },
          },
          y1: {
            position: 'right',
            beginAtZero: true,
            grid: { drawOnChartArea: false },
            ticks: { precision: 0 },
          },
          x: { grid: { display: false } },
        },
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (ctx: any) => {
                const value = Number(ctx.parsed.y);
                return ctx.dataset.label === 'Won Volume'
                  ? `Won Volume: ${fullMoney(value)}`
                  : `Deals Won: ${value}`;
              },
            },
          },
        },
      },
    };

    this.chart = new Chart(this.canvasRef.nativeElement, config);
  }

  /** Turns a "YYYY-MM-DD" or "YYYY-MM" bucket key into a short axis label. */
  private shortLabel(date: string): string {
    const parts = date.split('-').map(Number);
    if (parts.length === 2) {
      return new Date(parts[0], parts[1] - 1, 1).toLocaleDateString(undefined, {
        month: 'short',
        year: '2-digit',
      });
    }
    return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString(
      undefined,
      { month: 'short', day: 'numeric' },
    );
  }
}
