import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';

import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey:
        process.env.SECRET ||
        'dqwojonadsijnd1298erjko3bnrnsfjknsadnjn21394rhe3jbs',
    });
  }

  // eslint-disable-next-line
  async validate(payload: string) {
    return payload;
  }
}
