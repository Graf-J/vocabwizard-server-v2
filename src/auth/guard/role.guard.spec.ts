import { Test, TestingModule } from '@nestjs/testing';
import { RoleGuard } from './role.guard';
import { Reflector } from '@nestjs/core';
import { DeepMocked, createMock } from '@golevelup/ts-jest';
import { ExecutionContext } from '@nestjs/common';
import { Role } from '../../user/roles.enum';

describe('RoleGuard', () => {
  let guard: RoleGuard;
  let reflector: DeepMocked<Reflector>;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        RoleGuard,
        {
          provide: Reflector,
          useValue: createMock<Reflector>(),
        },
      ],
    }).compile();

    guard = moduleRef.get(RoleGuard);
    reflector = moduleRef.get(Reflector);
  });

  it('should return false if roles do not match', () => {
    const mockExecutionContext = createMock<ExecutionContext>();
    mockExecutionContext.switchToHttp().getRequest.mockReturnValue({
      user: {
        role: Role.user,
      },
    });

    reflector.getAllAndOverride.mockReturnValue(Role.administrator);

    expect(guard.canActivate(mockExecutionContext)).toBeFalsy();
  });

  it('should return true if no role is specified', () => {
    const mockExecutionContext = createMock<ExecutionContext>();

    reflector.getAllAndOverride.mockReturnValue(null);

    expect(guard.canActivate(mockExecutionContext)).toBeTruthy();
  });

  it('should return true if roles match', () => {
    const mockExecutionContext = createMock<ExecutionContext>();
    mockExecutionContext.switchToHttp().getRequest.mockReturnValue({
      user: {
        role: Role.administrator,
      },
    });

    reflector.getAllAndOverride.mockReturnValue(Role.administrator);

    expect(guard.canActivate(mockExecutionContext)).toBeTruthy();
  });
});
