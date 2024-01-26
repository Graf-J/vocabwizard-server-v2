import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Role } from './roles.enum';
import { UserDocument } from './user.schema';
import { AuthGuardRequest } from '../util/request/auth-guard.request';
import { ConflictException } from '@nestjs/common';

describe('UserController', () => {
  let controller: UserController;
  let userService: DeepMocked<UserService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: createMock<UserService>(),
        },
      ],
    })
      .useMocker(createMock)
      .compile();

    controller = module.get(UserController);
    userService = module.get(UserService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return a list of users', async () => {
      userService.findAll.mockResolvedValue([
        {
          id: '1',
          name: 'pw1',
          passwordHash: 'hash1',
          role: Role.user,
          createdAt: new Date(),
        } as UserDocument,
        {
          id: '2',
          name: 'pw2',
          passwordHash: 'hash2',
          role: Role.administrator,
          createdAt: new Date(),
        } as UserDocument,
      ]);

      const response = await controller.findAll();
      // Check the important properties are present
      response.forEach((user) => {
        expect(user).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            role: expect.any(String),
            createdAt: expect.any(Date),
          }),
        );

        // Check the passwordHash gets excluded from the response
        expect(user).not.toEqual(
          expect.objectContaining({
            passwordHash: expect.anything(),
          }),
        );
      });
    });
  });

  describe('remove', () => {
    let request: AuthGuardRequest;

    beforeEach(() => {
      request = createMock<AuthGuardRequest>();
      request.user.id = '1';
    });

    it('should throw exception if user tries to delete himself', async () => {
      const responsePromise = controller.remove(request, '1');
      await expect(responsePromise).rejects.toThrow(ConflictException);
      await expect(responsePromise).rejects.toThrow(
        'You are not allowed to delete yourself',
      );
      expect(userService.remove).toHaveBeenCalledTimes(0);
    });

    it('should delete user', async () => {
      await expect(controller.remove(request, '2')).resolves.not.toThrow();
      expect(userService.remove).toHaveBeenCalledTimes(1);
    });
  });
});
