import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './user.schema';
import { Model } from 'mongoose';
import { RegisterUserDto } from '../auth/dto/register-user.dto';
import * as bcrypt from 'bcrypt';
import { Role } from './roles.enum';
import { DeckService } from '../deck/deck.service';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly deckService: DeckService,
  ) {}

  async create(registerUserDto: RegisterUserDto) {
    // Set Role to Admin if it is the first User
    let role = Role.user;
    if ((await this.userModel.count()) === 0) {
      role = Role.administrator;
    }

    const user = await this.userModel.create({
      name: registerUserDto.name,
      passwordHash: await bcrypt.hash(registerUserDto.password, 10),
      role: role,
      createdAt: Date.now(),
    });

    return user;
  }

  async findAll() {
    return await this.userModel.find();
  }

  async findOne(id: string) {
    const user = await this.userModel.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findOneByName(name: string) {
    return await this.userModel.findOne({ name });
  }

  async remove(id: string) {
    await Promise.all([
      this.userModel.deleteOne({ _id: id }),
      this.deckService.removeDecksFromUser(id),
    ]);
  }
}
