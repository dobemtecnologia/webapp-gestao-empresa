import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { SetorService } from '../../services/setor.service';
import { SetorDTO } from '../../models/setor.model';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-setores-selector',
  templateUrl: './setores-selector.component.html',
  styleUrls: ['./setores-selector.component.scss'],
  standalone: false,
})
export class SetoresSelectorComponent implements OnInit {
  @Input() formGroup!: FormGroup;
  @Output() setoresChange = new EventEmitter<SetorDTO[]>();

  setoresDisponiveis: SetorDTO[] = [];
  carregandoSetores = false;
  setoresSelecionados: SetorDTO[] = [];

  constructor(private setorService: SetorService) {}

  async ngOnInit() {
    await this.carregarSetores();
    this.setoresSelecionados = this.formGroup.get('setores')?.value || [];
  }

  async carregarSetores() {
    this.carregandoSetores = true;
    try {
      const setores = await firstValueFrom(
        this.setorService.getAllSetors('id,asc', 0, 100, true).pipe(
          catchError(() => of([]))
        )
      );
      this.setoresDisponiveis = setores;
    } catch (error) {
      console.error('Erro ao carregar setores:', error);
    } finally {
      this.carregandoSetores = false;
    }
  }

  toggleSetor(setor: SetorDTO) {
    const index = this.setoresSelecionados.findIndex(s => s.id === setor.id);
    if (index >= 0) {
      this.setoresSelecionados.splice(index, 1);
    } else {
      this.setoresSelecionados.push(setor);
    }
    this.formGroup.patchValue({ setores: this.setoresSelecionados });
    this.setoresChange.emit(this.setoresSelecionados);
  }

  isSetorSelected(setor: SetorDTO): boolean {
    return this.setoresSelecionados.some(s => s.id === setor.id);
  }
}




