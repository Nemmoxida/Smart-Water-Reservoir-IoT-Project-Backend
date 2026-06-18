import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private jwt: JwtService) {}

  async verify(username: string) {
    const payload = { username: username };

    return {
      token: await this.jwt.signAsync(payload),
    };
  }
}
