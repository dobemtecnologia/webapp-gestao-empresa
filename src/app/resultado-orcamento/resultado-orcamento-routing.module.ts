import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ResultadoOrcamentoPage } from './resultado-orcamento.page';

const routes: Routes = [
  {
    path: '',
    component: ResultadoOrcamentoPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ResultadoOrcamentoPageRoutingModule {}
