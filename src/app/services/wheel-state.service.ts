import { computed, Injectable, signal } from '@angular/core';
import { WheelConfig, WheelEntry, WheelMode } from '../models/wheel.model';

const SAMPLE_ENTRIES = [
  'Alessia',
  'Lorenzo',
  'Matteo',
  'Sofia',
  'Gabriele',
  'Giulia',
  'Andrea',
  'Francesca',
  'Davide',
  'Chiara',
  'Marco',
  'Elena',
];

@Injectable({ providedIn: 'root' })
export class WheelStateService {
  private readonly toastMessage = signal('');
  private toastTimeout: ReturnType<typeof setTimeout> | undefined;
  private readonly config = signal<WheelConfig>(this.readInitialConfig());

  readonly entries = computed(() => this.config().entries);
  readonly activeEntries = computed(() => this.config().entries.filter((entry) => !entry.excluded));
  readonly activeCount = computed(() => this.activeEntries().length);
  readonly mode = computed(() => this.config().mode);
  readonly autoExclude = computed(() => this.config().autoExclude);
  readonly strength = computed(() => this.config().strength);
  readonly isSpinning = signal(false);
  readonly winner = signal<WheelEntry | null>(null);
  readonly toast = this.toastMessage.asReadonly();

  addEntries(values: string[]): void {
    const labels = values.map((value) => value.trim()).filter(Boolean);
    if (labels.length === 0) return;

    this.updateConfig((config) => ({
      ...config,
      entries: [
        ...config.entries,
        ...labels.map((label) => ({ id: this.createId(), label, excluded: false })),
      ],
    }));
  }

  updateEntry(id: string, label: string): void {
    const normalized = label.trim();
    if (!normalized) return;
    this.updateConfig((config) => ({
      ...config,
      entries: config.entries.map((entry) => entry.id === id ? { ...entry, label: normalized } : entry),
    }));
  }

  removeEntry(id: string): void {
    this.updateConfig((config) => ({
      ...config,
      entries: config.entries.filter((entry) => entry.id !== id),
    }));
  }

  toggleExcluded(id: string): void {
    this.updateConfig((config) => ({
      ...config,
      entries: config.entries.map((entry) => entry.id === id ? { ...entry, excluded: !entry.excluded } : entry),
    }));
  }

  restoreEntries(): void {
    this.updateConfig((config) => ({
      ...config,
      entries: config.entries.map((entry) => ({ ...entry, excluded: false })),
    }));
  }

  setMode(mode: WheelMode): void {
    this.updateConfig((config) => ({ ...config, mode }));
  }

  setAutoExclude(autoExclude: boolean): void {
    this.updateConfig((config) => ({ ...config, autoExclude }));
  }

  setStrength(strength: number): void {
    const bounded = Math.max(10, Math.min(100, Math.round(strength)));
    this.updateConfig((config) => ({ ...config, strength: bounded }));
  }

  beginSpin(): void {
    this.isSpinning.set(true);
    this.winner.set(null);
  }

  completeSpin(entry: WheelEntry): void {
    if (this.autoExclude()) {
      this.updateConfig((config) => ({
        ...config,
        entries: config.entries.map((item) => item.id === entry.id ? { ...item, excluded: true } : item),
      }));
    }
    this.winner.set(entry);
    this.isSpinning.set(false);
  }

  keepWinner(): void {
    const winner = this.winner();
    if (winner) {
      this.updateConfig((config) => ({
        ...config,
        entries: config.entries.map((entry) => entry.id === winner.id ? { ...entry, excluded: false } : entry),
      }));
    }
    this.winner.set(null);
  }

  excludeWinner(): void {
    const winner = this.winner();
    if (winner) {
      this.updateConfig((config) => ({
        ...config,
        entries: config.entries.map((entry) => entry.id === winner.id ? { ...entry, excluded: true } : entry),
      }));
    }
    this.winner.set(null);
  }

  announce(message: string): void {
    this.toastMessage.set(message);
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => this.toastMessage.set(''), 3200);
  }

  createShareUrl(): string {
    const encoded = this.encodeConfig(this.config());
    const url = new URL(window.location.href);
    url.searchParams.set('wheel', encoded);
    window.history.replaceState(null, '', url);
    return url.toString();
  }

  private updateConfig(update: (config: WheelConfig) => WheelConfig): void {
    this.config.update(update);
  }

  private readInitialConfig(): WheelConfig {
    const urlValue = new URLSearchParams(window.location.search).get('wheel');
    if (urlValue) {
      try {
        const parsed: unknown = JSON.parse(this.decodeConfig(urlValue));
        if (this.isWheelConfig(parsed)) return parsed;
        this.announce('Il link contiene una configurazione ruota non valida.');
      } catch {
        this.announce('Impossibile leggere la configurazione dal link.');
      }
    }

    return {
      entries: SAMPLE_ENTRIES.map((label) => ({ id: this.createId(), label, excluded: false })),
      mode: 'classic',
      autoExclude: false,
      strength: 65,
    };
  }

  private encodeConfig(config: WheelConfig): string {
    const bytes = new TextEncoder().encode(JSON.stringify(config));
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  }

  private decodeConfig(encoded: string): string {
    const normalized = encoded.replaceAll('-', '+').replaceAll('_', '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  private isWheelConfig(value: unknown): value is WheelConfig {
    if (typeof value !== 'object' || value === null) return false;
    const candidate = value as Partial<WheelConfig>;
    return (
      Array.isArray(candidate.entries) &&
      candidate.entries.every((entry) =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof entry.id === 'string' &&
        typeof entry.label === 'string' &&
        typeof entry.excluded === 'boolean',
      ) &&
      (candidate.mode === 'classic' || candidate.mode === 'csgo' || candidate.mode === 'pokemon' || candidate.mode === 'claw') &&
      typeof candidate.autoExclude === 'boolean' &&
      typeof candidate.strength === 'number' &&
      Number.isFinite(candidate.strength)
    );
  }

  private createId(): string {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}
