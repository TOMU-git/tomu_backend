import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseDatePipe implements PipeTransform {
  transform(value: string): Date {
    const dateParts = value.split("-");
    if (dateParts.length === 3) {
      const [day, month, year] = dateParts.map(Number);
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    throw new BadRequestException("selectedDay must be a valid Date in 'YYYY-MM-DD' or 'DD/MM/YYYY' format.");
  }
}
