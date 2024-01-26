import { Test, TestingModule } from '@nestjs/testing';
import { DeckController } from './deck.controller';
import { DeckService } from './deck.service';
import { DeepMocked, createMock } from '@golevelup/ts-jest';
import { AuthGuardRequest } from 'src/util/request/auth-guard.request';
import { DeckDocument } from './deck.schema';
import { CreateDeckDto } from './dto/create-deck.dto';
import { ImportDeckDto } from './dto/import-deck.dto';
import { Language } from './languages.enum';
import { OwnDeckOrAdminRequest } from 'src/util/request/own-deck-or-admin.request';
import { UpdateDeckDto } from './dto/update-deck.dto';

describe('DeckController', () => {
  let controller: DeckController;
  let deckService: DeepMocked<DeckService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeckController],
      providers: [
        {
          provide: DeckService,
          useValue: createMock<DeckService>(),
        },
      ],
    })
      .useMocker(createMock)
      .compile();

    controller = module.get(DeckController);
    deckService = module.get(DeckService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call deckService and return the id', async () => {
      const request = createMock<AuthGuardRequest>();
      const createDeckDto = createMock<CreateDeckDto>();

      deckService.create.mockResolvedValue({ id: '1' } as DeckDocument);

      await expect(controller.create(request, createDeckDto)).resolves.toEqual({
        id: '1',
      });
      expect(deckService.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('import', () => {
    it('should success and call deckService import method', async () => {
      const request = createMock<AuthGuardRequest>();
      const importDeckDto = createMock<ImportDeckDto>();

      await expect(
        controller.import(request, importDeckDto),
      ).resolves.not.toThrow();
      expect(deckService.import).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll', () => {
    it('should call deckService and return a list of decks', async () => {
      const request = createMock<AuthGuardRequest>();

      deckService.findAll.mockResolvedValue([
        {
          _id: '1',
          name: 'DeckName1',
          learningRate: 10,
          fromLang: Language.de,
          toLang: Language.en,
          newCardCount: 5,
          oldCardCount: 8,
        },
        {
          _id: '2',
          name: 'DeckName2',
          learningRate: 20,
          fromLang: Language.es,
          toLang: Language.en,
          newCardCount: 10,
          oldCardCount: 18,
        },
      ]);

      const response = await controller.findAll(request);

      response.forEach((deck) => {
        expect(deck).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            learningRate: expect.any(Number),
            fromLang: expect.any(String),
            toLang: expect.any(String),
            newCardCount: expect.any(Number),
            oldCardCount: expect.any(Number),
          }),
        );
      });
      expect(deckService.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should return one deck', () => {
      const deck = {
        id: '1',
        name: 'TestDeck',
        learningRate: 10,
        fromLang: Language.en,
        toLang: Language.de,
      };

      const request = createMock<OwnDeckOrAdminRequest>();
      request.deck = deck as DeckDocument;

      expect(controller.findOne(request, 'id')).toEqual(deck);
    });
  });

  describe('stats', () => {
    it('should call deckService and return list of stats', async () => {
      deckService.stats.mockResolvedValue([
        {
          _id: 1,
          count: 5,
        },
        {
          _id: 2,
          count: 8,
        },
      ]);

      const response = await controller.stats('id');

      response.forEach((stat) => {
        expect(stat).toEqual(
          expect.objectContaining({
            stage: expect.any(Number),
            count: expect.any(Number),
          }),
        );
      });
      expect(deckService.stats).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('should call deckService and return updated deck', async () => {
      const deck = {
        id: '1',
        name: 'TestDeck',
        learningRate: 10,
        fromLang: Language.en,
        toLang: Language.de,
      };

      deckService.update.mockResolvedValue(deck as DeckDocument);

      const request = createMock<OwnDeckOrAdminRequest>();
      request.deck = {
        creator: {
          toString: jest.fn().mockReturnValue('creatorId'),
        },
      } as unknown as DeckDocument;

      const updateDeckDto = createMock<UpdateDeckDto>();

      await expect(
        controller.update(request, 'id', updateDeckDto),
      ).resolves.toEqual(deck);
      expect(deckService.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('swap', () => {
    it('should success and call deckService swap method', async () => {
      const request = createMock<OwnDeckOrAdminRequest>();

      await expect(controller.swap(request, 'id')).resolves.not.toThrow();
      expect(deckService.swap).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    it('should success and call deckService remove method', async () => {
      await expect(controller.remove('id')).resolves.not.toThrow();
      expect(deckService.remove).toHaveBeenCalledWith('id');
    });
  });
});
