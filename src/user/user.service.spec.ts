import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { getModelToken } from '@nestjs/mongoose';
import { User, UserDocument } from './user.schema';
import { DeckService } from '../deck/deck.service';
import { DeepMocked, createMock } from '@golevelup/ts-jest';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Role } from './roles.enum';
import { NotFoundException } from '@nestjs/common';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

describe('UserService', () => {
  let service: UserService;
  let userModel: DeepMocked<Model<UserDocument>>;
  let deckService: DeepMocked<DeckService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getModelToken(User.name),
          useValue: createMock<Model<UserDocument>>(),
        },
        {
          provide: DeckService,
          useValue: createMock<DeckService>(),
        },
      ],
    }).compile();

    service = module.get(UserService);
    userModel = module.get(getModelToken(User.name));
    deckService = module.get(DeckService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashPw');

      const registerUserDto = {
        name: 'TestUser',
        password: 'pw',
        passwordConfirmation: 'pw',
      };

      await service.create(registerUserDto);

      expect(userModel.create).toHaveBeenCalledWith({
        name: 'TestUser',
        passwordHash: 'hashPw',
        role: Role.user,
        createdAt: expect.any(Number),
      });
    });
  });

  describe('findAll', () => {
    it('should query database for Users', async () => {
      await service.findAll();

      expect(userModel.find).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should throw exception if no user gets found', async () => {
      userModel.findById.mockResolvedValue(null);

      const responsePromise = service.findOne('1');

      expect(responsePromise).rejects.toThrow(NotFoundException);
      expect(responsePromise).rejects.toThrow('User not found');
    });

    it('should return user if found', async () => {
      const userValue = {
        _id: '1',
        name: 'TestUser',
      };

      userModel.findById.mockResolvedValue(userValue);

      const response = await service.findOne('1');
      expect(response).toEqual(userValue);
    });
  });

  describe('findOneByName', () => {
    it('should query database for User by Name', async () => {
      await service.findOneByName('TestUser');

      expect(userModel.findOne).toHaveBeenCalledWith({ name: 'TestUser' });
    });
  });

  describe('remove', () => {
    it('should delete the User and call function to delete all his decks', async () => {
      await service.remove('1');

      expect(userModel.deleteOne).toHaveBeenCalledWith({ _id: '1' });
      expect(deckService.removeDecksFromUser).toHaveBeenCalledWith('1');
    });
  });
});
