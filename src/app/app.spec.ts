import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { App } from './app';
import { getEntryUnderPin } from './components/classic-wheel/classic-wheel';
import { PokemonPackComponent } from './components/pokemon-pack/pokemon-pack';
import { WheelEntry } from './models/wheel.model';
import { WheelStateService } from './services/wheel-state.service';

const entries: WheelEntry[] = [
  { id: 'one', label: 'Uno', excluded: false },
  { id: 'two', label: 'Due', excluded: false },
  { id: 'three', label: 'Tre', excluded: false },
  { id: 'four', label: 'Quattro', excluded: false },
];

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
    const state = TestBed.inject(WheelStateService);
    if (state.isSpinning()) state.completeSpin(state.activeEntries()[0]);
    if (state.winner()) state.keepWinner();
    state.setMode('classic');
    state.setAutoExclude(false);
    state.restoreEntries();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the wheel title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Chi sarà il prossimo?');
  });

  it('should allow selecting the Pokémon pack mode', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const pokemonTab = Array.from(compiled.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
      .find((button) => button.textContent?.includes('Pacchetto Pokémon'));

    expect(pokemonTab).toBeTruthy();
    pokemonTab?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.state.mode()).toBe('pokemon');
    expect(pokemonTab?.getAttribute('aria-selected')).toBe('true');
    expect(compiled.querySelector('app-pokemon-pack')).toBeTruthy();
  });

  it('should open the Pokémon pack with one click on the pack', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const pokemonTab = Array.from(compiled.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
      .find((button) => button.textContent?.includes('Pacchetto Pokémon'));
    pokemonTab?.click();
    fixture.detectChanges();

    expect(compiled.querySelector('input[type="range"]')).toBeNull();
    compiled.querySelector<HTMLElement>('.booster-trigger')?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.state.isSpinning()).toBe(true);
    expect(compiled.querySelector('.pack-opening')).toBeTruthy();
  });

  it('should open the Pokémon pack from the open button without charging', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    Array.from(compiled.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
      .find((button) => button.textContent?.includes('Pacchetto Pokémon'))?.click();
    fixture.detectChanges();

    compiled.querySelector<HTMLButtonElement>('.pack-open-button')?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.charging()).toBe(false);
    expect(fixture.componentInstance.state.isSpinning()).toBe(true);
    expect(compiled.querySelector('.pack-opening')).toBeTruthy();
  });

  it('should reveal the fifth card and emit its winner after four discards', () => {
    vi.useFakeTimers();
    try {
      const fixture = TestBed.createComponent(App);
      fixture.componentInstance.state.setMode('pokemon');
      fixture.detectChanges();
      const pack = fixture.debugElement.query(By.directive(PokemonPackComponent))
        .componentInstance as PokemonPackComponent;
      pack.entries = entries;
      const winner = entries[2];
      fixture.componentInstance.state.beginSpin();

      pack.openPack(winner);
      expect(pack.phase).toBe('opening');
      expect(pack.cards).toHaveLength(5);
      expect(pack.cards.slice(0, 4).every((card) => card.label !== winner.label)).toBe(true);

      vi.advanceTimersByTime(680);
      expect(pack.phase).toBe('browsing');
      expect(fixture.nativeElement.querySelector('.cards-area')).toBeTruthy();
      for (let index = 0; index < 4; index++) {
        pack.discardCard();
        vi.advanceTimersByTime(330);
      }

      expect(pack.discarded).toBe(4);
      pack.revealWinner();
      expect(pack.phase).toBe('revealed');
      vi.advanceTimersByTime(1750);
      expect(fixture.componentInstance.state.winner()?.id).toBe(winner.id);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.winner-dialog')).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('should select Claw Machine without a strength slider or hold charge', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const clawTab = Array.from(compiled.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
      .find((button) => button.textContent?.includes('Claw Machine'));

    expect(clawTab).toBeTruthy();
    clawTab?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.state.mode()).toBe('claw');
    expect(compiled.querySelector('input[type="range"]')).toBeNull();
    expect(compiled.querySelector('.claw-open-button')?.textContent).toContain('PESCA CAPSULA');
    expect(compiled.querySelector('app-claw-machine')).toBeTruthy();
  });

  it('should start the claw animation from the PESCA CAPSULA button', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    Array.from(compiled.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
      .find((button) => button.textContent?.includes('Claw Machine'))?.click();
    fixture.detectChanges();

    compiled.querySelector<HTMLButtonElement>('.claw-open-button')?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.state.isSpinning()).toBe(true);
    expect(compiled.querySelector('.phase-moving')).toBeTruthy();
  });

  it('should run the claw machine through the capsule reveal into the winner modal', async () => {
    try {
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      vi.useFakeTimers();
      const compiled = fixture.nativeElement as HTMLElement;
      Array.from(compiled.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
        .find((button) => button.textContent?.includes('Claw Machine'))?.click();
      fixture.detectChanges();

      compiled.querySelector<HTMLElement>('.machine-window')?.click();
      fixture.detectChanges();

      expect(fixture.componentInstance.charging()).toBe(false);
      expect(fixture.componentInstance.state.isSpinning()).toBe(true);
      expect(compiled.querySelector('.phase-moving')).toBeTruthy();

      vi.advanceTimersByTime(1120 + 780 + 330 + 780 + 1200 + 400 + 1150);
      expect(compiled.querySelector('.prize-reveal')).toBeTruthy();
      expect(fixture.componentInstance.state.winner()).toBeTruthy();
      fixture.detectChanges();
      expect(compiled.querySelector('.winner-dialog')).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('should report the entry visually centered under the pin', () => {
    const segment = (Math.PI * 2) / entries.length;
    entries.forEach((entry, index) => {
      const targetRotation = -((index + 0.5) * segment);
      expect(getEntryUnderPin(targetRotation, entries)?.id).toBe(entry.id);
    });
  });
});
