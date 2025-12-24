import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { FormularioOrcamentoPageRoutingModule } from './formulario-orcamento-routing.module';

import { FormularioOrcamentoPage } from './formulario-orcamento.page';
import { DadosClienteComponent } from './components/dados-cliente.component';
import { ConfiguracaoPlanoComponent } from './components/configuracao-plano.component';
import { ResumoOrcamentoComponent } from './components/resumo-orcamento.component';
import { SetoresSelectorComponent } from './components/setores-selector.component';
import { AssistentesSelectorComponent } from './components/assistentes-selector.component';
import { CanaisConfigComponent } from './components/canais-config.component';
import { InfraestruturaSelectorComponent } from './components/infraestrutura-selector.component';
import { PeriodoSelectorComponent } from './components/periodo-selector.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    FormularioOrcamentoPageRoutingModule
  ],
  declarations: [
    FormularioOrcamentoPage,
    DadosClienteComponent,
    ConfiguracaoPlanoComponent,
    ResumoOrcamentoComponent,
    SetoresSelectorComponent,
    AssistentesSelectorComponent,
    CanaisConfigComponent,
    InfraestruturaSelectorComponent,
    PeriodoSelectorComponent
  ]
})
export class FormularioOrcamentoPageModule {}

