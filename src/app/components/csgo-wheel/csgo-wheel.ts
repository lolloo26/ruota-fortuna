import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, ViewChild } from '@angular/core';
import { ReelCard, WheelEntry } from '../../models/wheel.model';
import { SoundService } from '../../services/sound.service';

const WINNER_INDEX = 54;
const CARD_STEP = 166;

@Component({
  selector: 'app-csgo-wheel',
  standalone: true,
  templateUrl: './csgo-wheel.html',
  styleUrl: './csgo-wheel.scss',
})
export class CsgoWheelComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() entries: WheelEntry[] = [];
  @Output() finished = new EventEmitter<WheelEntry>();
  @ViewChild('reelViewport') private viewportRef?: ElementRef<HTMLDivElement>;

  cards: ReelCard[] = [];
  revealed = false;
  spinning = false;
  winnerLabel = '';
  private frame = 0;
  private initialized = false;
  private resizeObserver?: ResizeObserver;

  constructor(private readonly sound: SoundService) {}

  ngAfterViewInit(): void {
    const viewport = this.viewportRef?.nativeElement;
    if (!viewport) return;
    this.initialized = true;
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.updateTransitionLayout());
      this.resizeObserver.observe(viewport);
    }
    this.generateCards();
  }

  ngOnChanges(): void {
    if (this.initialized) this.generateCards();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frame);
    this.resizeObserver?.disconnect();
  }

  startSpin(winner: WheelEntry, strength: number): void {
    const viewport = this.viewportRef?.nativeElement;
    if (!viewport || !this.cards.length) return;
    cancelAnimationFrame(this.frame);
    this.spinning = true;
    this.revealed = false;
    this.winnerLabel = winner.label;
    const track = viewport.querySelector<HTMLElement>('.reel-track');
    const firstCard = track?.firstElementChild;
    const cardStep = firstCard instanceof HTMLElement && track
      ? firstCard.getBoundingClientRect().width + Number.parseFloat(getComputedStyle(track).gap)
      : CARD_STEP;
    const offset = (Math.random() - 0.5) * Math.min(34, cardStep * 0.18);
    const destination = -(WINNER_INDEX * cardStep - viewport.clientWidth / 2 + cardStep / 2 + offset);
    const duration = 4700 + (strength / 100) * 3200;
    const start = performance.now();
    const startX = 0;
    let lastStep = 0;
    const animate = (now: number): void => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 5);
      const x = startX + destination * eased;
      this.setTransform(x);
      const currentStep = Math.floor(Math.abs(x) / CARD_STEP);
      if (currentStep !== lastStep) {
        this.sound.tick(1 - progress);
        lastStep = currentStep;
      }
      if (progress < 1) {
        this.frame = requestAnimationFrame(animate);
      } else {
        this.setTransform(destination);
        this.spinning = false;
        this.revealed = true;
        this.sound.victory(true);
        window.setTimeout(() => this.finished.emit(winner), 850);
      }
    };
    this.frame = requestAnimationFrame(animate);
  }

  private generateCards(): void {
    if (!this.entries.length) {
      this.cards = [];
      return;
    }
    const rarities: ReelCard['rarity'][] = ['mil-spec', 'mil-spec', 'restricted', 'mil-spec', 'classified', 'restricted', 'covert'];
    this.cards = Array.from({ length: 68 }, (_, index) => {
      if (index === WINNER_INDEX) {
        return { id: `gold-${Date.now()}`, label: '★ ??? ★', rarity: 'gold', isWinner: true };
      }
      const entry = this.entries[Math.floor(Math.random() * this.entries.length)];
      const rarity = rarities[Math.floor(Math.random() * rarities.length)];
      return { id: `${index}-${entry.id}`, label: entry.label, rarity, isWinner: false };
    });
  }

  private setTransform(x: number): void {
    const track = this.viewportRef?.nativeElement.querySelector<HTMLElement>('.reel-track');
    if (track) track.style.transform = `translate3d(${x}px, 0, 0)`;
  }

  private updateTransitionLayout(): void {
    if (!this.spinning) this.setTransform(0);
  }
}
