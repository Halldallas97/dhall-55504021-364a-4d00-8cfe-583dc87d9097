import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { CreateUser, User } from '@dhall-55504021-364a-4d00-8cfe-583dc87d9097/data';

@Controller('user')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('create')
  @HttpCode(HttpStatus.OK)
  createUser(@Body() user: CreateUser): Promise<User> {
    return this.appService.createUser(user);
  }
}
