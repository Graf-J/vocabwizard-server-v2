import {
  Controller,
  Post,
  Body,
  ConflictException,
  UnauthorizedException,
  HttpCode,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginUserDto } from './dto/login-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { UserService } from '../user/user.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @HttpCode(200)
  @Post('/login')
  async login(@Body() loginUserDto: LoginUserDto) {
    // Check if User exists
    const user = await this.userService.findOneByName(loginUserDto.name);
    if (!user) {
      throw new UnauthorizedException('Username or Password is not valid');
    }
    // Validate Password
    await this.authService.validatePassword(
      loginUserDto.password,
      user.passwordHash,
    );
    // Generate and return JsonWebToken
    const jwt = await this.authService.generateJWT(user.id, user.role);
    return { AccessToken: jwt };
  }

  @Post('/register')
  async register(@Body() registerUserDto: RegisterUserDto) {
    // Check if User already exists
    const user = await this.userService.findOneByName(registerUserDto.name);
    if (user) {
      throw new ConflictException(
        `User with name ${registerUserDto.name} already exist`,
      );
    }
    // Create User and generate JsonWebToken
    const newUser = await this.userService.create(registerUserDto);
    const jwt = await this.authService.generateJWT(newUser.id, newUser.role);

    return { AccessToken: jwt };
  }
}
