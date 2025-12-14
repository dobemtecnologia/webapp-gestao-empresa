import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SimulacaoPage } from './simulacao.page';

const routes: Routes = [
  {
    path: '',
    component: SimulacaoPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SimulacaoPageRoutingModule {}
