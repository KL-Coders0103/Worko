import { IsString, MaxLength, MinLength } from 'class-validator';

export class PasswordLoginDto {
  @IsString()
  identifier!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}