import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';


import { AppRoutingModule } from './app.routing';
import { CoreModule } from './@core/core.module';

@NgModule({
	imports: [BrowserModule, FormsModule, CoreModule, AppRoutingModule],
	providers: [provideHttpClient(withInterceptorsFromDi())]
})
export class AppModule {}
