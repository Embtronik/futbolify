import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/landing/landing.component').then(m => m.LandingComponent)
  },
  {
    path: 'auth/login',
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'auth/register',
    loadComponent: () => import('./components/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'oauth2/redirect',
    loadComponent: () => import('./components/oauth-redirect/oauth-redirect.component').then(m => m.OauthRedirectComponent)
  },
  {
    path: 'polls',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./components/polls/polls-list/polls-list.component').then(m => m.PollsListComponent)
      },
      {
        path: 'create',
        loadComponent: () => import('./components/polls/poll-create/poll-create.component').then(m => m.PollCreateComponent)
      },
      {
        path: ':id',
        loadComponent: () => import('./components/polls/poll-detail/poll-detail.component').then(m => m.PollDetailComponent)
      },
      {
        path: ':id/predictions',
        loadComponent: () => import('./components/polls/poll-predictions/poll-predictions.component').then(m => m.PollPredictionsComponent)
      }
    ]
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      },
      {
        path: 'home',
        loadComponent: () => import('./components/dashboard/home/home.component').then(m => m.HomeComponent)
      },
      {
        path: 'teams',
        loadComponent: () => import('./components/dashboard/teams/teams.component').then(m => m.TeamsComponent)
      },
      {
        path: 'join-team',
        loadComponent: () => import('./components/dashboard/join-team/join-team.component').then(m => m.JoinTeamComponent)
      },
      {
        path: 'players',
        loadComponent: () => import('./components/dashboard/members/members.component').then(m => m.MembersComponent)
      },
      {
        path: 'matches',
        loadComponent: () => import('./components/dashboard/matches/matches.component').then(m => m.MatchesComponent)
      },
      {
        path: 'matches/attendance',
        loadComponent: () => import('./components/dashboard/matches/match-attendance.component').then(m => m.MatchAttendanceComponent)
      },
      {
        path: 'polls',
        loadComponent: () => import('./components/dashboard/polls/polls.component').then(m => m.PollsComponent)
      },
      {
        path: 'stats',
        loadComponent: () => import('./components/dashboard/stats/stats.component').then(m => m.StatsComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./components/dashboard/profile/profile.component').then(m => m.ProfileComponent)
      }
    ]
  },
  {
    path: 'equipos/:teamId/partidos/:matchId',
    canActivate: [authGuard],
    loadComponent: () => import('./components/dashboard/matches/match-detail.component').then(m => m.MatchDetailComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
