import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'memberSearch',
  standalone: true
})
export class MemberSearchPipe implements PipeTransform {
  transform(members: any[], searchTerm: string): any[] {
    if (!searchTerm) return members;
    const term = searchTerm.toLowerCase();
    return members.filter(m => {
      const name = (m.userInfo?.firstName || '') + ' ' + (m.userInfo?.lastName || '');
      const email = m.userEmail || '';
      return name.toLowerCase().includes(term) || email.toLowerCase().includes(term);
    });
  }
}