import { Controller, Get } from '@nestjs/common';

@Controller({ path: '', version:'1'})
export class AppController {

  @Get()
  getHello(): string {
    return "Worko API is working";
  }
}
