import { Test, TestingModule } from '@nestjs/testing';
import { CardService } from './card.service';
import { Card, CardDocument } from './card.schema';
import { getModelToken } from '@nestjs/mongoose';
import { DeepMocked, createMock } from '@golevelup/ts-jest';
import { Model } from 'mongoose';
import { TranslatorService } from './translator.service';
import { LexicalInfoService } from './lexical-info.service';
import { CreateCardDto } from './dto/create-card.dto';
import { ConflictException } from '@nestjs/common';
import { Deck, DeckDocument } from '../deck/deck.schema';
import ApiResponse from './response/api-response';
import LibreTranslateResponse from './response/libre-translate-response';
import ApiDictionaryResponse, {
  Meaning,
} from './response/api-dictionary-response';
import { Language } from '../deck/languages.enum';

describe('CardService', () => {
  let service: CardService;
  let cardModel: DeepMocked<Model<CardDocument>>;
  let translatorService: DeepMocked<TranslatorService>;
  let lexicalInfoService: DeepMocked<LexicalInfoService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardService,
        {
          provide: getModelToken(Card.name),
          useValue: createMock<Model<CardDocument>>(),
        },
        {
          provide: TranslatorService,
          useValue: createMock<TranslatorService>(),
        },
        {
          provide: LexicalInfoService,
          useValue: createMock<LexicalInfoService>(),
        },
      ],
    })
      .useMocker(createMock)
      .compile();

    service = module.get(CardService);
    cardModel = module.get(getModelToken(Card.name));
    translatorService = module.get(TranslatorService);
    lexicalInfoService = module.get(LexicalInfoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    let deckDocument: DeckDocument;
    let createCardDto: CreateCardDto;

    beforeEach(() => {
      deckDocument = createMock<DeckDocument>();

      createCardDto = createMock<CreateCardDto>();
      createCardDto.word = 'test';
    });
    it('should throw exception if duplicate card in deck', async () => {
      cardModel.findOne.mockResolvedValue({});

      const responsePromise = service.create(createCardDto, deckDocument);
      await expect(responsePromise).rejects.toThrow(ConflictException);
      await expect(responsePromise).rejects.toThrow(
        `The word test already exists in this deck`,
      );

      expect(cardModel.create).toHaveBeenCalledTimes(0);
    });

    it('should create a card', async () => {
      cardModel.findOne.mockResolvedValue(null);

      const getExternalDataSpy = jest.spyOn(service, 'getExternalData');
      getExternalDataSpy.mockResolvedValue({
        libreTranslateResponse: {
          data: { translatedText: 'translation' },
        } as ApiResponse<LibreTranslateResponse>,
        apiDictionaryResponse: { data: [{}] } as ApiResponse<
          ApiDictionaryResponse[]
        >,
      });

      const extractInformationSpy = jest.spyOn(service, 'extractInformation');
      extractInformationSpy.mockReturnValue(null);

      await expect(
        service.create(createCardDto, deckDocument),
      ).resolves.not.toThrow();

      expect(cardModel.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('copy', () => {
    let cards: CardDocument[];
    let deck: Deck;

    beforeEach(() => {
      const first_card = createMock<CardDocument>();
      first_card.word = 'haus';
      first_card.translation = 'house';

      const second_card = createMock<CardDocument>();
      second_card.word = 'tier';
      second_card.translation = 'animal';

      cards = [first_card, second_card];

      deck = createMock<Deck>();
    });

    it('should create new cards without swap', async () => {
      await service.copy(cards, deck);

      expect(cardModel.create).toHaveBeenCalledTimes(2);
      expect(cardModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          word: 'haus',
          translation: 'house',
        }),
      );
      expect(cardModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          word: 'tier',
          translation: 'animal',
        }),
      );
    });

    it('should create new cards with swap', async () => {
      await service.copy(cards, deck, true);

      expect(cardModel.create).toHaveBeenCalledTimes(2);
      expect(cardModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          word: 'house',
          translation: 'haus',
        }),
      );
      expect(cardModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          word: 'animal',
          translation: 'tier',
        }),
      );
    });
  });

  describe('getExternalData', () => {
    it('should throw exception if fromLang is en and error in response', async () => {
      translatorService.translate.mockResolvedValue({
        error: true,
        data: null,
      });

      const responsePromise = service.getExternalData(
        'house',
        Language.en,
        Language.de,
      );
      await expect(responsePromise).rejects.toThrow(ConflictException);
      await expect(responsePromise).rejects.toThrow(
        'No Translation found for house',
      );
    });

    it('should throw exception if toLang is en and error in response', async () => {
      translatorService.translate.mockResolvedValue({
        error: true,
        data: null,
      });

      const responsePromise = service.getExternalData(
        'house',
        Language.de,
        Language.en,
      );
      await expect(responsePromise).rejects.toThrow(ConflictException);
      await expect(responsePromise).rejects.toThrow(
        'No Translation found for house',
      );
    });

    it('should return the information', async () => {
      translatorService.translate.mockResolvedValue({
        error: false,
        data: { translatedText: 'haus' },
      });

      lexicalInfoService.getInfo.mockResolvedValue(null);

      const response = await service.getExternalData(
        'house',
        Language.de,
        Language.en,
      );
      expect(response).toEqual({
        libreTranslateResponse: {
          error: false,
          data: { translatedText: 'haus' },
        },
        apiDictionaryResponse: null,
      });
    });
  });

  describe('extractInformation', () => {
    it('should combine phonetic and meaning objects', () => {
      const extractPhoneticSpy = jest.spyOn(service, 'extractPhonetic');
      extractPhoneticSpy.mockReturnValue({
        phonetic: 'phonetic',
        audioLink: 'audioLink',
      });

      const extractMeaningSpy = jest.spyOn(service, 'extractMeaning');
      extractMeaningSpy.mockReturnValue({
        synonyms: [],
        antonyms: [],
        definitions: [],
        examples: [],
      });

      const apiDictionaryResponse = createMock<ApiDictionaryResponse>();

      const response = service.extractInformation(apiDictionaryResponse);
      expect(response).toEqual({
        phonetic: 'phonetic',
        audioLink: 'audioLink',
        synonyms: [],
        antonyms: [],
        definitions: [],
        examples: [],
      });
    });
  });

  describe('extractPhonetic', () => {
    it('should return phonetic and audioLink from phonetics list', () => {
      const apiDictionaryResponse = {
        word: 'example',
        phonetic: 'firstPhonetic',
        phonetics: [
          {
            audio: 'https://example.com/audio.mp3',
            text: 'secondPhonetic',
            sourceUrl: 'https://example.com',
            license: {
              name: 'Example License',
              url: 'https://example-license.com',
            },
          },
        ],
        meanings: [],
        license: undefined,
        sourceUrls: [],
      };

      const response = service.extractPhonetic(apiDictionaryResponse);
      expect(response).toEqual({
        phonetic: 'secondPhonetic',
        audioLink: 'https://example.com/audio.mp3',
      });
    });

    it('should return phonetic first phonetic form property and no audioLink', () => {
      const apiDictionaryResponse = {
        word: 'example',
        phonetic: 'firstPhonetic',
        phonetics: [],
        meanings: [],
        license: undefined,
        sourceUrls: [],
      };

      const response = service.extractPhonetic(apiDictionaryResponse);
      expect(response).toEqual({
        phonetic: 'firstPhonetic',
        audioLink: undefined,
      });
    });
  });

  describe('extractMeaning', () => {
    it('should return the meaning lists (synonyms, antonyms, definitoins, examples)', () => {
      const meanings: Meaning[] = [
        {
          partOfSpeech: 'noun',
          definitions: [
            {
              definition: 'a representative form or pattern',
              synonyms: ['model', 'prototype', 'exemplar'],
              antonyms: ['counterexample', 'nonexample'],
              example: 'This is an example of a well-written definition.',
            },
          ],
          synonyms: ['instance', 'illustration', 'sample'],
          antonyms: ['noninstance', 'counterexample'],
        },
        {
          partOfSpeech: 'verb',
          definitions: [
            {
              definition: 'to serve as an example of',
              synonyms: ['illustrate', 'demonstrate', 'exemplify'],
              antonyms: ['contradict', 'disprove'],
            },
          ],
          synonyms: ['demonstrate', 'show', 'illustrate'],
          antonyms: ['contradict', 'disprove'],
        },
      ];

      const response = service.extractMeaning(meanings);
      expect(response).toEqual({
        synonyms: [
          'instance',
          'illustration',
          'sample',
          'demonstrate',
          'show',
          'illustrate',
        ],
        antonyms: ['noninstance', 'counterexample', 'contradict', 'disprove'],
        definitions: [
          'a representative form or pattern',
          'to serve as an example of',
        ],
        examples: ['This is an example of a well-written definition.'],
      });
    });
  });

  describe('findAll', () => {
    it('should query database', async () => {
      await service.findAll('id');
      expect(cardModel.find).toHaveBeenCalledWith({ deck: 'id' });
    });
  });

  describe('findCardsToLearn', () => {
    it('should query for old and for new cards', async () => {
      const deck = createMock<DeckDocument>();
      deck.lastTimeLearned = new Date();

      await service.findCardsToLearn(deck);

      expect(cardModel.find).toHaveBeenCalledTimes(2);
    });
  });

  describe('remove', () => {
    it('should delete card from database', async () => {
      await service.remove('id');

      expect(cardModel.deleteOne).toHaveBeenCalledWith({ _id: 'id' });
    });
  });

  describe('removeCardsFromDeck', () => {
    it('should delete many cards from a deck from database', async () => {
      await service.removeCardsFromDecks(['1', '2', '3', '4']);

      expect(cardModel.deleteMany).toHaveBeenCalledWith({
        deck: { $in: ['1', '2', '3', '4'] },
      });
    });
  });

  describe('updateCardHard', () => {
    let updateCardSpy;

    beforeEach(() => {
      updateCardSpy = jest.spyOn(service, 'updateCard');
      updateCardSpy.mockResolvedValue(null);
    });

    it('should update stage to 0 if stage is negative', async () => {
      const card = createMock<CardDocument>();
      card.id = 'id';
      card.stage = -1;

      await service.updateCardHard(card);

      expect(updateCardSpy).toHaveBeenCalledWith('id', 0);
    });

    it('should update stage to 0 if stage less or equal than 2', async () => {
      const card = createMock<CardDocument>();
      card.id = 'id';
      card.stage = 2;

      await service.updateCardHard(card);

      expect(updateCardSpy).toHaveBeenCalledWith('id', 0);
    });

    it('should update stage to 1 if stage less or equal than 4', async () => {
      const card = createMock<CardDocument>();
      card.id = 'id';
      card.stage = 4;

      await service.updateCardHard(card);

      expect(updateCardSpy).toHaveBeenCalledWith('id', 1);
    });

    it('should update stage to 2 if stage less or equal than 6', async () => {
      const card = createMock<CardDocument>();
      card.id = 'id';
      card.stage = 6;

      await service.updateCardHard(card);

      expect(updateCardSpy).toHaveBeenCalledWith('id', 2);
    });

    it('should update stage to 3 if stage greater than 6', async () => {
      const card = createMock<CardDocument>();
      card.id = 'id';
      card.stage = 8;

      await service.updateCardHard(card);

      expect(updateCardSpy).toHaveBeenCalledWith('id', 3);
    });
  });

  describe('updateCardEasy', () => {
    let updateCardSpy;
    let card: CardDocument;

    beforeEach(() => {
      updateCardSpy = jest.spyOn(service, 'updateCard');
      updateCardSpy.mockResolvedValue(null);

      card = createMock<CardDocument>();
      card.id = 'id';
    });

    it('should update increment stage by 1 if stage is smaller than 8', async () => {
      card.stage = 3;

      await service.updateCardGood(card);

      expect(updateCardSpy).toHaveBeenCalledWith('id', 4);
    });

    it('should keep stage 8 if stage is already 8', async () => {
      card.stage = 8;

      await service.updateCardGood(card);

      expect(updateCardSpy).toHaveBeenCalledWith('id', 8);
    });
  });

  describe('updateCardEasy', () => {
    let updateCardSpy;
    let card: CardDocument;

    beforeEach(() => {
      updateCardSpy = jest.spyOn(service, 'updateCard');
      updateCardSpy.mockResolvedValue(null);

      card = createMock<CardDocument>();
      card.id = 'id';
    });

    it('should update increment stage by 2 if stage is smaller than 7', async () => {
      card.stage = 3;

      await service.updateCardEasy(card);

      expect(updateCardSpy).toHaveBeenCalledWith('id', 5);
    });

    it('should update stage only to 8 if stage is already 7', async () => {
      card.stage = 7;

      await service.updateCardEasy(card);

      expect(updateCardSpy).toHaveBeenCalledWith('id', 8);
    });
  });

  describe('convertStageToDate', () => {
    const RealDate = Date;

    beforeEach(() => {
      const MockDate = jest.fn(() => new RealDate('2024-01-01T10:42:00Z'));
      global.Date = MockDate as any;
    });

    afterEach(() => {
      global.Date = RealDate;
    });

    it('should return 1 for stage 0', () => {
      const result = service.convertStageToDate(0);

      const predictDate = new Date();
      predictDate.setHours(0, 0, 0, 0);
      predictDate.setDate(predictDate.getDate() + 1);

      expect(result).toEqual(predictDate);
    });

    it('should return 256 for stage 8', () => {
      const result = service.convertStageToDate(8);

      const predictDate = new Date();
      predictDate.setHours(0, 0, 0, 0);
      predictDate.setDate(predictDate.getDate() + 256);

      expect(result).toEqual(predictDate);
    });
  });

  describe('calculateLimit', () => {
    const RealDate = Date;

    beforeEach(() => {
      const MockDate = jest.fn(() => new RealDate('2024-01-01T10:42:00Z'));
      global.Date = MockDate as any;
    });

    afterEach(() => {
      global.Date = RealDate;
    });

    it('should return learningRate if card never learned', () => {
      const deck = createMock<DeckDocument>();
      deck.lastTimeLearned = null;
      deck.learningRate = 10;

      expect(service.calculateLimit(deck)).toBe(10);
    });

    it('should return leraningRate if not learned today', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const deck = createMock<DeckDocument>();
      deck.lastTimeLearned = yesterday;

      deck.numCardsLearned = 3;
      deck.learningRate = 10;

      expect(service.calculateLimit(deck)).toBe(10);
    });

    it('should return difference between learningRate and numCardsLearned if already learned today', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const deck = createMock<DeckDocument>();
      deck.lastTimeLearned = today;

      deck.numCardsLearned = 3;
      deck.learningRate = 10;

      expect(service.calculateLimit(deck)).toBe(7);
    });
  });
});
