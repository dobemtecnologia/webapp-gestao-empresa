import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ResultadoOrcamentoPageRoutingModule } from './resultado-orcamento-routing.module';
import { ResultadoOrcamentoPage } from './resultado-orcamento.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ResultadoOrcamentoPageRoutingModule
  ],
  declarations: [ResultadoOrcamentoPage]
})
export class ResultadoOrcamentoPageModule {}



