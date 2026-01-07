import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiResponse } from '../../shared/types/api.types';

// Detectar URL da API baseado no ambiente (igual ao api.ts original)
function getApiUrl(): string {
  // Prioridade 1: Variável de ambiente (configurada no build/deploy)
  // Angular usa NG_APP_* para variáveis de ambiente
  if (typeof (window as any).__env !== 'undefined' && (window as any).__env?.NG_APP_API_URL) {
    return (window as any).__env.NG_APP_API_URL;
  }

  // Prioridade 2: No browser, usar a mesma origem do frontend
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Se não for localhost, usar a mesma origem do frontend
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      // Usar a mesma origem (protocolo + hostname) para evitar CORS
      return `${window.location.protocol}//${window.location.hostname}/api`;
    }
  }

  // Padrão para desenvolvimento local
  return 'http://localhost:8080/api';
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private apiUrl = getApiUrl();

  private getHeaders(): HttpHeaders {
    const headers: { [key: string]: string } = {
      'Content-Type': 'application/json',
    };

    // Adicionar token de autenticação se existir
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.token) {
          headers['Authorization'] = `Bearer ${user.token}`;
        }
        if (user.id) {
          headers['X-User-ID'] = String(user.id);
        }
      } catch (e) {
        // Ignorar erro de parsing
      }
    }

    return new HttpHeaders(headers);
  }

  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
    let url = `${this.apiUrl}${endpoint}`;
    
    if (params && Object.keys(params).length > 0) {
      let httpParams = new HttpParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          httpParams = httpParams.append(key, String(value));
        }
      });
      const queryString = httpParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return url;
  }

  private handleRequest<T>(request: Observable<any>): Observable<ApiResponse<T>> {
    return request.pipe(
      map((data) => {
        // Se success for explicitamente false, retornar erro
        if (data.success === false) {
          return {
            success: false,
            message: data.message || 'Erro na requisição',
          } as ApiResponse<T>;
        }
        
        // Se success for true ou não existir (assumir sucesso para códigos 2xx)
        return {
          success: data.success !== false, // true se não for false
          message: data.message,
          data: data.data || data, // Priorizar data, senão retornar tudo
          ...data,
        } as ApiResponse<T>;
      }),
      catchError((error: any) => {
        console.error('Erro na requisição:', error);
        
        // Tentar extrair mensagem do backend
        let errorMessage = 'Erro de conexão';
        
        // Angular HttpClient coloca o body do erro em error.error
        if (error.error) {
          if (typeof error.error === 'string') {
            // Se for string, tentar parsear como JSON
            try {
              const parsed = JSON.parse(error.error);
              errorMessage = parsed.message || errorMessage;
            } catch {
              errorMessage = error.error;
            }
          } else if (error.error.message) {
            errorMessage = error.error.message;
          } else if (error.error.error) {
            errorMessage = error.error.error;
          }
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        return throwError(() => ({
          success: false,
          message: errorMessage,
          error: error
        } as ApiResponse<T>));
      })
    );
  }

  get<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>): Observable<ApiResponse<T>> {
    const url = this.buildUrl(endpoint, params);
    return this.handleRequest<T>(
      this.http.get<T>(url, { headers: this.getHeaders() })
    );
  }

  post<T>(endpoint: string, body: any): Observable<ApiResponse<T>> {
    const url = this.buildUrl(endpoint);
    return this.handleRequest<T>(
      this.http.post<T>(url, body, { headers: this.getHeaders() })
    );
  }

  put<T>(endpoint: string, body: any): Observable<ApiResponse<T>> {
    const url = this.buildUrl(endpoint);
    return this.handleRequest<T>(
      this.http.put<T>(url, body, { headers: this.getHeaders() })
    );
  }

  delete<T>(endpoint: string): Observable<ApiResponse<T>> {
    const url = this.buildUrl(endpoint);
    return this.handleRequest<T>(
      this.http.delete<T>(url, { headers: this.getHeaders() })
    );
  }
}

