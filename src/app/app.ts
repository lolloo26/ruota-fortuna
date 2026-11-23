import { Component, HostListener, ViewChild, inject, signal } from '@angular/core';
import { ClassicWheelComponent } from './components/classic-wheel/classic-wheel';
import { ClawMachineComponent } from './components/claw-machine/claw-machine';
import { CsgoWheelComponent } from './components/csgo-wheel/csgo-wheel';
import { ControlsPanelComponent } from './components/controls-panel/controls-panel';
import { PokemonPackComponent } from './components/pokemon-pack/pokemon-pack';
import { WinnerModalComponent } from './components/winner-modal/winner-modal';
import { SoundService } from './services/sound.service';
import { WheelStateService } from './services/wheel-state.service';

@Component({
  imports: [ClassicWheelComponent, ClawMachineComponent, CsgoWheelComponent, ControlsPanelComponent, PokemonPackComponent, WinnerModalComponent],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  readonly state = inject(WheelStateService);
  readonly sound = inject(SoundService);
  readonly chargeProgress = signal(0);
  readonly charging = signal(false);
  readonly requestedPokemonWinner = signal<Parameters<WheelStateService['completeSpin']>[0] | null>(null);
  readonly requestedClawWinner = signal<Parameters<WheelStateService['completeSpin']>[0] | null>(null);

  @ViewChild(ClassicWheelComponent) private classicWheel?: ClassicWheelComponent;
  @ViewChild(CsgoWheelComponent) private csgoWheel?: CsgoWheelComponent;

  private chargeStart = 0;
  private chargeFrame = 0;

  get chargeStrength(): number {
    return Math.round(10 + this.chargeProgress() * 90);
  }

  openClawMachine(): void {
    if (this.state.mode() !== 'claw' || this.state.isSpinning()) return;
    this.launch(this.state.strength());
  }

  startCharging(event?: Event): void {
    event?.preventDefault();
    if (this.state.mode() === 'pokemon' || this.state.mode() === 'claw' ||
      this.state.isSpinning() || this.state.activeCount() === 0 || this.charging()) return;
    this.charging.set(true);
    this.chargeProgress.set(0);
    this.sound.startCharge();
    this.chargeStart = performance.now();
    const fill = (now: number): void => {
      const progress = Math.min(1, (now - this.chargeStart) / 2200);
      this.chargeProgress.set(progress);
      this.sound.updateCharge(progress);
      if (progress < 1 && this.charging()) this.chargeFrame = requestAnimationFrame(fill);
    };
    this.chargeFrame = requestAnimationFrame(fill);
  }

  releaseCharge(event?: Event): void {
    event?.preventDefault();
    if (!this.charging()) return;
    const strength = this.chargeStrength;
    cancelAnimationFrame(this.chargeFrame);
    this.charging.set(false);
    this.sound.stopCharge();
    this.chargeProgress.set(0);
    this.launch(strength);
  }

  setStrength(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.state.setStrength(Number(input.value));
  }

  onChargeKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.startCharging();
    }
  }

  onChargeKeyUp(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.releaseCharge();
    }
  }

  onSpinFinished(entry: Parameters<WheelStateService['completeSpin']>[0]): void {
    this.state.completeSpin(entry);
    this.requestedPokemonWinner.set(null);
    this.requestedClawWinner.set(null);
  }

  openPokemonPack(): void {
    if (this.state.mode() !== 'pokemon' || this.state.isSpinning()) return;
    this.launch(this.state.strength());
  }

  @HostListener('window:blur')
  stopChargeOnBlur(): void {
    if (this.charging()) this.releaseCharge();
  }

  private launch(strength: number): void {
    const entries = this.state.activeEntries();
    if (entries.length === 0) {
      this.state.announce('Aggiungi almeno una voce per avviare l’estrazione.');
      return;
    }
    if (this.state.mode() !== 'pokemon') this.state.setStrength(strength);
    const winner = entries[Math.floor(Math.random() * entries.length)];
    if (entries.length === 1) {
      this.state.announce('C’è una sola voce attiva: estrazione diretta.');
      this.state.beginSpin();
      this.sound.victory();
      this.state.completeSpin(winner);
      return;
    }
    this.state.beginSpin();
    if (this.state.mode() === 'classic') {
      this.classicWheel?.startSpin(winner, strength);
    } else if (this.state.mode() === 'csgo') {
      this.csgoWheel?.startSpin(winner, strength);
    } else if (this.state.mode() === 'pokemon') {
      this.requestedPokemonWinner.set(winner);
    } else {
      this.requestedClawWinner.set(winner);
    }
  }
}
