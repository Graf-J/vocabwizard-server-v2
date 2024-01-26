import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../user/roles.enum';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async generateJWT(id: string, role: Role) {
    return await this.jwtService.signAsync({ sub: id, role: role });
  }

  async validatePassword(password: string, passwordHash: string) {
    const isPasswordValid = await bcrypt.compare(password, passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Username or Password is not valid');
    }
  }
}
