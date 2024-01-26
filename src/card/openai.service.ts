import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { OpenAI } from '@langchain/openai';
import { RunnableSequence } from '@langchain/core/runnables';
import {
  OutputFixingParser,
  StructuredOutputParser,
} from 'langchain/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { Language } from '../deck/languages.enum';

@Injectable()
export class OpenAIService {
  private openAIToken: string;
  private parser = StructuredOutputParser.fromZodSchema(
    z.object({
      examples: z
        .array(z.string())
        .describe(
          'A list of a maximum of 5 example sentences in English for the provided word or phrase. Return empty list or list with less examples if there are not that many useful examples.',
        ),
      antonyms: z
        .array(z.string())
        .describe(
          'A list of a maximum of 5 antonyms in English for the provided word or phrase. Return empty list or list with less examples if there are not that many useful antonyms.',
        ),
      synonyms: z
        .array(z.string())
        .describe(
          'A list of a maximum of 5 synonyms in English for the provided word or phrase. Return empty list or list with less examples if there are not that many useful synonyms.',
        ),
      definitions: z
        .array(z.string())
        .describe(
          'A list of a maximum of 5 sentencese which define the the provided word or phrase in other words. Return empty list or list with less examples if there are not that many useful definitions.',
        ),
      translation: z
        .string()
        .describe(
          'The translation of the word phrase provided to the specified language.',
        ),
    }),
  );
  private chain;

  constructor(
    private readonly httpService: HttpService,
    configService: ConfigService,
  ) {
    this.openAIToken = configService.get('OPENAI_TOKEN');
    this.chain = RunnableSequence.from([
      PromptTemplate.fromTemplate(
        "Please translate the {fromLang} word '{word}' into the language {toLang} and provide the English descriptions mentioned in the following schema. \n{format_instructions}",
      ),
      new OpenAI({
        temperature: 0,
        openAIApiKey: this.openAIToken,
      }),
    ]);
  }

  async getInformation(word: string, fromLang: Language, toLang: Language) {
    const response = await this.chain.invoke({
      fromLang: this.getLanguageText(fromLang),
      word: word,
      toLang: this.getLanguageText(toLang),
      format_instructions: this.parser.getFormatInstructions(),
    });

    try {
      return await this.parser.parse(response);
    } catch (e) {
      console.log(e);
      const fixParser = OutputFixingParser.fromLLM(
        new OpenAI({ temperature: 0.2, openAIApiKey: this.openAIToken }),
        this.parser,
      );
      const fixedResponse = await fixParser.parse(response);
      return fixedResponse;
    }
  }

  private getLanguageText(language: Language) {
    switch (language) {
      case Language.en:
        return 'English';
      case Language.de:
        return 'German';
      case Language.es:
        return 'Spanish';
      case Language.fr:
        return 'French';
      case Language.it:
        return 'Italian';
    }
  }
}
