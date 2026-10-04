import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const commonsRoutes: Routes = [
  { path: 'contacto', loadComponent: () => import('./pages/contact/contact.component').then((m) => m.ContactComponent) },
  { path: 'especialidades/:slug', loadComponent: () => import('./pages/specialty/specialty.component').then((m) => m.SpecialtyComponent) },
  { path: '', loadChildren: () => import('./pages/home/home.module').then((m) => m.HomeModule) },
  { path: '**', redirectTo: '' }
];
@NgModule({imports:[RouterModule.forRoot(commonsRoutes,{scrollPositionRestoration:'top',anchorScrolling:'enabled'})],exports:[RouterModule]})
export class AppRoutingModule {}
