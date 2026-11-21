const fs=require('node:fs'), vm=require('node:vm'), ts=require('typescript');const assert=require('node:assert/strict');
const src=fs.readFileSync(__dirname+'/../src/app/shared/assistant/assistant.component.ts','utf8');
const compiled=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,experimentalDecorators:true}}).outputText;
const vmExports={};
const win={innerWidth:1200,innerHeight:800};
class DomElement{closest(){return null;}}
const context={exports:vmExports,window:win,Element:DomElement,require(name){if(name==='@angular/core')return{Component:()=>x=>x,ViewChild:()=>()=>{},ChangeDetectionStrategy:{OnPush:0},inject:()=>({})};if(name==='@angular/common')return{CommonModule:{}};if(name==='@angular/forms')return{FormsModule:{}};if(name.endsWith('/environment'))return{environment:{}};return new Proxy({}, {get:()=>class{}});},console};
vm.runInNewContext(compiled,context,{filename:'assistant.component.compiled.cjs'});
const proto=vmExports.AssistantComponent.prototype;
const assistant=Object.create(proto);assistant.isDesktopViewport=true;assistant.assistantOpen=true;assistant.panelPosition=null;assistant.dragAnchor=null;assistant.isDragging=false;assistant.cdr={markForCheck(){}};
const panel={offsetWidth:420,offsetHeight:500,getBoundingClientRect(){return{left:750,top:180}}};
assistant.assistantPanel={nativeElement:panel};
const header={currentCapture:null,setPointerCapture(id){this.currentCapture=id;},hasPointerCapture(id){return this.currentCapture===id;},releasePointerCapture(){this.currentCapture=null;}};
function event(x,y){return {button:0,pointerId:1,clientX:x,clientY:y,target:new DomElement(),currentTarget:header,preventDefault(){}};}
assistant.onPanelPointerDown(event(755,185));assert.equal(assistant.isDragging,true);
assistant.onPanelPointerMove(event(500,325));assert.equal(assistant.panelPosition.left,495);assert.equal(assistant.panelPosition.top,292);
assistant.onPanelPointerMove(event(-2000,-2000));assert.equal(assistant.panelPosition.left,8);assert.equal(assistant.panelPosition.top,8);
assistant.onPanelPointerMove(event(2000,2000));assert.equal(assistant.panelPosition.left,772);assert.equal(assistant.panelPosition.top,292);
assistant.onPanelPointerUp(event(2000,2000));assert.equal(assistant.isDragging,false);assert.equal(header.currentCapture,null);
assistant.centerAssistant();assert.equal(assistant.panelPosition.left,390);assert.equal(assistant.panelPosition.top,150);
assistant.isDesktopViewport=false;assistant.panelPosition=null;assistant.onPanelPointerDown(event(755,185));assert.equal(assistant.dragAnchor,null);
console.log('Drag runtime simulation OK: pointer, bounds, release, center, mobile unchanged');
