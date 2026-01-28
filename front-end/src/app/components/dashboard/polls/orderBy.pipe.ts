import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'orderBy'
})
export class OrderByPipe implements PipeTransform {
  transform(array: any[], field: string, desc: boolean = false): any[] {
    if (!Array.isArray(array)) return array;
    const sorted = [...array].sort((a, b) => {
      if (a[field] == null && b[field] == null) return 0;
      if (a[field] == null) return 1;
      if (b[field] == null) return -1;
      if (a[field] < b[field]) return desc ? 1 : -1;
      if (a[field] > b[field]) return desc ? -1 : 1;
      return 0;
    });
    return sorted;
  }
}
