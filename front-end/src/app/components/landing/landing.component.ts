import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent {
  constructor(private router: Router) {}

  stats = [
    { icon: '⚽', value: '+10,000', label: 'Futboleros activos' },
    { icon: '🏆', value: '+500', label: 'Grupos creados' },
    { icon: '🎯', value: '+50,000', label: 'Predicciones hechas' },
    { icon: '🔥', value: '98%', label: 'Satisfacción' }
  ];

  features = [
    {
      icon: '🎯',
      title: 'Pollas Futboleras',
      description: 'Predice marcadores de los mejores partidos. Sistema de puntos que premia el marcador exacto con el doble.',
      colorClass: ''
    },
    {
      icon: '🏆',
      title: 'Ranking en Tiempo Real',
      description: 'Tabla de posiciones actualizada automáticamente tras cada jornada. ¿Quién es el crack del grupo?',
      colorClass: 'gold-accent'
    },
    {
      icon: '📲',
      title: 'Invitaciones Fáciles',
      description: 'Comparte un enlace único por WhatsApp o Telegram. Tus amigos se unen en segundos.',
      colorClass: 'blue-accent'
    },
    {
      icon: '📅',
      title: 'Gestión de Jornadas',
      description: 'Cierre automático de predicciones antes del pitido. Nunca más un "pero si yo lo dije después".',
      colorClass: 'orange-accent'
    },
    {
      icon: '📊',
      title: 'Estadísticas Detalladas',
      description: 'Historial completo de tus predicciones, porcentaje de acierto por competición y racha actual.',
      colorClass: 'purple-accent'
    },
    {
      icon: '🔒',
      title: 'Grupos Privados',
      description: 'Solo entran los que tú invitas. Control total sobre quién ve las predicciones y el ranking.',
      colorClass: 'red-accent'
    }
  ];

  benefits = [
    {
      title: 'Diseñada para pollas futboleras',
      description: 'No somos una app genérica. Cada función existe para que la experiencia de predecir sea justa, divertida y competitiva.'
    },
    {
      title: 'Gratis para siempre',
      description: 'Sin suscripciones, sin límites de predicciones. Crea tu grupo y empieza a competir hoy mismo.'
    },
    {
      title: 'Funciona en el móvil',
      description: 'Haz tus predicciones desde donde estés, antes del pitido inicial. Sin apps que instalar.'
    },
    {
      title: 'Resolver polémicas del grupo',
      description: 'Todo queda registrado. Nadie puede cambiar sus predicciones después del partido. El ranking no miente.'
    }
  ];

  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  navigateToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  navigateToRegister(): void {
    this.router.navigate(['/auth/register']);
  }
}
