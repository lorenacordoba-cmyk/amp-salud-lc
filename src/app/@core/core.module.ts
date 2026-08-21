import { CommonModule } from '@angular/common';
import { NgModule, Optional, SkipSelf } from '@angular/core';
import { RouterModule } from '@angular/router';

@NgModule({
	imports: [CommonModule, RouterModule],
	providers: []
})
export class CoreModule {
	constructor(@Optional() @SkipSelf() parentModule: CoreModule) {
		// Import guard
		if (parentModule) {
			throw new Error(`the parentModule has already been loaded. Import Core module in the AppModule only.`);
		}
	}
}
