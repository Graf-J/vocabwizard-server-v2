import { Test, TestingModule } from '@nestjs/testing';
import { OwnDeckOrAdminGuard } from './ownDeckOrAdmin.guard';
import { DeepMocked, createMock } from '@golevelup/ts-jest';
import { DeckService } from '../../deck/deck.service';
import {
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '../../user/roles.enum';
import { DeckDocument } from 'src/deck/deck.schema';

describe('AuthGuard', () => {
  let guard: OwnDeckOrAdminGuard;
  let deckService: DeepMocked<DeckService>;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        OwnDeckOrAdminGuard,
        {
          provide: DeckService,
          useValue: createMock<DeckService>(),
        },
      ],
    }).compile();

    guard = moduleRef.get(OwnDeckOrAdminGuard);
    deckService = moduleRef.get(DeckService);
  });

  it('should return false if request parameters are missing', async () => {
    const mockExecutionContext = createMock<ExecutionContext>();
    mockExecutionContext.switchToHttp().getRequest.mockReturnValue({});

    expect(guard.canActivate(mockExecutionContext)).rejects.toThrow();
  });

  it('should throw exception if DeckId is not valid', async () => {
    const mockExecutionContext = createMock<ExecutionContext>();
    mockExecutionContext.switchToHttp().getRequest.mockReturnValue({
      user: {
        id: 'id',
        role: Role.user,
      },
      params: {
        deckId: 'invalidDeckId',
      },
    });

    const responsePromise = guard.canActivate(mockExecutionContext);

    expect(responsePromise).rejects.toThrow(BadRequestException);
    expect(responsePromise).rejects.toThrow('Invalid ObjectId: invalidDeckId');
  });

  it('should throw exception if user has no access', async () => {
    const mockExecutionContext = createMock<ExecutionContext>();
    mockExecutionContext.switchToHttp().getRequest.mockReturnValue({
      user: {
        id: 'userId',
        role: Role.user,
      },
      params: {
        deckId: '507f1f77bcf86cd799439011',
      },
    });

    deckService.findOne.mockResolvedValue({
      creator: {
        toString: jest.fn().mockReturnValue('otherUserId'),
      },
    } as unknown as DeckDocument);

    const responsePromise = guard.canActivate(mockExecutionContext);

    expect(responsePromise).rejects.toThrow(ForbiddenException);
    expect(responsePromise).rejects.toThrow(
      "You don't have access to this deck",
    );
  });

  it('should return true if no access but admin', async () => {
    const mockExecutionContext = createMock<ExecutionContext>();
    mockExecutionContext.switchToHttp().getRequest.mockReturnValue({
      user: {
        id: 'userId',
        role: Role.administrator,
      },
      params: {
        deckId: '507f1f77bcf86cd799439011',
      },
    });

    deckService.findOne.mockResolvedValue({
      creator: {
        toString: jest.fn().mockReturnValue('otherUserId'),
      },
    } as unknown as DeckDocument);

    expect(guard.canActivate(mockExecutionContext)).resolves.toBeTruthy();
  });

  it('should return true if User has access', async () => {
    const mockExecutionContext = createMock<ExecutionContext>();
    mockExecutionContext.switchToHttp().getRequest.mockReturnValue({
      user: {
        id: 'userId',
        role: Role.user,
      },
      params: {
        deckId: '507f1f77bcf86cd799439011',
      },
    });

    deckService.findOne.mockResolvedValue({
      creator: {
        toString: jest.fn().mockReturnValue('userId'),
      },
    } as unknown as DeckDocument);

    expect(guard.canActivate(mockExecutionContext)).resolves.toBeTruthy();
  });
});
