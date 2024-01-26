import { ApiProperty } from '@nestjs/swagger';

interface Stats {
  _id: number;
  count: number;
}

export class StatDto {
  @ApiProperty()
  stage: number;
  @ApiProperty()
  count: number;

  constructor(stats: Stats) {
    this.stage = stats._id;
    this.count = stats.count;
  }
}
