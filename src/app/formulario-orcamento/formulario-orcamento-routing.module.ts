import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FormularioOrcamentoPage } from './formulario-orcamento.page';

const routes: Routes = [
  {
    path: '',
    component: FormularioOrcamentoPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FormularioOrcamentoPageRoutingModule {}

