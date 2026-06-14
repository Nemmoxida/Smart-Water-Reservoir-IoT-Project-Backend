import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { jwtAuthGuard } from 'src/auth/guard/auth.guard';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // @UseGuards(jwtAuthGuard)
  @Get('/config')
  async getConfig() {
    return await this.userService.getConfigData();
  }

  // @UseGuards(jwtAuthGuard)
  @Post('/updateConfig')
  updateConfig(@Body() config) {
    return this.userService.updateConfigData(config);
  }

  @UseGuards(jwtAuthGuard)
  @Get('/sensorData')
  SensorData() {
    return this.userService.getSensorData();
  }
}
