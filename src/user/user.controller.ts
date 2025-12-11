import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
  UseGuards,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { LogtoWebhookPayload } from './dto/logto-webhook.dto';
import { GetCurrentUser } from '../logto/decorators/current-user.decorator';
import { Public } from '../logto/decorators/public.decorator';
import { WebhookSignatureGuard } from '../logto/guards/webhook-signature.guard';
import type { CurrentUser } from './types/user.types';

@ApiTags('users')
@Controller('users')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Returns the current user profile' })
  @Get('me')
  getCurrentUser(@GetCurrentUser() user: CurrentUser) {
    return this.userService.findOne(user._id);
  }

  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @Patch('me')
  updateCurrentUser(
    @GetCurrentUser() user: CurrentUser,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.update(user._id, updateUserDto);
  }

  @ApiOperation({ summary: 'Onboard user from Logto' })
  @ApiResponse({ status: 201, description: 'User onboarded successfully' })
  @Public()
  @Post('onboard/:logtoId')
  onboardFromLogto(@Param('logtoId') logtoId: string) {
    return this.userService.onboardFromLogto(logtoId);
  }

  @ApiOperation({ summary: 'Handle Logto webhook events' })
  @ApiBody({ type: LogtoWebhookPayload })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook payload' })
  @ApiResponse({ status: 401, description: 'Invalid webhook signature' })
  @Public()
  @UseGuards(WebhookSignatureGuard)
  @Post('webhook/logto')
  @HttpCode(HttpStatus.OK)
  async handleLogtoWebhook(
    @Body() payload: LogtoWebhookPayload,
  ): Promise<void> {
    const logtoUserId = payload.data?.id || payload.user?.id;

    if (!logtoUserId) {
      throw new BadRequestException('Invalid Logto user ID in webhook payload');
    }

    try {
      switch (payload.event) {
        case 'User.Created':
        case 'PostRegister':
          await this.userService.onboardFromLogto(logtoUserId);
          break;

        case 'User.Deleted':
          await this.userService.removeByLogtoId(logtoUserId);
          break;

        default:
          this.logger.debug(`Unhandled Logto webhook event: ${payload.event}`);
      }
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        this.logger.debug(
          `Webhook event ${payload.event} for user ${logtoUserId}: ${error.message}`,
        );
        return;
      }
      throw error;
    }
  }

  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'Returns the user' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
