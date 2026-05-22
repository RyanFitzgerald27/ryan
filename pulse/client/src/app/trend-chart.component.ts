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
import { TrendPoint } from './models';

Chart.register(...registerables);

@Component({
  selector: 'app-trend-chart',
  template: '<canvas #canvas></canvas>',
  styles: [':host { display: block; position: relative; height: 300px; }'],
})
export class TrendChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() points: TrendPoint[] = [];
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
    const calls = this.points.map((p) => p.calls);
    const conversations = this.points.map((p) => p.conversations);

    if (this.chart) {
      this.chart.data.labels = labels;
      this.chart.data.datasets[0].data = calls;
      this.chart.data.datasets[1].data = conversations;
      this.chart.update();
      return;
    }

    const config: any = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Calls',
            data: calls,
            backgroundColor: 'rgba(13, 110, 253, 0.18)',
            borderColor: '#0d6efd',
            borderWidth: 1,
            borderRadius: 4,
            order: 2,
          },
          {
            label: 'Conversations',
            data: conversations,
            type: 'line',
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
          y: { beginAtZero: true, ticks: { precision: 0 } },
          x: { grid: { display: false } },
        },
        plugins: { legend: { position: 'bottom' } },
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
