import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet],
  template: `
    <div class="dashboard-layout">
      <!-- Sidebar -->
      <aside class="sidebar" [class.collapsed]="sidebarCollapsed">
        <div class="sidebar-header">
          <div class="logo">
            <span class="logo-icon">⚽</span>
            <span class="logo-text" *ngIf="!sidebarCollapsed">Futbolify</span>
          </div>
          <button class="toggle-btn" (click)="toggleSidebar()">
            <span>{{ sidebarCollapsed ? '›' : '‹' }}</span>
          </button>
        </div>

        <nav class="sidebar-nav">
          <a routerLink="/dashboard/home" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">🏠</span>
            <span class="nav-text" *ngIf="!sidebarCollapsed">Inicio</span>
          </a>
          <a routerLink="/dashboard/teams" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">👥</span>
            <span class="nav-text" *ngIf="!sidebarCollapsed">Mis Grupos</span>
          </a>
          <a routerLink="/dashboard/join-team" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">🔗</span>
            <span class="nav-text" *ngIf="!sidebarCollapsed">Unirme a un Grupo</span>
          </a>
          <a routerLink="/dashboard/players" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">🏃</span>
            <span class="nav-text" *ngIf="!sidebarCollapsed">Integrantes</span>
          </a>
          <a routerLink="/dashboard/matches" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">⚽</span>
            <span class="nav-text" *ngIf="!sidebarCollapsed">Partidos</span>
          </a>
          <a routerLink="/dashboard/polls" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">🎰</span>
            <span class="nav-text" *ngIf="!sidebarCollapsed">Pollas</span>
          </a>
          <a routerLink="/dashboard/stats" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">📊</span>
            <span class="nav-text" *ngIf="!sidebarCollapsed">Estadísticas</span>
          </a>
          <a routerLink="/dashboard/profile" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">👤</span>
            <span class="nav-text" *ngIf="!sidebarCollapsed">Perfil</span>
          </a>
        </nav>

        <div class="sidebar-footer">
          <button class="nav-item logout-btn" (click)="logout()">
            <span class="nav-icon">🚪</span>
            <span class="nav-text" *ngIf="!sidebarCollapsed">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <div class="main-wrapper">
        <!-- Top Bar -->
        <header class="topbar">
          <div class="topbar-content">
            <h1 class="page-title">{{ getPageTitle() }}</h1>
            <div class="user-menu">
              <div class="user-info">
                <span class="user-name">{{ user?.firstName }} {{ user?.lastName }}</span>
                <span class="user-email">{{ user?.email }}</span>
              </div>
              <div class="user-avatar">
                {{ user?.firstName?.charAt(0) }}{{ user?.lastName?.charAt(0) }}
              </div>
            </div>
          </div>
        </header>

        <!-- Content Area -->
        <main class="content-area">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-layout {
      display: flex;
      height: 100vh;
      overflow: hidden;
    }

    /* Sidebar Styles */
    .sidebar {
      width: 260px;
      background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
      color: white;
      display: flex;
      flex-direction: column;
      transition: width 0.3s ease;
      box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
      position: relative;
      z-index: 100;
    }

    .sidebar.collapsed {
      width: 80px;
    }

    .sidebar-header {
      padding: 24px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-icon {
      font-size: 28px;
      flex-shrink: 0;
    }

    .logo-text {
      font-size: 20px;
      font-weight: 700;
      white-space: nowrap;
    }

    .toggle-btn {
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      transition: background 0.2s;
    }

    .toggle-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .sidebar-nav {
      flex: 1;
      padding: 20px 0;
      overflow-y: auto;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 20px;
      color: rgba(255, 255, 255, 0.7);
      text-decoration: none;
      transition: all 0.2s;
      cursor: pointer;
      border-left: 3px solid transparent;
      background: transparent;
      border: none;
      width: 100%;
      text-align: left;
      font-size: 15px;
    }

    .nav-item:hover {
      background: rgba(255, 255, 255, 0.05);
      color: white;
    }

    .nav-item.active {
      background: rgba(34, 197, 94, 0.15);
      color: var(--primary-color);
      border-left-color: var(--primary-color);
    }

    .nav-icon {
      font-size: 20px;
      flex-shrink: 0;
      width: 24px;
      text-align: center;
    }

    .nav-text {
      white-space: nowrap;
    }

    .sidebar-footer {
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding: 20px 0;
    }

    .logout-btn {
      color: rgba(255, 255, 255, 0.7);
    }

    .logout-btn:hover {
      background: rgba(249, 115, 22, 0.1);
      color: var(--secondary-color);
    }

    /* Main Wrapper */
    .main-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: #f5f7fa;
    }

    /* Topbar */
    .topbar {
      background: white;
      border-bottom: 1px solid var(--border-color);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      z-index: 90;
    }

    .topbar-content {
      padding: 16px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .page-title {
      font-size: 24px;
      font-weight: 700;
      color: var(--dark-color);
      margin: 0;
    }

    .user-menu {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .user-info {
      text-align: right;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .user-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--dark-color);
    }

    .user-email {
      font-size: 12px;
      color: var(--gray-color);
    }

    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 14px;
      text-transform: uppercase;
    }

    /* Content Area */
    .content-area {
      flex: 1;
      overflow-y: auto;
      padding: 32px;
    }

    @media (max-width: 768px) {
      .sidebar {
        position: fixed;
        left: 0;
        top: 0;
        height: 100vh;
        z-index: 1000;
      }

      .sidebar.collapsed {
        transform: translateX(-100%);
      }

      .user-info {
        display: none;
      }

      .content-area {
        padding: 16px;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  user: User | null = null;
  sidebarCollapsed = false;

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
    });

    // Si no hay usuario en el subject, intentar obtenerlo
    if (!this.user) {
      this.authService.getCurrentUser().subscribe({
        error: () => {
          // Si falla, el interceptor manejará el logout
        }
      });
    }
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  getPageTitle(): string {
    const url = this.router.url;
    if (url.includes('/teams')) return 'Grupos de Fútbol';
    if (url.includes('/players')) return 'Jugadores';
    if (url.includes('/matches')) return 'Partidos';
    if (url.includes('/polls')) return 'Pollas';
    if (url.includes('/stats')) return 'Estadísticas';
    if (url.includes('/profile')) return 'Perfil';
    return 'Inicio';
  }

  logout(): void {
    this.authService.logout();
  }
}
