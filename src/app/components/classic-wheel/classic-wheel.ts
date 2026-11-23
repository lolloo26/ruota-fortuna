import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, OnDestroy, Output, ViewChild } from '@angular/core';
import { WheelEntry } from '../../models/wheel.model';
import { SoundService } from '../../services/sound.service';

const TAU = Math.PI * 2;
const POINTER_ANGLE = -Math.PI / 2;
const FIRST_SLICE_ANGLE = -Math.PI / 2;

export function getEntryUnderPin(rotation: number, entries: WheelEntry[]): WheelEntry | null {
  if (entries.length === 0) return null;
  const segment = TAU / entries.length;
  const wheelAngle = ((POINTER_ANGLE - rotation - FIRST_SLICE_ANGLE) % TAU + TAU) % TAU;
  return entries[Math.floor(wheelAngle / segment)] ?? null;
}

@Component({
  selector: 'app-classic-wheel',
  standalone: true,
  templateUrl: './classic-wheel.html',
  styleUrl: './classic-wheel.scss',
})
export class ClassicWheelComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() entries: WheelEntry[] = [];
  @Output() finished = new EventEmitter<WheelEntry>();
  @ViewChild('wheelCanvas') private canvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('pin') private pinRef?: ElementRef<HTMLElement>;

  private context: CanvasRenderingContext2D | null = null;
  private rotation = 0;
  private frame = 0;
  private initialized = false;
  private previousSlice = 0;
  private resizeObserver?: ResizeObserver;
  private spinningEntries: WheelEntry[] | null = null;

  constructor(private readonly sound: SoundService) {}

  ngAfterViewInit(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    this.context = canvas.getContext('2d');
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.draw());
      this.resizeObserver.observe(canvas);
    }
    this.initialized = true;
    this.draw();
  }

  ngOnChanges(): void {
    if (this.initialized) this.draw();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frame);
    this.resizeObserver?.disconnect();
  }

  startSpin(winner: WheelEntry, strength: number): void {
    if (!this.entries.length || !this.context) return;
    cancelAnimationFrame(this.frame);
    const index = this.entries.findIndex((entry) => entry.id === winner.id);
    if (index < 0) return;
    this.spinningEntries = [...this.entries];
    const segment = TAU / this.entries.length;
    const targetBase = POINTER_ANGLE - (FIRST_SLICE_ANGLE + (index + 0.5) * segment);
    const currentNormalized = ((this.rotation % TAU) + TAU) % TAU;
    const targetNormalized = ((targetBase % TAU) + TAU) % TAU;
    const alignment = (targetNormalized - currentNormalized + TAU) % TAU;
    const turns = 4 + (strength / 100) * 7;
    const startRotation = this.rotation;
    const endRotation = this.rotation + alignment + turns * Math.PI * 2;
    const duration = 2600 + (strength / 100) * 2600;
    const start = performance.now();
    this.previousSlice = Math.floor((this.rotation + Math.PI / 2) / segment);

    const animate = (now: number): void => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 4);
      this.rotation = startRotation + (endRotation - startRotation) * eased;
      const slice = Math.floor((this.rotation + Math.PI / 2) / segment);
      if (slice !== this.previousSlice) {
        this.sound.tick(1 - progress);
        this.previousSlice = slice;
        this.bouncePin();
      }
      this.draw();
      if (progress < 1) {
        this.frame = requestAnimationFrame(animate);
      } else {
        this.rotation = endRotation;
        this.draw();
        this.sound.victory();
        const landedEntry = getEntryUnderPin(this.rotation, this.spinningEntries ?? this.entries);
        this.spinningEntries = null;
        this.finished.emit(landedEntry ?? winner);
      }
    };

    this.frame = requestAnimationFrame(animate);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.draw();
  }

  private draw(): void {
    const canvas = this.canvasRef?.nativeElement;
    const context = this.context;
    if (!canvas || !context) return;
    const rect = canvas.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    if (size <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const center = size / 2;
    const radius = center - 13;
    context.clearRect(0, 0, size, size);
    context.save();
    context.translate(center, center);
    context.rotate(this.rotation);
    const entries = this.spinningEntries ?? this.entries;
    const segment = entries.length ? TAU / entries.length : 0;
    const colors = [
      '#00d9ff', '#1747ff', '#a100ff', '#ff00a8',
      '#ff253a', '#ff6a00', '#f5e900', '#00f078',
      '#00ffc8', '#00a2ff', '#7b2cff', '#ff315f',
    ];

    entries.forEach((entry, index) => {
      const start = -Math.PI / 2 + index * segment;
      const end = start + segment;
      context.beginPath();
      context.moveTo(0, 0);
      context.arc(0, 0, radius, start, end);
      context.closePath();
      context.fillStyle = colors[index % colors.length];
      context.fill();
      context.strokeStyle = '#d4c8ad';
      context.globalAlpha = 0.2;
      context.lineWidth = 1.4;
      context.stroke();
      context.globalAlpha = 1;

      context.save();
      context.rotate(start + segment / 2);
      context.translate(radius * 0.67, 0);
      context.rotate(Math.PI / 2);
      const needsDarkLabel = [0, 5, 6, 7, 8].includes(index % colors.length);
      context.fillStyle = entry.excluded ? '#9ba4ad' : needsDarkLabel ? '#101018' : '#ffffff';
      context.font = `600 ${Math.max(9, Math.min(14, size / 28))}px Inter, Arial, sans-serif`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      const label = entry.label.length > 16 ? `${entry.label.slice(0, 15)}…` : entry.label;
      context.fillText(label, 0, 0, Math.max(34, radius * segment * 0.88));
      context.restore();
    });

    const hub = context.createRadialGradient(-7, -9, 2, 0, 0, radius * 0.18);
    hub.addColorStop(0, '#f1ead9');
    hub.addColorStop(0.16, '#9d9a8b');
    hub.addColorStop(0.36, '#343b43');
    hub.addColorStop(1, '#11171d');
    context.beginPath();
    context.arc(0, 0, radius * 0.15, 0, Math.PI * 2);
    context.fillStyle = hub;
    context.fill();
    context.strokeStyle = '#d7bd85';
    context.lineWidth = 3;
    context.stroke();
    context.restore();
  }

  private bouncePin(): void {
    const pin = this.pinRef?.nativeElement;
    if (!pin) return;
    pin.classList.remove('bounce');
    void pin.offsetWidth;
    pin.classList.add('bounce');
  }
}
