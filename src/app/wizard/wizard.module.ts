import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { WizardPageRoutingModule } from './wizard-routing.module';

import { WizardPage } from './wizard.page';
import { WizardStepAssistantsComponent } from './components/wizard-step-assistants.component';
import { WizardStepChannelsComponent } from './components/wizard-step-channels.component';
import { WizardStepInfrastructureComponent } from './components/wizard-step-infrastructure.component';
import { WizardStepVolumeComponent } from './components/wizard-step-volume.component';
import { WizardStepReviewComponent } from './components/wizard-step-review.component';
import { WizardStepPeriodComponent } from './components/wizard-step-period.component';
import { LeadCaptureModalComponent } from './components/lead-capture-modal.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    WizardPageRoutingModule
  ],
  declarations: [
    WizardPage,
    WizardStepAssistantsComponent,
    WizardStepChannelsComponent,
    WizardStepInfrastructureComponent,
    WizardStepVolumeComponent,
    WizardStepReviewComponent,
    WizardStepPeriodComponent,
    LeadCaptureModalComponent
  ]
})
export class WizardPageModule {}
