import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DayTask } from './entities/day-task.entity';
import { MyDayController } from './my-day.controller';
import { MyDayService } from './my-day.service';

@Module({
  imports: [TypeOrmModule.forFeature([DayTask])],
  controllers: [MyDayController],
  providers: [MyDayService],
})
export class MyDayModule {}
