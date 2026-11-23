import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WheelEntry, WheelMode } from '../../models/wheel.model';
import { SoundService } from '../../services/sound.service';
import { WheelStateService } from '../../services/wheel-state.service';

@Component({
  selector: 'app-controls-panel',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './controls-panel.html',
  styleUrl: './controls-panel.scss',
})
export class ControlsPanelComponent {
  readonly state = inject(WheelStateService);
  readonly sound = inject(SoundService);
  readonly quickEntry = signal('');
  readonly pastedEntries = signal('');
  readonly editingId = signal<string | null>(null);
  readonly editDraft = signal('');

  setMode(mode: WheelMode): void {
    this.state.setMode(mode);
  }

  addQuickEntry(): void {
    this.state.addEntries([this.quickEntry()]);
    this.quickEntry.set('');
  }

  addPastedEntries(): void {
    this.state.addEntries(this.pastedEntries().split(/\r?\n/));
    this.pastedEntries.set('');
  }

  beginEdit(entry: WheelEntry): void {
    this.editingId.set(entry.id);
    this.editDraft.set(entry.label);
  }

  saveEdit(entry: WheelEntry): void {
    this.state.updateEntry(entry.id, this.editDraft());
    this.editingId.set(null);
  }

  async copyShareLink(): Promise<void> {
    const link = this.state.createShareUrl();
    try {
      await navigator.clipboard.writeText(link);
      this.state.announce('Link della ruota copiato negli appunti.');
    } catch {
      this.state.announce('Link aggiornato nell’indirizzo. Copialo dalla barra del browser.');
    }
  }
}
