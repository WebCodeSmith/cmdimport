import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html'
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  registerForm: FormGroup;
  loading = signal<boolean>(false);
  error = signal<string>('');

  constructor() {
    this.registerForm = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      senha: ['', [Validators.required, Validators.minLength(6)]],
      confirmarSenha: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  passwordMatchValidator(form: FormGroup) {
    const senha = form.get('senha');
    const confirmarSenha = form.get('confirmarSenha');
    
    if (senha && confirmarSenha && senha.value !== confirmarSenha.value) {
      confirmarSenha.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      // Marcar todos os campos como touched para mostrar erros
      Object.keys(this.registerForm.controls).forEach(key => {
        this.registerForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.loading.set(true);
    this.error.set('');

    const { nome, email, senha } = this.registerForm.value;

    this.authService.register(nome, email, senha).subscribe({
      next: (response) => {
        if (response.success) {
          this.router.navigate(['/dashboard']);
        } else {
          this.error.set(response.message || 'Erro ao criar conta');
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Erro ao criar conta. Tente novamente.');
        this.loading.set(false);
      }
    });
  }

  get nome() {
    return this.registerForm.get('nome');
  }

  get email() {
    return this.registerForm.get('email');
  }

  get senha() {
    return this.registerForm.get('senha');
  }

  get confirmarSenha() {
    return this.registerForm.get('confirmarSenha');
  }
}

