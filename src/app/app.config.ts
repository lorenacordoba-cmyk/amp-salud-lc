import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { CoreModule } from './@core/core.module';
import { AppRoutingModule } from './app.routing';

export const appConfig: ApplicationConfig = {
	providers: [
		importProvidersFrom(BrowserModule, FormsModule, CoreModule, AppRoutingModule),
		provideHttpClient(withInterceptorsFromDi())
	]
};
