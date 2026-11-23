import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, signal } from '@angular/core';
import { WheelEntry } from '../../models/wheel.model';
import { SoundService } from '../../services/sound.service';

type ClawPhase = 'idle' | 'moving' | 'dropping' | 'grabbing' | 'lifting' | 'returning' | 'releasing' | 'reveal';

interface Capsule {
  id: string;
  left: number;
  bottom: number;
  color: string;
  target: boolean;
}

const CAPSULE_COLORS = ['#ff4e83', '#5bc9ff', '#a16bff', '#ffc64b', '#56edbf', '#ff8955'];

@Component({
  selector: 'app-claw-machine',
  standalone: true,
  templateUrl: './claw-machine.html',
  styleUrl: './claw-machine.scss',
})
export class ClawMachineComponent implements OnChanges, OnDestroy {
  @Input() entries: WheelEntry[] = [];
  @Input() requestedWinner: WheelEntry | null = null;
  @Output() openRequested = new EventEmitter<void>();
  @Output() finished = new EventEmitter<WheelEntry>();

  readonly phase = signal<ClawPhase>('idle');
  readonly capsules = signal<Capsule[]>([]);
  readonly clawX = signal(50);
  readonly targetLabel = signal('');
  readonly prizeLabel = signal('');
  readonly motorRunning = signal(false);

  private winner: WheelEntry | null = null;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private finishEmitted = false;

  constructor(
    private readonly sound: SoundService,
    private readonly changeDetector: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['requestedWinner'] && this.requestedWinner) {
      this.beginAnimation(this.requestedWinner);
    } else if (changes['entries'] && this.phase() === 'idle') {
      this.createCapsules();
    }
  }

  ngOnDestroy(): void {
    this.clearTimers();
    this.sound.stopCraneMotor();
  }

  requestExtraction(): void {
    if (this.phase() !== 'idle' && this.phase() !== 'reveal') return;
    if (this.entries.length === 0) return;
    this.openRequested.emit();
  }

  beginAnimation(winner: WheelEntry): void {
    if (this.phase() !== 'idle' && this.phase() !== 'reveal') return;
    this.clearTimers();
    this.winner = winner;
    this.finishEmitted = false;
    this.targetLabel.set('');
    this.prizeLabel.set('');
    this.createCapsules(winner);

    const target = this.capsules().find((capsule) => capsule.target);
    this.clawX.set(target?.left ?? 54);
    this.phase.set('moving');
    this.motorRunning.set(true);
    this.sound.startCraneMotor();
    this.schedule(() => {
      this.phase.set('dropping');
      this.schedule(() => {
        this.phase.set('grabbing');
        this.sound.clawSnap();
        this.schedule(() => {
          this.phase.set('lifting');
          this.schedule(() => {
            this.phase.set('returning');
            this.clawX.set(12);
            this.schedule(() => {
              this.phase.set('releasing');
              this.schedule(() => {
                this.phase.set('reveal');
                this.motorRunning.set(false);
                this.sound.stopCraneMotor();
                this.sound.capsulePop();
                this.prizeLabel.set(winner.label);
                this.targetLabel.set(winner.label);
                this.schedule(() => this.finish(), 1150);
              }, 400);
            }, 1200);
          }, 780);
        }, 330);
      }, 780);
    }, 1120);
  }

  private createCapsules(winner?: WheelEntry): void {
    const visibleCount = Math.min(18, Math.max(8, this.entries.length + 4));
    const targetIndex = winner
      ? Math.abs(this.entries.findIndex((entry) => entry.id === winner.id)) % visibleCount
      : -1;
    this.capsules.set(
      Array.from({ length: visibleCount }, (_, index) => ({
        id: `capsule-${index}`,
        left: 5 + ((index * 37 + 13) % 89),
        bottom: 5 + ((index * 19 + Math.floor(index / 3) * 7) % 27),
        color: CAPSULE_COLORS[index % CAPSULE_COLORS.length],
        target: index === targetIndex,
      })),
    );
  }

  private finish(): void {
    if (this.finishEmitted || !this.winner) return;
    this.finishEmitted = true;
    const winner = this.winner;
    this.clearTimers();
    this.finished.emit(winner);
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
