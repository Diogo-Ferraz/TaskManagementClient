import { Injectable, inject } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { ActivityLogDto } from '../api/models/activity.model';
import { APP_ENVIRONMENT } from '../config/app-environment.token';
import { AuthService } from '../auth/services/auth.service';

@Injectable({ providedIn: 'root' })
export class ActivityHubRealtimeService {
  private readonly appEnvironment = inject(APP_ENVIRONMENT);
  private readonly authService = inject(AuthService);
  private readonly activityCreatedSubject = new Subject<ActivityLogDto>();
  private connection: HubConnection | null = null;

  activityCreated$(): Observable<ActivityLogDto> {
    return this.activityCreatedSubject.asObservable();
  }

  async connect(): Promise<void> {
    if (!this.authService.accessToken()) {
      return;
    }

    const connection = this.getOrCreateConnection();
    if (connection.state !== HubConnectionState.Disconnected) {
      return;
    }

    await connection.start();
    await this.joinScope(connection);
  }

  async disconnect(): Promise<void> {
    if (!this.connection) {
      return;
    }

    if (this.connection.state !== HubConnectionState.Disconnected) {
      await this.connection.stop();
    }
  }

  private getOrCreateConnection(): HubConnection {
    if (this.connection) {
      return this.connection;
    }

    const hubUrl = `${this.appEnvironment.apiBaseUrl.replace(/\/$/, '')}${this.appEnvironment.activityHubPath}`;

    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => this.authService.accessToken() ?? ''
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.Warning)
      .build();

    connection.on('activity-created', (event: ActivityLogDto) => {
      this.activityCreatedSubject.next(event);
    });

    connection.onreconnected(async () => {
      await this.joinScope(connection);
    });

    this.connection = connection;
    return connection;
  }

  private async joinScope(connection: HubConnection): Promise<void> {
    try {
      await connection.invoke('JoinAllProjects');
    } catch {
      // Allow automatic reconnect to retry the scope join if the server is briefly unavailable.
    }
  }
}
