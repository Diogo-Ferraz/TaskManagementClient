import { NgModule } from '@angular/core';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MenuModule } from 'primeng/menu';
import { AvatarModule } from 'primeng/avatar';
import { AvatarGroupModule } from 'primeng/avatargroup';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputSwitchModule } from 'primeng/inputswitch';
import { TableModule } from 'primeng/table';
import { DropdownModule } from 'primeng/dropdown';
import { MultiSelectModule } from 'primeng/multiselect';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { SliderModule } from 'primeng/slider';
import { ChipModule } from 'primeng/chip';
import { DragDropModule } from 'primeng/dragdrop';
import { ToolbarModule } from 'primeng/toolbar';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { RippleModule } from 'primeng/ripple';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { CalendarModule } from 'primeng/calendar';
import { StepsModule } from 'primeng/steps';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessagesModule } from 'primeng/messages';
import { ExpandableTextComponent } from './components/expandable-text/expandable-text.component';

@NgModule({
  imports: [ExpandableTextComponent],
  exports: [
    ExpandableTextComponent,
    CommonModule,
    CardModule,
    InputTextModule,
    ButtonModule,
    FormsModule,
    ReactiveFormsModule,
    MenuModule,
    AvatarModule,
    AvatarGroupModule,
    IconFieldModule,
    InputIconModule,
    InputSwitchModule,
    TableModule,
    InputTextModule,
    TagModule, 
    DropdownModule,
    MultiSelectModule,
    ProgressBarModule,
    SliderModule,
    IconFieldModule,
    InputIconModule,
    MultiSelectModule,
    ChipModule,
    DragDropModule,
    ToolbarModule,
    CheckboxModule,
    TooltipModule,
    ProgressSpinnerModule,
    RippleModule,
    SkeletonModule,
    ToastModule,
    CalendarModule,
    StepsModule,
    ConfirmDialogModule,
    MessagesModule
  ],
})
export class SharedModule {}
