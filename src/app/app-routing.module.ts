import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'folder/:id',
    loadChildren: () => import('./folder/folder.module').then( m => m.FolderPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'simulacao',
    loadChildren: () => import('./simulacao/simulacao.module').then( m => m.SimulacaoPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'wizard',
    loadChildren: () => import('./wizard/wizard.module').then( m => m.WizardPageModule)
    // Sem AuthGuard para permitir acesso de leads anônimos
  },
  {
    path: 'resultado-orcamento',
    loadChildren: () => import('./resultado-orcamento/resultado-orcamento.module').then( m => m.ResultadoOrcamentoPageModule)
    // Sem AuthGuard para permitir acesso via link compartilhável
  },
  {
    path: 'formulario-orcamento',
    loadChildren: () => import('./formulario-orcamento/formulario-orcamento.module').then( m => m.FormularioOrcamentoPageModule)
    // Sem AuthGuard para permitir acesso de leads anônimos
  },
  {
    path: 'login',
    loadChildren: () => import('./login/login.module').then( m => m.LoginPageModule)
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
