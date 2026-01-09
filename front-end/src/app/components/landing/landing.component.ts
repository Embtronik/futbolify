import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent {
  features = [
    {
      icon: '👥',
      title: 'Gestión de Equipos',
      description: 'Invita a jugadores, organiza roles, administra perfiles y mantén tu equipo actualizado en todo momento.',
      gradient: 'from-green-500 to-emerald-600'
    },
    {
      icon: '📅',
      title: 'Calendario Inteligente',
      description: 'Planifica entrenamientos y partidos. Los jugadores reciben notificaciones y pueden confirmar su asistencia fácilmente.',
      gradient: 'from-orange-500 to-red-600'
    },
    {
      icon: '✅',
      title: 'Control de Asistencias',
      description: 'Registra asistencias automáticamente, visualiza estadísticas y mantén un histórico detallado de participación.',
      gradient: 'from-green-500 to-emerald-600'
    },
    {
      icon: '⚡',
      title: 'Chat y Comunicación',
      description: 'Comunícate con tu equipo al instante. Coordina cambios, comparte videos de entrenamientos y celebra victorias juntos.',
      gradient: 'from-orange-500 to-red-600'
    }
  ];

  benefits = [
    {
      title: 'Diseño enfocado en fútbol aficionado',
      description: 'No somos un software genérico. Futbolify está construido específicamente para los amatistas que quieren organizarse sin complicaciones.'
    },
    {
      title: '100% Gratis para grupos pequeños',
      description: 'Crea tu equipo, invita amigos y comienza a organizar. No hay límites artificiales ni pases de pago ocultos.'
    },
    {
      title: 'Fácil de usar desde el móvil',
      description: 'Interfaz responsive que funciona perfectamente en tu celular. Confirma asistencia, ve el calendario y chatea con tu equipo donde sea.'
    },
    {
      title: 'Privado y seguro',
      description: 'Tus datos y los de tu equipo están seguros. Control total de quién puede ver la información de tu grupo.'
    }
  ];

  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
