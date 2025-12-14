import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SimulacaoPageRoutingModule } from './simulacao-routing.module';

import { SimulacaoPage } from './simulacao.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    SimulacaoPageRoutingModule
  ],
  declarations: [SimulacaoPage]
})
export class SimulacaoPageModule {}
