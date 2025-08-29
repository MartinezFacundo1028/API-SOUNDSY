import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtOptionalGuard extends AuthGuard('jwt') {
  // Permite que el request pase incluso si no hay token
  handleRequest(err, user, info) {
    if (err || !user) {
      return null; // No usuario autenticado, pero no lanza error
    }
    return user;
  }
}
