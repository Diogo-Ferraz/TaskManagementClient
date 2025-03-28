import { Component } from '@angular/core';
import { SharedModule } from '../../../../shared/shared.module';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  cardItems = [
    { title: 'Users', value: '3,452', icon: 'pi pi-users', stat: '+120', description: 'since last week', iconColor: 'text-blue-500', bgColor: 'bg-blue-100 dark:bg-blue-400/10' },
    { title: 'Sales', value: '$14,500', icon: 'pi pi-shopping-cart', stat: '+5%', description: 'since yesterday', iconColor: 'text-green-500', bgColor: 'bg-green-100 dark:bg-green-400/10' },
    { title: 'Revenue', value: '$98,200', icon: 'pi pi-chart-line', stat: '+12%', description: 'this month', iconColor: 'text-orange-500', bgColor: 'bg-orange-100 dark:bg-orange-400/10' },
    { title: 'Support', value: '48 tickets', icon: 'pi pi-envelope', stat: '-3%', description: 'pending cases', iconColor: 'text-purple-500', bgColor: 'bg-purple-100 dark:bg-purple-400/10' }
  ];
}
