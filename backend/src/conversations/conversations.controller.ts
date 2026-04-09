import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Conversations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  @Roles('Admin', 'Agent')
  @ApiOperation({ summary: 'Create a new conversation' })
  create(@Body() dto: CreateConversationDto) {
    return this.conversationsService.createConversation(dto);
  }

  @Get()
  @Roles('Admin', 'Agent')
  @ApiOperation({ summary: 'Get all conversations' })
  findAll(@Request() req) {
    return this.conversationsService.findAllConversations(req.user?.tenant_id);
  }

  @Get(':id')
  @Roles('Admin', 'Agent')
  @ApiOperation({ summary: 'Get a conversation with its messages' })
  findOne(@Param('id') id: string) {
    return this.conversationsService.findConversationById(id);
  }

  @Get(':id/messages')
  @Roles('Admin', 'Agent')
  @ApiOperation({ summary: 'Get messages for a conversation' })
  getMessages(@Param('id') id: string) {
    return this.conversationsService.getMessages(id);
  }

  @Post(':id/messages')
  @Roles('Admin', 'Agent')
  @ApiOperation({ summary: 'Send a message in a conversation' })
  addMessage(@Param('id') id: string, @Body() dto: CreateMessageDto) {
    return this.conversationsService.addMessage(id, dto);
  }

  @Patch(':id/read')
  @Roles('Admin', 'Agent')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark all messages as read' })
  markRead(@Param('id') id: string) {
    return this.conversationsService.markAsRead(id);
  }

  @Patch(':id/close')
  @Roles('Admin', 'Agent')
  @ApiOperation({ summary: 'Close a conversation' })
  close(@Param('id') id: string) {
    return this.conversationsService.updateConversation(id, { status: 'closed' });
  }

  @Patch(':id/pause-nova')
  @Roles('Admin', 'Agent')
  @ApiOperation({ summary: 'Pause Nova for this conversation (agent takes control)' })
  pauseNova(@Param('id') id: string) {
    return this.conversationsService.updateConversation(id, { nova_paused: true });
  }

  @Patch(':id/resume-nova')
  @Roles('Admin', 'Agent')
  @ApiOperation({ summary: 'Resume Nova for this conversation' })
  resumeNova(@Param('id') id: string) {
    return this.conversationsService.updateConversation(id, { nova_paused: false });
  }
}
