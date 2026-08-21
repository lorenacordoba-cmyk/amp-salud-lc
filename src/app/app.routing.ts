import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const commonsRoutes: Routes = [
	{
		path: '',
		loadChildren: () => import('./pages/home/home.module').then((m) => m.HomeModule)
	},
	{ path: '**', redirectTo: '' }
];

@NgModule({
	imports: [RouterModule.forRoot(commonsRoutes, {})],
	exports: [RouterModule]
})
export class AppRoutingModule {}
