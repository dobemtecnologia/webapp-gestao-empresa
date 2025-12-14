import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MenuController, LoadingController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { LoginVM } from '../models/login-vm.model';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage implements OnInit, OnDestroy {
  loginForm!: FormGroup;
  isLoading = false;

  constructor(
    private formBuilder: FormBuilder,
    private menuController: MenuController,
    private authService: AuthService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    // Desabilita o menu lateral na página de login
    this.menuController.enable(false);
    
    // Se já estiver autenticado, redireciona
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/folder/inbox']);
    }
    
    this.loginForm = this.formBuilder.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
      rememberMe: [false]
    });
  }

  ngOnDestroy() {
    // Reabilita o menu quando sair da página de login
    this.menuController.enable(true);
  }

  async onSubmit() {
    if (this.loginForm.valid && !this.isLoading) {
      this.isLoading = true;
      
      const loading = await this.loadingController.create({
        message: 'Entrando...',
        spinner: 'crescent'
      });
      await loading.present();

      const credentials: LoginVM = {
        username: this.loginForm.value.username,
        password: this.loginForm.value.password,
        rememberMe: this.loginForm.value.rememberMe
      };

      this.authService.login(credentials).subscribe({
        next: (response) => {
          loading.dismiss();
          this.isLoading = false;
          
          if (response.id_token) {
            this.showToast('Login realizado com sucesso!', 'success');
            // Redireciona para a página principal
            this.router.navigate(['/folder/inbox']);
          }
        },
        error: (error) => {
          loading.dismiss();
          this.isLoading = false;
          
          let errorMessage = 'Erro ao fazer login. Tente novamente.';
          
          if (error.status === 401) {
            errorMessage = 'Usuário ou senha inválidos.';
          } else if (error.status === 0) {
            errorMessage = 'Não foi possível conectar ao servidor. Verifique sua conexão.';
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          }
          
          this.showToast(errorMessage, 'danger');
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      color: color,
      position: 'top'
    });
    await toast.present();
  }

  private markFormGroupTouched() {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }
}
