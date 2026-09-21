import {
  IsBoolean,
} from 'class-validator';

export class DemoPaymentDto {
  @IsBoolean()
  success!: boolean;
}