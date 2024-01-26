import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../roles.enum';
import { UserDocument } from '../user.schema';

export class UserDto {
  @ApiProperty()
  id: string;
  @ApiProperty()
  name: string;
  @ApiProperty()
  role: Role;
  @ApiProperty()
  createdAt: Date;

  constructor(user: UserDocument) {
    this.id = user.id;
    this.name = user.name;
    this.role = user.role;
    this.createdAt = user.createdAt;
  }
}
