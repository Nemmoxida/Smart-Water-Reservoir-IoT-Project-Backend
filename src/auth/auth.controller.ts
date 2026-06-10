import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

type UserAuthPayload = {
  username: string;
  password: string;
};

@Controller('login')
export class AuthController {
  constructor(private readonly AuthService: AuthService) {}

  @Post()
  tokenVerify(@Body() payload: UserAuthPayload) {
    if (payload.username != 'kermit' && payload.password != 'Ikdoon6002') {
      throw new UnauthorizedException('Invalid username or password');
    }
    return this.AuthService.verify(payload.username);
  }
}
