import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { WheelEntry } from '../../models/wheel.model';
import { SoundService } from '../../services/sound.service';

type PackPhase = 'closed' | 'opening' | 'browsing' | 'revealed';
type CardRarity = 'COMMON' | 'UNCOMMON' | 'RARE';

interface PackCard {
  id: string;
  label: string;
  rarity: CardRarity | 'SECRET RARE';
  winner: boolean;
}

@Component({
  selector: 'app-pokemon-pack',
  standalone: true,
  templateUrl: './pokemon-pack.html',
  styleUrl: './pokemon-pack.scss',
})
export class PokemonPackComponent implements OnChanges, OnDestroy {
  @Input() entries: WheelEntry[] = [];
  @Input() requestedWinner: WheelEntry | null = null;
  @Output() finished = new EventEmitter<WheelEntry>();
  @Output() openRequested = new EventEmitter<void>();

  phase: PackPhase = 'closed';
  cards: PackCard[] = [];
  discarded = 0;
  discarding = false;
  autoOpening = false;
  winner: WheelEntry | null = null;
  tiltX = 0;
  tiltY = 0;

  private timers: ReturnType<typeof setTimeout>[] = [];
  private finishEmitted = false;

  constructor(
    private readonly sound: SoundService,
    private readonly changeDetector: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['requestedWinner'] && this.requestedWinner) {
      this.openPack(this.requestedWinner);
    }
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  requestOpen(): void {
    if (this.phase !== 'closed' || this.entries.length === 0) return;
    this.openRequested.emit();
  }

  openPack(winner: WheelEntry): void {
    if (this.phase !== 'closed' || this.entries.length === 0) return;
    this.clearTimers();
    this.winner = winner;
    this.discarded = 0;
    this.discarding = false;
    this.autoOpening = false;
    this.finishEmitted = false;
    this.cards = this.createCards(winner);
    this.phase = 'opening';
    this.sound.packTear();

    const openingDuration = 680;
    this.schedule(() => {
      this.phase = 'browsing';
    }, openingDuration);
  }

  discardCard(): void {
    if (this.phase !== 'browsing' || this.discarded >= 4 || this.discarding) return;
    this.sound.cardSwipe();
    this.discarding = true;
    this.schedule(() => {
      this.discarding = false;
      this.discarded++;
      if (!this.autoOpening) return;
      this.schedule(() => {
        if (this.discarded < 4) this.discardCard();
        else this.revealWinner();
      }, 420);
    }, 330);
  }

  toggleAutoOpening(): void {
    if (this.phase !== 'browsing') return;
    this.autoOpening = !this.autoOpening;
    if (this.autoOpening && !this.discarding) {
      if (this.discarded < 4) this.discardCard();
      else this.revealWinner();
    }
  }

  revealWinner(): void {
    if (this.phase !== 'browsing' || this.discarded < 4) return;
    this.autoOpening = false;
    this.phase = 'revealed';
    this.sound.holoReveal();
    this.schedule(() => this.finish(), 1750);
  }

  continueToResult(): void {
    if (this.phase === 'revealed') this.finish();
  }

  updateTilt(event: PointerEvent): void {
    const target = event.currentTarget;
    if (!(target instanceof HTMLElement)) return;
    const bounds = target.getBoundingClientRect();
    this.tiltY = ((event.clientX - bounds.left) / bounds.width - 0.5) * 14;
    this.tiltX = (0.5 - (event.clientY - bounds.top) / bounds.height) * 14;
  }

  resetTilt(): void {
    this.tiltX = 0;
    this.tiltY = 0;
  }

  private createCards(winner: WheelEntry): PackCard[] {
    const others = this.entries.filter((entry) => entry.id !== winner.id);
    const rarities: CardRarity[] = ['COMMON', 'COMMON', 'UNCOMMON', 'RARE'];
    const regularCards = rarities.map((rarity, index) => {
      const entry = others[Math.floor(Math.random() * others.length)];
      return {
        id: `regular-${index}-${entry.id}`,
        label: entry.label,
        rarity,
        winner: false,
      };
    });
    return [
      ...regularCards,
      { id: `secret-${winner.id}`, label: winner.label, rarity: 'SECRET RARE', winner: true },
    ];
  }

  private finish(): void {
    if (this.finishEmitted || !this.winner) return;
    this.finishEmitted = true;
    const winner = this.winner;
    this.clearTimers();
    this.finished.emit(winner);
    this.phase = 'closed';
    this.winner = null;
    this.discarded = 0;
  }

  private schedule(callback: () => void, delay: number): void {
    const timer = setTimeout(() => {
      callback();
      this.changeDetector.detectChanges();
    }, delay);
    this.timers.push(timer);
  }

  private clearTimers(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers = [];
  }
}
