import { Test } from '@nestjs/testing';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { UserDocument } from 'src/user/user.schema';
import { ConflictException, UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  let userService: DeepMocked<UserService>;
  let authService: DeepMocked<AuthService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: UserService,
          useValue: createMock<UserService>(),
        },
        {
          provide: AuthService,
          useValue: createMock<AuthService>(),
        },
      ],
    }).compile();

    controller = moduleRef.get(AuthController);
    userService = moduleRef.get(UserService);
    authService = moduleRef.get(AuthService);

    authService.generateJWT.mockResolvedValue('JsonWebToken');
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should throw exception if User with Name not found', async () => {
      userService.findOneByName.mockResolvedValue(null as UserDocument);

      try {
        await controller.login({
          name: 'TestUser',
          password: 'mytestpassword',
        });

        fail('Expected an exception to be thrown, but it did not');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        expect(error.message).toBe('Username or Password is not valid');
      }
    });

    it('should return AccessToken', async () => {
      userService.findOneByName.mockResolvedValue({
        passwordHash: 'testPasswordHash',
      } as UserDocument);

      const response = await controller.login({
        name: 'TestUser',
        password: 'mytestpassword',
      });

      expect(response).toEqual({ AccessToken: 'JsonWebToken' });
    });
  });

  describe('register', () => {
    it('should throw exception if User already exists', async () => {
      try {
        userService.findOneByName.mockResolvedValue({
          name: 'TestUser',
        } as UserDocument);

        await controller.register({
          name: 'TestUser',
          password: 'TestPassword',
          passwordConfirmation: 'TestPassword',
        });

        fail('Expected an exception to be thrown, but it did not');
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictException);
        expect(error.message).toBe('User with name TestUser already exist');
      }
    });

    it('should successfully return AccessToken', async () => {
      userService.findOneByName.mockResolvedValue(null as UserDocument);

      const response = await controller.register({
        name: 'TestUser',
        password: 'TestPassword',
        passwordConfirmation: 'TestPassword',
      });

      expect(response).toEqual({ AccessToken: 'JsonWebToken' });
    });
  });
});
