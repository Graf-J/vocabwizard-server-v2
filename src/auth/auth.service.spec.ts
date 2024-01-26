import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { createMock } from '@golevelup/ts-jest';
import * as bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../user/roles.enum';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: createMock<JwtService>(),
        },
      ],
    }).compile();

    service = module.get(AuthService);
    jwtService = module.get(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateJWT', () => {
    it('should call the signAsync method from the JwtService with arguments', () => {
      service.generateJWT('userId', Role.user);

      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 'userId',
        role: Role.user,
      });
    });
  });

  describe('validatePassword', () => {
    it('should throw exception if bcrypt decides passwords do not match', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const responsePromise = service.validatePassword(
        'invalidPassword',
        'passwordHash',
      );

      expect(responsePromise).rejects.toThrow(UnauthorizedException);
      expect(responsePromise).rejects.toThrow(
        'Username or Password is not valid',
      );
    });

    it('should throw no exception if bcrypt decides passwords do match', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const responsePromise = service.validatePassword(
        'validPassword',
        'passwordHash',
      );

      expect(responsePromise).resolves.not.toThrow();
    });
  });
});
