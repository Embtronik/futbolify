import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CdkDragDrop, DragDropModule, transferArrayItem } from '@angular/cdk/drag-drop';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AuthService } from '../../../services/auth.service';
import { TeamService } from '../../../services/team.service';
import {
  MatchAttendanceStatus,
  MatchTeam,
  PlayerPosition,
  Team,
  TeamMatch,
  TeamMatchAttendance,
  TeamMatchAttendanceSummary,
  TeamMatchPlayerResultInput,
  TeamMatchResult,
  TeamMatchResultUpsertRequest,
} from '../../../models/football.model';

interface ManagePlayer {
  userId: number;
  email: string;
  displayName: string;
  status: MatchAttendanceStatus;
  assignedMatchTeamId?: number;
  position?: PlayerPosition;
}

interface ManageTeam {
  id: number;
  name: string;
  color: string;
  players: ManagePlayer[];
}

@Component({
  selector: 'app-match-manage',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DragDropModule],
  template: `
    <div class="page" *ngIf="initialized">
      <div class="header">
        <button type="button" class="btn ghost" (click)="goBack()">← Volver</button>
        <div class="title">
          <h1>Administrar Partido</h1>
          <p class="subtitle" *ngIf="match">{{ match.matchDateTime | date:'EEEE d \\de MMMM, HH:mm' }} · {{ match.address }}</p>
        </div>
        <div class="header-actions">
          <button type="button" class="btn" (click)="reload()" [disabled]="loading">Refrescar</button>
        </div>
      </div>

      <div *ngIf="!canManage" class="alert danger">
        No tienes permisos para administrar este partido.
      </div>

      <div *ngIf="errorMessage" class="alert danger">{{ errorMessage }}</div>
      <div *ngIf="infoMessage" class="alert info">{{ infoMessage }}</div>

      <div class="section" *ngIf="loading">
        <div class="spinner"></div>
        <p>Cargando información del partido…</p>
      </div>

      <div class="accordion" *ngIf="!loading && canManage">
        <!-- PASO 1: ASISTENCIA -->
        <section class="card accordion-item">
          <button type="button" class="accordion-head" (click)="accordionOpen = 'attendance'" [attr.aria-expanded]="accordionOpen === 'attendance'">
            <span class="left">
              <span class="step">Paso 1</span>
              <span class="label">Asistencia</span>
            </span>
            <span class="right">
              <span class="pill">Asisten: {{ attending.length }}</span>
              <span class="pill">Pendientes: {{ pending.length }}</span>
              <span class="pill">No: {{ notAttending.length }}</span>
            </span>
          </button>

          <div class="accordion-body" *ngIf="accordionOpen === 'attendance'">
            <p class="hint">Arrastra jugadores entre columnas para cambiar su estado.</p>

            <div class="attendance-board">
              <div class="col">
                <div class="col-head attending">
                  <span>Asisten</span>
                  <span class="pill">{{ attending.length }}</span>
                </div>

                <div
                  class="dropzone"
                  cdkDropList
                  id="attendingList"
                  [cdkDropListData]="attending"
                  [cdkDropListConnectedTo]="['pendingList','notAttendingList']"
                  (cdkDropListDropped)="dropAttendance($event, 'ATTENDING')"
                >
                  <div class="player" *ngFor="let p of attending" cdkDrag>
                    <div class="name">{{ p.displayName }}</div>
                    <div class="meta">{{ p.email }}</div>
                  </div>
                  <div *ngIf="attending.length === 0" class="empty">Sin confirmaciones aún</div>
                </div>
              </div>

              <div class="col">
                <div class="col-head pending">
                  <span>Pendientes</span>
                  <span class="pill">{{ pending.length }}</span>
                </div>

                <div
                  class="dropzone"
                  cdkDropList
                  id="pendingList"
                  [cdkDropListData]="pending"
                  [cdkDropListConnectedTo]="['attendingList','notAttendingList']"
                  (cdkDropListDropped)="dropAttendance($event, 'PENDING')"
                >
                  <div class="player" *ngFor="let p of pending" cdkDrag>
                    <div class="name">{{ p.displayName }}</div>
                    <div class="meta">{{ p.email }}</div>
                  </div>
                  <div *ngIf="pending.length === 0" class="empty">Sin pendientes</div>
                </div>
              </div>

              <div class="col">
                <div class="col-head not">
                  <span>No asisten</span>
                  <span class="pill">{{ notAttending.length }}</span>
                </div>

                <div
                  class="dropzone"
                  cdkDropList
                  id="notAttendingList"
                  [cdkDropListData]="notAttending"
                  [cdkDropListConnectedTo]="['attendingList','pendingList']"
                  (cdkDropListDropped)="dropAttendance($event, 'NOT_ATTENDING')"
                >
                  <div class="player" *ngFor="let p of notAttending" cdkDrag>
                    <div class="name">{{ p.displayName }}</div>
                    <div class="meta">{{ p.email }}</div>
                  </div>
                  <div *ngIf="notAttending.length === 0" class="empty">Sin rechazos</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- PASO 2: EQUIPOS -->
        <section class="card accordion-item">
          <button type="button" class="accordion-head" (click)="accordionOpen = 'teams'" [attr.aria-expanded]="accordionOpen === 'teams'">
            <span class="left">
              <span class="step">Paso 2</span>
              <span class="label">Armar equipos</span>
            </span>
            <span class="right">
              <span class="pill">Equipos: {{ teams.length }}</span>
              <span class="pill">Sin asignar: {{ unassignedAttending.length }}</span>
            </span>
          </button>

          <div class="accordion-body" *ngIf="accordionOpen === 'teams'">
            <p class="hint">Define cuántos equipos vas a conformar y luego arrastra a los jugadores que asisten.</p>

            <form class="team-form" [formGroup]="teamsForm" (ngSubmit)="$event.preventDefault()">
              <div class="row">
                <label>Cantidad de equipos</label>
                <input type="number" min="2" max="6" formControlName="count">
              </div>

              <div class="row actions">
                <button type="button" class="btn" (click)="generateTeams()" [disabled]="teamsForm.invalid || creatingTeams">
                  {{ creatingTeams ? 'Creando…' : 'Generar' }}
                </button>
              </div>
            </form>

            <div *ngIf="teams.length === 0" class="empty big">Genera equipos para empezar a armar la plantilla.</div>

            <div *ngIf="teams.length > 0" class="teams-editor">
              <div class="team-chip" *ngFor="let t of teams">
                <input class="team-name" [(ngModel)]="t.name" [ngModelOptions]="{standalone: true}" placeholder="Nombre del equipo">
                <input class="team-color" type="color" [(ngModel)]="t.color" [ngModelOptions]="{standalone: true}">
                <button type="button" class="btn mini" (click)="saveTeam(t)">Guardar</button>
                <button type="button" class="btn mini danger" (click)="deleteTeam(t)">Eliminar</button>
                <span class="count">{{ t.players.length }}</span>
              </div>
            </div>

            <div *ngIf="teams.length > 0" class="assign">
              <div class="assign-left">
                <div class="assign-title">Disponibles (asisten)</div>
                <div
                  class="dropzone"
                  cdkDropList
                  id="unassignedList"
                  [cdkDropListData]="unassignedAttending"
                  [cdkDropListConnectedTo]="teamDropListIds"
                  (cdkDropListDropped)="dropTeam($event, null)"
                >
                  <div class="player" *ngFor="let p of unassignedAttending" cdkDrag>
                    <div class="name">{{ p.displayName }}</div>
                    <div class="meta">{{ p.email }}</div>
                  </div>
                  <div *ngIf="unassignedAttending.length === 0" class="empty">Todos asignados</div>
                </div>
              </div>

              <div class="assign-right">
                <div class="assign-title">Equipos</div>
                <div class="teams-board">
                  <div class="team-col" *ngFor="let t of teams">
                    <div class="team-head" [style.borderColor]="t.color">
                      <span class="dot" [style.background]="t.color"></span>
                      <span class="tname">{{ t.name || 'Equipo' }}</span>
                      <span class="pill">{{ t.players.length }}</span>
                    </div>

                    <div
                      class="dropzone"
                      cdkDropList
                      [id]="getTeamListId(t)"
                      [cdkDropListData]="t.players"
                      [cdkDropListConnectedTo]="getConnectedTeamLists(t.id)"
                      (cdkDropListDropped)="dropTeam($event, t)"
                    >
                      <div class="player" *ngFor="let p of t.players" cdkDrag>
                        <div class="rowline">
                          <div>
                            <div class="name">{{ p.displayName }}</div>
                            <div class="meta">{{ p.email }}</div>
                          </div>
                          <select class="pos" [(ngModel)]="p.position" [ngModelOptions]="{standalone: true}" (change)="onPositionChange(t, p)">
                            <option [ngValue]="undefined">Posición</option>
                            <option value="GOALKEEPER">Arquero</option>
                            <option value="DEFENDER">Defensa</option>
                            <option value="MIDFIELDER">Medio</option>
                            <option value="FORWARD">Delantero</option>
                          </select>
                        </div>
                      </div>
                      <div *ngIf="t.players.length === 0" class="empty">Arrastra jugadores aquí</div>
                    </div>
                  </div>
                </div>

                <p class="hint" style="margin-top: 12px;">
                  Tip: si cambias a alguien a “No asiste”, se desasigna automáticamente de los equipos.
                </p>
              </div>
            </div>
          </div>
        </section>

        <!-- PASO 3: RESULTADO Y CIERRE -->
        <section class="card accordion-item">
          <button type="button" class="accordion-head" (click)="accordionOpen = 'result'" [attr.aria-expanded]="accordionOpen === 'result'">
            <span class="left">
              <span class="step">Paso 3</span>
              <span class="label">Resultado y cierre</span>
            </span>
            <span class="right">
              <span class="pill" *ngIf="resultFinished">Finalizado</span>
              <span class="pill" *ngIf="!resultFinished">Sin finalizar</span>
            </span>
          </button>

          <div class="accordion-body" *ngIf="accordionOpen === 'result'">
            <div class="alert info" *ngIf="teams.length === 0">
              Primero crea los equipos y asigna a los jugadores para poder registrar el resultado.
            </div>

            <div class="result" *ngIf="teams.length > 0">
              <h3>Resultado del partido</h3>
              <p class="hint">Registra goles y autogoles por jugador. Los autogoles se suman al marcador del rival.</p>

              <div class="result-head">
                <label class="chk">
                  <input type="checkbox" [(ngModel)]="resultFinished" [ngModelOptions]="{standalone: true}" [disabled]="resultLocked">
                  Marcar como finalizado
                </label>

                <div class="result-actions">
                  <button
                    *ngIf="resultLocked"
                    type="button"
                    class="btn"
                    (click)="unlockResultEditing()"
                    [disabled]="!canManage || loading"
                  >
                    Editar resultado
                  </button>

                  <button
                    type="button"
                    class="btn primary"
                    (click)="saveResult()"
                    [disabled]="!canManage || loading || savingResult || resultLocked"
                  >
                    {{ savingResult ? 'Guardando…' : 'Guardar resultado' }}
                  </button>
                </div>
              </div>

              <div class="result-meta" *ngIf="result">
                <span class="pill soft">Finalizado: {{ result.finished ? 'Sí' : 'No' }}</span>
                <span class="pill soft" *ngIf="result.finishedAt">Finalizado el: {{ result.finishedAt | date:'short' }}</span>
                <span class="pill soft" *ngIf="result.resultUpdatedAt">Última actualización: {{ result.resultUpdatedAt | date:'short' }}</span>
              </div>

              <div class="scoreboard" *ngIf="teams.length >= 2">
                <div class="score" *ngFor="let t of teams" [style.borderColor]="t.color">
                  <div class="score-name">
                    <span class="dot" [style.background]="t.color"></span>
                    <span>{{ t.name || 'Equipo' }}</span>
                  </div>
                  <div class="score-num">{{ getTeamScore(t.id) }}</div>
                </div>
              </div>

              <div class="result-teams">
                <div class="result-team" *ngFor="let t of teams">
                  <div class="result-team-head" [style.borderColor]="t.color">
                    <span class="dot" [style.background]="t.color"></span>
                    <span class="tname">{{ t.name || 'Equipo' }}</span>
                    <span class="pill">{{ t.players.length }}</span>
                  </div>

                  <div *ngIf="t.players.length === 0" class="empty">Sin jugadores asignados</div>

                  <table class="result-table" *ngIf="t.players.length > 0">
                    <thead>
                      <tr>
                        <th>Jugador</th>
                        <th class="muted">Email</th>
                        <th class="num">Goles</th>
                        <th class="num">Autogoles</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let p of t.players">
                        <td>{{ p.displayName }}</td>
                        <td class="muted">{{ p.email }}</td>
                        <td class="num">
                          <input
                            class="num-input"
                            type="number"
                            min="0"
                            [(ngModel)]="getResultFor(p.email).goals"
                            [ngModelOptions]="{standalone: true}"
                            [disabled]="resultLocked"
                          />
                        </td>
                        <td class="num">
                          <input
                            class="num-input"
                            type="number"
                            min="0"
                            [(ngModel)]="getResultFor(p.email).ownGoals"
                            [ngModelOptions]="{standalone: true}"
                            [disabled]="resultLocked"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="finish">
                <div class="hint">Paso final: al terminar se valida asignación y posiciones, y se envía la notificación.</div>
                <button
                  type="button"
                  class="btn primary"
                  (click)="finishAndNotify()"
                  [disabled]="!canManage || loading || notifying || !resultFinished"
                >
                  {{ notifying ? 'Enviando…' : 'Terminar y notificar' }}
                </button>
                <div class="hint" *ngIf="!resultFinished">Marca el partido como finalizado antes de cerrar.</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div class="toast" *ngIf="toast as t" [ngClass]="t.type" role="status" aria-live="polite">
        <div class="toast-msg">{{ t.message }}</div>
        <button type="button" class="toast-close" (click)="toast = null">✕</button>
      </div>
  `,
  styles: [`
    .page{padding:20px;max-width:1200px;margin:0 auto;}
    .header{display:flex;align-items:center;gap:12px;justify-content:space-between;margin-bottom:16px;}
    .header-actions{display:flex;align-items:center;gap:10px;}
    .title{flex:1;}
    h1{margin:0;font-size:22px;color:#111827;}
    .subtitle{margin:4px 0 0;color:#6b7280;font-size:13px;}

    .accordion{display:flex;flex-direction:column;gap:12px;}
    .accordion-item{padding:0;overflow:hidden;}
    .accordion-head{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 14px;
      border:1px solid rgba(17,24,39,.12);border-radius:14px;background:linear-gradient(180deg, rgba(255,255,255,.92), rgba(249,250,251,.92));
      cursor:pointer;text-align:left;box-shadow:0 1px 0 rgba(17,24,39,.06);}
    .accordion-head:hover{border-color:rgba(17,24,39,.22);box-shadow:0 6px 18px rgba(17,24,39,.08);}
    .accordion-head:focus-visible{outline:3px solid rgba(59,130,246,.35);outline-offset:2px;}
    .accordion-head .left{display:flex;align-items:baseline;gap:10px;}
    .accordion-head .right{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;}
    .accordion-head .step{font-weight:1000;color:#374151;font-size:12px;letter-spacing:.02em;text-transform:uppercase;
      background:rgba(17,24,39,.06);border:1px solid rgba(17,24,39,.12);padding:4px 8px;border-radius:999px;}
    .accordion-head .label{font-weight:1000;color:#111827;font-size:15px;}
    .accordion-head[aria-expanded="true"]{background:linear-gradient(180deg, rgba(34,197,94,.10), rgba(255,255,255,.92));border-color:rgba(20,83,45,.35);}
    .accordion-head::after{content:'▾';font-weight:1000;color:#6b7280;transform:rotate(-90deg);transition:transform .15s ease;}
    .accordion-head[aria-expanded="true"]::after{transform:rotate(0deg);color:#14532d;}

    .accordion-body{padding:10px 14px 14px;border-left:1px solid rgba(17,24,39,.08);border-right:1px solid rgba(17,24,39,.08);border-bottom:1px solid rgba(17,24,39,.08);
      border-radius:0 0 14px 14px;margin-top:-10px;background:rgba(255,255,255,.7);}

    .finish{margin-top:16px;display:flex;flex-direction:column;gap:10px;align-items:flex-start;padding-top:14px;border-top:1px solid rgba(17,24,39,.08);}

    .result{margin-top:18px;padding-top:14px;border-top:1px solid rgba(17,24,39,.08);}
    .result h3{margin:0 0 8px;font-size:16px;color:#111827;}
    .result-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:10px 0 12px;flex-wrap:wrap;}
    .result-actions{display:flex;align-items:center;gap:10px;}
    .result-meta{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 10px;}
    .pill.soft{background:rgba(17,24,39,.06);border:1px solid rgba(17,24,39,.10);color:#374151;}
    .chk{display:flex;align-items:center;gap:8px;font-weight:700;color:#111827;}
    .scoreboard{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin:12px 0 14px;}
    .score{display:flex;align-items:center;justify-content:space-between;border:2px solid rgba(17,24,39,.12);border-left-width:6px;border-radius:14px;padding:10px 12px;background:#fff;}
    .score-name{display:flex;align-items:center;gap:10px;font-weight:900;color:#111827;}
    .score-num{font-size:22px;font-weight:1000;color:#111827;}
    .result-teams{display:grid;grid-template-columns:1fr;gap:14px;}
    .result-team{background:rgba(255,255,255,.6);border:1px solid rgba(17,24,39,.08);border-radius:14px;padding:12px;}
    .result-team-head{display:flex;align-items:center;gap:10px;border-left:6px solid rgba(17,24,39,.12);padding-left:10px;margin-bottom:10px;}
    .result-table{width:100%;border-collapse:separate;border-spacing:0;}
    .result-table th,.result-table td{padding:10px 8px;border-top:1px solid rgba(17,24,39,.08);font-size:13px;}
    .result-table thead th{border-top:none;color:#374151;font-weight:900;}
    .result-table .muted{color:#6b7280;}
    .result-table .num{text-align:right;white-space:nowrap;}
    .num-input{width:84px;padding:8px 10px;border-radius:12px;border:2px solid rgba(17,24,39,.18);font-weight:900;text-align:right;}

    .btn{padding:10px 14px;border-radius:999px;border:2px solid rgba(17,24,39,.28);background:#fff;color:#111827;font-weight:800;cursor:pointer;box-shadow:0 1px 0 rgba(17,24,39,.06);}
    .btn:hover{border-color:rgba(17,24,39,.42);}
    .btn:focus-visible{outline:3px solid rgba(59,130,246,.35);outline-offset:2px;}
    .btn.primary{background:#22c55e;border-color:#14532d;color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.18), 0 1px 0 rgba(17,24,39,.08);}
    .btn.ghost{background:transparent;border-color:rgba(17,24,39,.24);}
    .btn.mini{padding:8px 10px;font-size:12px;}
    .btn.danger{border-color:rgba(239,68,68,.55);color:#b91c1c;background:rgba(239,68,68,.06);}
    .btn[disabled]{opacity:.6;cursor:not-allowed;}

    .alert{border-radius:12px;padding:10px 12px;margin-bottom:12px;font-size:13px;}
    .alert.danger{background:rgba(239,68,68,.1);color:#b91c1c;border:1px solid rgba(239,68,68,.25);}
    .alert.info{background:rgba(59,130,246,.08);color:#1e3a8a;border:1px solid rgba(59,130,246,.18);}

    .spinner{width:34px;height:34px;border-radius:999px;border:4px solid #e5e7eb;border-top-color:#22c55e;animation:spin 1s linear infinite;margin:0 auto 8px;}
    @keyframes spin{to{transform:rotate(360deg);}}

    /* Legacy: grid removed in favor of accordion */

    .card.final{margin-top:16px;}
    .final-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;}

    .card{background:#fff;border-radius:16px;padding:16px 16px;box-shadow:0 10px 35px rgba(0,0,0,.06);}
    h2{margin:0 0 6px;color:#111827;font-size:18px;}
    .hint{margin:0 0 12px;color:#6b7280;font-size:13px;}

    .attendance-board{display:grid;grid-template-columns:1fr;gap:12px;}
    @media (min-width: 720px){.attendance-board{grid-template-columns:repeat(3, 1fr);}}

    .col{display:flex;flex-direction:column;gap:10px;}
    .col-head{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:12px;font-weight:700;font-size:13px;}
    .col-head.attending{background:rgba(34,197,94,.12);color:#166534;}
    .col-head.pending{background:rgba(234,179,8,.12);color:#854d0e;}
    .col-head.not{background:rgba(239,68,68,.12);color:#b91c1c;}

    .pill{display:inline-flex;align-items:center;justify-content:center;min-width:26px;height:22px;padding:0 8px;border-radius:999px;background:#fff;font-weight:800;}

    .dropzone{min-height:120px;border:1px dashed #e5e7eb;border-radius:14px;padding:10px;background:#fafafa;}
    .dropzone.cdk-drop-list-dragging{background:#f3f4f6;}

    .player{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:10px 10px;margin-bottom:8px;cursor:grab;}
    .player:last-child{margin-bottom:0;}
    .name{font-weight:700;font-size:13px;color:#111827;}
    .meta{font-size:12px;color:#6b7280;}
    .empty{color:#9ca3af;font-size:12px;padding:10px;text-align:center;}
    .empty.big{padding:14px;border:1px dashed #e5e7eb;border-radius:12px;background:#fafafa;}

    .team-form{display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:12px;}
    .team-form .row{display:flex;flex-direction:column;gap:6px;}
    label{font-size:12px;color:#6b7280;font-weight:700;}
    input[type=number]{width:120px;padding:10px 12px;border-radius:12px;border:1px solid #e5e7eb;}
    .team-form .actions{flex-direction:row;gap:8px;}

    .teams-editor{display:flex;flex-direction:column;gap:8px;margin-bottom:12px;}
    .team-chip{display:flex;align-items:center;gap:8px;border:1px solid #e5e7eb;border-radius:12px;padding:8px;background:#fff;}
    .team-name{flex:1;padding:8px 10px;border-radius:10px;border:1px solid #e5e7eb;}
    .team-color{width:46px;height:34px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;padding:0;}
    .count{margin-left:auto;font-weight:800;color:#111827;}

    .assign{display:grid;grid-template-columns:1fr;gap:12px;}
    @media (min-width: 980px){.assign{grid-template-columns:1fr 1.6fr;}}
    .assign-title{font-weight:800;color:#111827;margin-bottom:8px;}

    .teams-board{display:grid;grid-template-columns:1fr;gap:10px;}
    @media (min-width: 720px){.teams-board{grid-template-columns:repeat(2, 1fr);}}
    @media (min-width: 1100px){.teams-board{grid-template-columns:repeat(3, 1fr);}}

    .team-col{display:flex;flex-direction:column;gap:8px;}
    .team-head{display:flex;align-items:center;gap:8px;border:2px solid #e5e7eb;border-radius:12px;padding:8px 10px;background:#fff;}
    .dot{width:10px;height:10px;border-radius:999px;}
    .tname{font-weight:800;color:#111827;}

    .rowline{display:flex;align-items:center;justify-content:space-between;gap:8px;}
    .pos{border:1px solid #e5e7eb;border-radius:10px;padding:8px 10px;background:#fff;font-weight:700;color:#111827;font-size:12px;}

    .toast{position:fixed;right:18px;bottom:18px;display:flex;align-items:center;gap:12px;max-width:360px;
      padding:12px 12px;border-radius:14px;border:1px solid #e5e7eb;background:#111827;color:#fff;
      box-shadow:0 18px 45px rgba(0,0,0,.18);z-index:9999;}
    .toast.success{background:#166534;border-color:rgba(34,197,94,.45);}
    .toast.error{background:#7f1d1d;border-color:rgba(239,68,68,.45);}
    .toast.info{background:#1e3a8a;border-color:rgba(59,130,246,.45);}
    .toast-msg{font-size:13px;font-weight:700;line-height:1.2;}
    .toast-close{margin-left:auto;border:none;background:transparent;color:#fff;cursor:pointer;font-weight:900;opacity:.85;}
    .toast-close:hover{opacity:1;}
  `]
})
export class MatchManageComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private teamService = inject(TeamService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  initialized = false;
  loading = true;
  saving = false;
  creatingTeams = false;
  notifying = false;
  savingResult = false;
  result: TeamMatchResult | null = null;
  resultFinished = false;
  resultLocked = false;
  private resultWasFinished = false;

  private resultByEmail = new Map<string, { goals: number; ownGoals: number }>();

  accordionOpen: 'attendance' | 'teams' | 'result' = 'attendance';

  teamId!: number;
  matchId!: number;

  team: Team | null = null;
  match: TeamMatch | null = null;

  canManage = false;
  errorMessage = '';
  infoMessage = '';

  toast: { type: 'success' | 'error' | 'info'; message: string } | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSuccessToastAt = 0;

  attending: ManagePlayer[] = [];
  pending: ManagePlayer[] = [];
  notAttending: ManagePlayer[] = [];

  teamsForm = this.fb.group({
    count: [2, [Validators.required, Validators.min(2), Validators.max(6)]],
  });

  teams: ManageTeam[] = [];
  unassignedAttending: ManagePlayer[] = [];

  get teamDropListIds(): string[] {
    return this.teams.map(t => this.getTeamListId(t));
  }

  getTeamListId(team: ManageTeam): string {
    return `matchTeam-${team.id}`;
  }

  getConnectedTeamLists(currentMatchTeamId: number): string[] {
    // Permite mover desde/hacia el pool de no asignados y entre equipos.
    const currentListId = `matchTeam-${currentMatchTeamId}`;
    return ['unassignedList', ...this.teamDropListIds.filter(id => id !== currentListId)];
  }

  ngOnInit(): void {
    const teamIdParam = this.route.snapshot.paramMap.get('teamId');
    const matchIdParam = this.route.snapshot.paramMap.get('matchId');

    if (!teamIdParam || !matchIdParam) {
      this.router.navigate(['/dashboard', 'matches']);
      return;
    }

    this.teamId = Number(teamIdParam);
    this.matchId = Number(matchIdParam);

    if (!Number.isFinite(this.teamId) || !Number.isFinite(this.matchId)) {
      this.router.navigate(['/dashboard', 'matches']);
      return;
    }

    this.initialized = true;
    this.loadData();
  }

  ngOnDestroy(): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
  }

  reload(): void {
    this.loadData();
  }

  private showToast(type: 'success' | 'error' | 'info', message: string, durationMs = 2600): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }

    this.toast = { type, message };
    this.toastTimer = setTimeout(() => {
      this.toast = null;
      this.toastTimer = null;
    }, durationMs);
  }

  private showSuccessToast(message: string): void {
    // Evita spamear éxitos en acciones repetitivas (drag & drop rápido)
    const now = Date.now();
    if (now - this.lastSuccessToastAt < 1200) {
      return;
    }
    this.lastSuccessToastAt = now;
    this.showToast('success', message);
  }

  private loadData(): void {
    this.loading = true;
    this.errorMessage = '';
    this.infoMessage = '';

    forkJoin({
      team: this.teamService.getById(this.teamId).pipe(catchError(() => of(null))),
      matches: this.teamService.getMatches(this.teamId).pipe(catchError(() => of([]))),
      summary: this.teamService.getMatchAttendanceSummary(this.teamId, this.matchId).pipe(catchError(() => of(null))),
      matchTeams: this.teamService.getMatchTeams(this.teamId, this.matchId).pipe(catchError(() => of([] as MatchTeam[]))),
      result: this.teamService.getMatchResult(this.teamId, this.matchId).pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ team, matches, summary, matchTeams, result }) => {
        this.team = team;
        this.match = (matches || []).find(m => m.id === this.matchId) || null;

        this.canManage = this.computeCanManage(this.match, this.team);

        if (!this.match) {
          this.errorMessage = 'No se encontró el partido.';
          this.loading = false;
          return;
        }

        if (!summary) {
          this.errorMessage = 'No se pudo cargar el resumen de asistencia.';
          this.loading = false;
          return;
        }

        this.applySummary(summary);
        this.applyMatchTeams(matchTeams || []);
        this.syncUnassignedAttending();

        this.applyMatchResult(result);

        this.loading = false;

        if (!this.canManage) {
          // si no puede administrar, igual mostramos la cabecera y el mensaje
          return;
        }

        this.infoMessage = 'Arrastra jugadores para gestionar asistencia y equipos (se guarda al instante).';
      },
      error: () => {
        this.errorMessage = 'No se pudo cargar la información.';
        this.loading = false;
      }
    });
  }

  private applyMatchResult(result: TeamMatchResult | null): void {
    this.result = result;
    this.resultByEmail.clear();

    if (!result) {
      this.resultFinished = false;
      this.resultLocked = false;
      this.resultWasFinished = false;
      this.syncResultPlayersWithTeams();
      return;
    }

    this.resultFinished = !!result.finished;
    this.resultWasFinished = !!result.finished;
    this.resultLocked = !!result.finished;

    for (const t of result.teams || []) {
      for (const p of t.players || []) {
        this.resultByEmail.set(p.userEmail.toLowerCase(), {
          goals: Number(p.goals ?? 0),
          ownGoals: Number(p.ownGoals ?? 0),
        });
      }
    }

    this.syncResultPlayersWithTeams();
  }

  unlockResultEditing(): void {
    if (!this.canManage) {
      return;
    }
    if (!this.resultLocked) {
      return;
    }

    const ok = window.confirm('Este partido está marcado como finalizado. ¿Deseas editar el resultado?');
    if (!ok) {
      return;
    }
    this.resultLocked = false;
    this.showToast('info', 'Edición habilitada. Recuerda guardar los cambios.');
  }

  private syncResultPlayersWithTeams(): void {
    // Asegura que todos los jugadores asignados tengan entrada en el map (defaults 0/0)
    for (const t of this.teams) {
      for (const p of t.players) {
        const key = p.email.toLowerCase();
        if (!this.resultByEmail.has(key)) {
          this.resultByEmail.set(key, { goals: 0, ownGoals: 0 });
        }
      }
    }
  }

  getResultFor(email: string): { goals: number; ownGoals: number } {
    const key = (email || '').toLowerCase();
    const existing = this.resultByEmail.get(key);
    if (existing) {
      return existing;
    }
    const created = { goals: 0, ownGoals: 0 };
    this.resultByEmail.set(key, created);
    return created;
  }

  getTeamScore(teamId: number): number {
    // Marcador calculado: goles propios + autogoles del rival
    const teams = this.teams;
    const team = teams.find(t => t.id === teamId);
    if (!team) {
      return 0;
    }

    const ownGoals = team.players.reduce((sum, p) => sum + (this.getResultFor(p.email).goals || 0), 0);
    const opponentOwnGoals = teams
      .filter(t => t.id !== teamId)
      .flatMap(t => t.players)
      .reduce((sum, p) => sum + (this.getResultFor(p.email).ownGoals || 0), 0);

    return ownGoals + opponentOwnGoals;
  }

  saveResult(): void {
    if (!this.canManage || this.savingResult) {
      return;
    }

    if (this.resultLocked) {
      this.showToast('info', 'El resultado está bloqueado. Usa “Editar resultado”.');
      return;
    }

    if (this.teams.length === 0) {
      this.showToast('error', 'Primero crea equipos para registrar resultado');
      return;
    }

    const players: TeamMatchPlayerResultInput[] = this.teams
      .flatMap(t => t.players)
      .map(p => {
        const r = this.getResultFor(p.email);
        return {
          userEmail: p.email,
          goals: Math.max(0, Number(r.goals ?? 0)),
          ownGoals: Math.max(0, Number(r.ownGoals ?? 0)),
        };
      });

    const payload: TeamMatchResultUpsertRequest = {
      finished: !!this.resultFinished,
      players,
    };

    if (!this.resultWasFinished && payload.finished) {
      const ok = window.confirm('Vas a marcar el partido como finalizado. ¿Confirmas?');
      if (!ok) {
        return;
      }
    } else if (this.resultWasFinished) {
      const ok = window.confirm('El partido ya estaba finalizado. ¿Deseas actualizar el resultado igualmente?');
      if (!ok) {
        return;
      }
    }

    this.savingResult = true;
    this.teamService.upsertMatchResult(this.teamId, this.matchId, payload).subscribe({
      next: (res) => {
        this.savingResult = false;
        this.applyMatchResult(res);
        this.showSuccessToast('Resultado guardado');
      },
      error: () => {
        this.savingResult = false;
        this.showToast('error', 'No se pudo guardar el resultado');
      }
    });
  }

  private computeCanManage(match: TeamMatch | null, team: Team | null): boolean {
    const user = this.authService.getCurrentUserValue();
    if (!user || !match || !team) {
      return false;
    }

    if (match.createdByUserId != null) {
      return match.createdByUserId === user.id;
    }

    if (team.ownerEmail) {
      return team.ownerEmail.toLowerCase() === user.email.toLowerCase();
    }

    return team.ownerUserId === user.id;
  }

  private applySummary(summary: TeamMatchAttendanceSummary): void {
    const mapToPlayers = (items: TeamMatchAttendance[], status: MatchAttendanceStatus): ManagePlayer[] =>
      (items || [])
        .filter(a => a && typeof a.userId === 'number')
        .map(a => ({
          userId: a.userId,
          email: a.userEmail,
          displayName: this.getDisplayName(a),
          status,
        }));

    this.attending = mapToPlayers(summary.attending || [], 'ATTENDING');
    this.pending = mapToPlayers(summary.pending || [], 'PENDING');
    this.notAttending = mapToPlayers(summary.notAttending || [], 'NOT_ATTENDING');

    const sortByName = (a: ManagePlayer, b: ManagePlayer) => a.displayName.localeCompare(b.displayName);
    this.attending.sort(sortByName);
    this.pending.sort(sortByName);
    this.notAttending.sort(sortByName);

    // Si alguien dejó de asistir, lo removemos de equipos localmente.
    for (const p of this.pending) {
      this.removeFromTeams(p);
    }
    for (const p of this.notAttending) {
      this.removeFromTeams(p);
    }
  }

  private applyMatchTeams(matchTeams: MatchTeam[]): void {
    this.teams = (matchTeams || []).map(mt => ({
      id: mt.id,
      name: mt.name,
      color: mt.color,
      players: (mt.players || []).map(p => ({
        userId: p.userId,
        email: p.userEmail,
        displayName: p.userInfo?.fullName || p.userEmail,
        status: 'ATTENDING',
        assignedMatchTeamId: mt.id,
        position: p.position,
      })),
    }));

    // Sincronizar displayName para los jugadores asignados con los del summary (si existen).
    const byUserId = new Map<number, ManagePlayer>();
    for (const p of [...this.attending, ...this.pending, ...this.notAttending]) {
      byUserId.set(p.userId, p);
    }
    for (const t of this.teams) {
      for (const p of t.players) {
        const ref = byUserId.get(p.userId);
        if (ref) {
          p.displayName = ref.displayName;
          p.email = ref.email;
        }
      }
    }

    // Quitar de los equipos cualquier jugador que ya no esté en ATTENDING.
    const attendingIds = new Set(this.attending.map(p => p.userId));
    for (const t of this.teams) {
      t.players = t.players.filter(p => attendingIds.has(p.userId));
    }

    this.syncResultPlayersWithTeams();
  }

  private getDisplayName(item: TeamMatchAttendance): string {
    const info = item.userInfo;
    const fullName = info?.fullName?.trim();
    const first = info?.firstName?.trim();
    const last = info?.lastName?.trim();

    if (fullName) {
      return fullName;
    }

    const concat = `${first ?? ''} ${last ?? ''}`.trim();
    return concat || item.userEmail;
  }

  dropAttendance(event: CdkDragDrop<ManagePlayer[]>, newStatus: MatchAttendanceStatus): void {
    if (!this.canManage) {
      return;
    }

    if (event.previousContainer === event.container) {
      return;
    }

    // Identificar el jugador desde el contenedor origen (antes de moverlo)
    const movedFrom = event.previousContainer.data[event.previousIndex];
    const previousTeam = newStatus !== 'ATTENDING' ? this.findContainingTeam(movedFrom.userId) : null;

    // Optimistic UI
    transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
    const moved = event.container.data[event.currentIndex];
    const previousStatus = moved.status;
    moved.status = newStatus;

    if (newStatus !== 'ATTENDING') {
      this.removeFromTeams(moved);
    }

    this.syncUnassignedAttending();

    // Persistir en backend (PUT /attendance/{userId})
    this.teamService.setMatchAttendanceStatus(this.teamId, this.matchId, moved.userId, newStatus).subscribe({
      next: (summary) => {
        this.applySummary(summary);
        this.syncUnassignedAttending();

        // Por UX, no mostramos toast de éxito aquí (es muy frecuente). Solo errores.

        // Si ahora no asiste / pendiente y estaba asignado a un equipo, quitarlo en backend.
        if (newStatus !== 'ATTENDING' && previousTeam) {
          this.teamService.removePlayerFromMatchTeam(this.teamId, this.matchId, previousTeam.id, moved.userId).subscribe({
            next: () => {
              this.reloadTeams();
            },
            error: () => {
              this.errorMessage = 'No se pudo desasignar al jugador del equipo.';
              this.showToast('error', 'No se pudo desasignar del equipo');
              this.reloadTeams();
            }
          });
        }
      },
      error: () => {
        // revert UI
        const container = this.getListForStatus(newStatus);
        const originalContainer = this.getListForStatus(previousStatus);
        const idx = container.findIndex(p => p.userId === moved.userId);
        if (idx >= 0) {
          const [back] = container.splice(idx, 1);
          back.status = previousStatus;
          originalContainer.push(back);
        }
        this.errorMessage = 'No se pudo actualizar la asistencia del jugador.';
        this.showToast('error', 'No se pudo actualizar la asistencia');
        this.syncUnassignedAttending();
        this.reloadTeams();
      }
    });
  }

  private getListForStatus(status: MatchAttendanceStatus): ManagePlayer[] {
    if (status === 'ATTENDING') return this.attending;
    if (status === 'PENDING') return this.pending;
    return this.notAttending;
  }

  generateTeams(): void {
    if (!this.canManage || this.teamsForm.invalid) {
      return;
    }

    const count = Number(this.teamsForm.value.count);
    if (!Number.isFinite(count) || count < 2) {
      return;
    }

    const palette = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#14b8a6'];
    const teams = Array.from({ length: count }).map((_, i) => ({
      name: `Equipo ${i + 1}`,
      color: palette[i % palette.length],
    }));

    this.creatingTeams = true;
    this.teamService.createMatchTeamsBulk(this.teamId, this.matchId, teams).subscribe({
      next: () => {
        this.creatingTeams = false;
        this.showSuccessToast('Equipos creados');
        this.reloadTeams();
      },
      error: () => {
        this.creatingTeams = false;
        this.errorMessage = 'No se pudieron crear los equipos.';
        this.showToast('error', 'No se pudieron crear los equipos');
      }
    });
  }

  private reloadTeams(): void {
    this.teamService.getMatchTeams(this.teamId, this.matchId).subscribe({
      next: (teams) => {
        this.applyMatchTeams(teams || []);
        this.syncUnassignedAttending();
      },
      error: () => {
        this.errorMessage = 'No se pudo refrescar la lista de equipos.';
      }
    });
  }

  saveTeam(team: ManageTeam): void {
    if (!this.canManage) {
      return;
    }

    this.teamService.updateMatchTeam(this.teamId, this.matchId, team.id, { name: team.name, color: team.color }).subscribe({
      next: (updated) => {
        team.name = updated.name;
        team.color = updated.color;
        this.showSuccessToast('Equipo guardado');
      },
      error: () => {
        this.errorMessage = 'No se pudo guardar el equipo.';
        this.showToast('error', 'No se pudo guardar el equipo');
      }
    });
  }

  deleteTeam(team: ManageTeam): void {
    if (!this.canManage) {
      return;
    }

    this.teamService.deleteMatchTeam(this.teamId, this.matchId, team.id).subscribe({
      next: () => {
        this.teams = this.teams.filter(t => t.id !== team.id);
        this.syncUnassignedAttending();
        this.showSuccessToast('Equipo eliminado');
      },
      error: () => {
        this.errorMessage = 'No se pudo eliminar el equipo.';
        this.showToast('error', 'No se pudo eliminar el equipo');
      }
    });
  }

  dropTeam(event: CdkDragDrop<ManagePlayer[]>, targetTeam: ManageTeam | null): void {
    if (!this.canManage || this.teams.length === 0) {
      return;
    }

    if (event.previousContainer === event.container) {
      return;
    }

    transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
    const moved = event.container.data[event.currentIndex];

    // Solo asistentes
    if (moved.status !== 'ATTENDING') {
      this.errorMessage = 'Solo puedes asignar a equipos a jugadores que asisten.';
      this.reloadTeams();
      return;
    }

    if (targetTeam) {
      const pos = moved.position ?? 'MIDFIELDER';
      moved.assignedMatchTeamId = targetTeam.id;
      moved.position = pos;

      this.teamService.assignPlayerToMatchTeam(this.teamId, this.matchId, targetTeam.id, moved.userId, pos).subscribe({
        next: () => {
          this.reloadTeams();
        },
        error: () => {
          this.errorMessage = 'No se pudo asignar el jugador al equipo.';
          this.showToast('error', 'No se pudo asignar al equipo');
          this.reloadTeams();
        }
      });
    } else {
      // Quitar del equipo: usar el matchTeamId desde el contenedor origen
      const fromTeamId = this.parseMatchTeamIdFromDropListId(event.previousContainer.id);
      moved.assignedMatchTeamId = undefined;
      moved.position = undefined;

      if (fromTeamId != null) {
        this.teamService.removePlayerFromMatchTeam(this.teamId, this.matchId, fromTeamId, moved.userId).subscribe({
          next: () => {
            this.reloadTeams();
          },
          error: () => {
            this.errorMessage = 'No se pudo quitar el jugador del equipo.';
            this.showToast('error', 'No se pudo quitar del equipo');
            this.reloadTeams();
          }
        });
      }
    }

    this.syncUnassignedAttending();
  }

  private findContainingTeam(userId: number): ManageTeam | null {
    for (const t of this.teams) {
      if (t.players.some(p => p.userId === userId)) {
        return t;
      }
    }
    return null;
  }

  private parseMatchTeamIdFromDropListId(listId: string): number | null {
    // Formato esperado: matchTeam-<id>
    const match = /^matchTeam-(\d+)$/.exec(listId);
    if (!match) {
      return null;
    }
    const id = Number(match[1]);
    return Number.isFinite(id) ? id : null;
  }

  onPositionChange(team: ManageTeam, player: ManagePlayer): void {
    if (!this.canManage || !player.position) {
      return;
    }

    this.teamService.assignPlayerToMatchTeam(this.teamId, this.matchId, team.id, player.userId, player.position).subscribe({
      next: () => {
        // no toast de éxito para no spamear
      },
      error: () => {
        this.errorMessage = 'No se pudo actualizar la posición.';
        this.showToast('error', 'No se pudo actualizar la posición');
        this.reloadTeams();
      }
    });
  }

  finishAndNotify(): void {
    if (!this.canManage || this.loading || this.notifying) {
      return;
    }

    if (this.teams.length === 0) {
      this.showToast('error', 'Primero crea equipos para el partido');
      return;
    }

    if (this.unassignedAttending.length > 0) {
      this.showToast('error', 'Faltan jugadores por asignar a equipos');
      return;
    }

    const anyMissingPosition = this.teams.some(t => t.players.some(p => !p.position));
    if (anyMissingPosition) {
      this.showToast('error', 'Hay jugadores sin posición asignada');
      return;
    }

    this.notifying = true;
    this.teamService.notifyMatchTeams(this.teamId, this.matchId).subscribe({
      next: () => {
        this.notifying = false;
        this.showToast('success', 'Notificación enviada a los equipos');
        setTimeout(() => this.goBack(), 700);
      },
      error: () => {
        this.notifying = false;
        this.showToast('error', 'No se pudo enviar la notificación');
      }
    });
  }

  private syncUnassignedAttending(): void {
    // Los disponibles son los que están en ATTENDING y no están asignados a ningún equipo
    const teamPlayers = new Set<number>();
    for (const t of this.teams) {
      for (const p of t.players) {
        teamPlayers.add(p.userId);
      }
    }

    this.unassignedAttending = this.attending.filter(p => !teamPlayers.has(p.userId));

    // Asegurar que ningún jugador asignado permanezca duplicado en la lista
    // (al arrastrar, transferArrayItem ya evita duplicados, esto es un safety)
    this.unassignedAttending = [...this.unassignedAttending];
  }

  private removeFromTeams(player: ManagePlayer): void {
    for (const t of this.teams) {
      const idx = t.players.findIndex(p => p.userId === player.userId);
      if (idx >= 0) {
        t.players.splice(idx, 1);
      }
    }

    player.assignedMatchTeamId = undefined;
    player.position = undefined;
  }

  goBack(): void {
    this.router.navigate(['/dashboard', 'matches']);
  }
}
