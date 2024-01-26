import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from './auth.guard';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { DeepMocked, createMock } from '@golevelup/ts-jest';
import { JwtService } from '@nestjs/jwt';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let jwtService: DeepMocked<JwtService>;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        {
          provide: JwtService,
          useValue: createMock<JwtService>(),
        },
      ],
    }).compile();

    guard = moduleRef.get(AuthGuard);
    jwtService = moduleRef.get(JwtService);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should throw exception if authorization header is missing', async () => {
    const mockExecutionContext = createMock<ExecutionContext>();
    mockExecutionContext.switchToHttp().getRequest.mockReturnValue({
      headers: {},
    });

    expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw exception if Bearer is missing', async () => {
    const mockExecutionContext = createMock<ExecutionContext>();
    mockExecutionContext.switchToHttp().getRequest.mockReturnValue({
      headers: {
        authorization: 'JWT',
      },
    });

    expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should return false if token can not be verified', async () => {
    const mockExecutionContext = createMock<ExecutionContext>();
    mockExecutionContext.switchToHttp().getRequest.mockReturnValue({
      headers: {
        authorization: 'Bearer InvalidJWT',
      },
    });

    jwtService.verifyAsync.mockRejectedValue(ForbiddenException);

    expect(guard.canActivate(mockExecutionContext)).resolves.toBeFalsy();
  });

  it('should return true if token can be verified', async () => {
    const mockExecutionContext = createMock<ExecutionContext>();
    mockExecutionContext.switchToHttp().getRequest.mockReturnValue({
      headers: {
        authorization: 'Bearer ValidJWT',
      },
    });

    jwtService.verifyAsync.mockResolvedValue({});

    expect(guard.canActivate(mockExecutionContext)).resolves.toBeTruthy();
  });
});
