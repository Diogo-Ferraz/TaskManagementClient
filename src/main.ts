import { bootstrapApplication } from '@angular/platform-browser';
import { buildAppConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';
import { loadRuntimeEnvironment } from './app/core/config/runtime-environment.loader';

async function bootstrap(): Promise<void> {
  const runtimeEnvironment = await loadRuntimeEnvironment(environment);
  await bootstrapApplication(AppComponent, buildAppConfig(runtimeEnvironment));
}

void bootstrap().catch((err) => console.error(err));
