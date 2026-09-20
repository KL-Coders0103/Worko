import { IsString, Length } from 'class-validator';

export class GoogleAuthDto {
  @IsString()
  @Length(20, 5000)
  idToken!: string;
}