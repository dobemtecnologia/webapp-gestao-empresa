import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { PlanoService } from '../../services/plano.service';
import { Infraestrutura } from '../../models/infraestrutura.model';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-infraestrutura-selector',
  templateUrl: './infraestrutura-selector.component.html',
  styleUrls: ['./infraestrutura-selector.component.scss'],
  standalone: false,
})
export class InfraestruturaSelectorComponent implements OnInit {
  @Input() formGroup!: FormGroup;
  @Output() infrastructureChange = new EventEmitter<number>();

  infraestruturas: Infraestrutura[] = [];
  carregandoInfraestruturas = false;

  constructor(private planoService: PlanoService) {}

  async ngOnInit() {
    await this.carregarInfraestruturas();
  }

  async carregarInfraestruturas() {
    this.carregandoInfraestruturas = true;
    try {
      const infraestruturas = await firstValueFrom(
        this.planoService.getInfraestruturas('id,asc').pipe(
          catchError(() => of([]))
        )
      );
      this.infraestruturas = infraestruturas;
    } catch (error) {
      console.error('Erro ao carregar infraestruturas:', error);
    } finally {
      this.carregandoInfraestruturas = false;
    }
  }

  selectInfrastructure(infraId: number) {
    this.formGroup.patchValue({ infrastructure: infraId });
    this.infrastructureChange.emit(infraId);
  }

  isSelected(infraId: number): boolean {
    return this.formGroup.get('infrastructure')?.value === infraId;
  }
}

