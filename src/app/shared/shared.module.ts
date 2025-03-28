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

@NgModule({
  exports: [
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
    MultiSelectModule
  ],
})
export class SharedModule {}
