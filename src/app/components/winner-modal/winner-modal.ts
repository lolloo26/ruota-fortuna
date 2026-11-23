import { Component, EventEmitter, Input, Output } from '@angular/core';
import { WheelEntry } from '../../models/wheel.model';

@Component({
  selector: 'app-winner-modal',
  standalone: true,
  templateUrl: './winner-modal.html',
  styleUrl: './winner-modal.scss',
})
export class WinnerModalComponent {
  @Input() winner: WheelEntry | null = null;
  @Input() autoExcluded = false;
  @Output() keep = new EventEmitter<void>();
  @Output() exclude = new EventEmitter<void>();
}
