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
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { ScheduleVisitDto } from './dto/schedule-visit.dto';
import { ConvertToLeadDto } from './dto/convert-to-lead.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentTenant, TenantContext } from '../common/tenant';

@ApiTags('Conversations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  @Roles('Admin', 'Agent')
  @ApiOperation({ summary: 'Create a new conversation' })
  create(@Body() dto: CreateConversationDto, @CurrentTenant() tenant: TenantContext) {
    return this.conversationsService.createConversationForTenant(dto, tenant);
  }

  @Get()
  @Roles('Admin', 'Agent')
  @ApiOperation({ summary: 'Get all conversations' })
  findAll(@CurrentTenant() tenant: TenantContext) {
    return this.conversationsService.findAllConversations(tenant);
  }

  @Get(':id')
  @Roles('Admin', 'Agent')
  @ApiOperation({ summary: 'Get a conversation with its messages' })
  findOne(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.conversationsService.findConversationForTenant(id, tenant);
  }

  @Get(':id/messages')
  @Roles('Admin', 'Agent')
  @ApiOperation({ summary: 'Get messages for a conversation' })
  getMessages(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.conversationsService.getMessagesForTenant(id, tenant);
  }

  @Post(':id/messages')
  @Roles('Admin', 'Agent')
  @ApiOperation({ summary: 'Send a message in a conversation' })
  addMessage(@Param('id') id: string, @Body() dto: CreateMessageDto, @CurrentTenant() tenant: TenantContext) {
    return this.conversationsService.addMessageForTenant(id, dto, tenant);
  }

  @Patch(':id/read')
  @Roles('Admin', 'Agent')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark all messages as read' })
  markRead(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.conversationsService.markAsReadForTenant(id, tenant);
  }

  @Patch(':id/close')
  @Roles('Admin', 'Agent')
  @ApiOperation({ summary: 'Close a conversation' })
  close(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.conversationsService.updateConversationForTenant(id, { status: 'closed' }, tenant);
  }

  @Patch(':id/pause-nova')
  @Roles('Admin', 'Agent')
  @ApiOperation({ summary: 'Pause Nova for this conversation (agent takes control)' })
  pauseNova(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.conversationsService.pauseNovaForTenant(id, tenant);
  }

  @Patch(':id/resume-nova')
  @Roles('Admin', 'Agent')
  @ApiOperation({ summary: 'Resume Nova for this conversation' })
  resumeNova(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.conversationsService.resumeNovaForTenant(id, tenant);
  }

  @Post(':id/notes')
  @Roles('Admin', 'Agent')
  @ApiOperation({ summary: 'Add an internal note (never sent to the contact)' })
  addNote(
    @Param('id') id: string,
    @Body() dto: CreateNoteDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.conversationsService.addNoteForTenant(id, dto, tenant);
  }

  @Post(':id/visits')
  @Roles('Admin', 'Agent')
  @ApiOperation({ summary: 'Schedule a visit: leaves a note and advances the lead' })
  scheduleVisit(
    @Param('id') id: string,
    @Body() dto: ScheduleVisitDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.conversationsService.scheduleVisitForTenant(id, dto, tenant);
  }

  @Post(':id/convert-to-lead')
  @Roles('Admin', 'Agent')
  @ApiOperation({ summary: 'Create the lead for this conversation and link it' })
  convertToLead(
    @Param('id') id: string,
    @Body() dto: ConvertToLeadDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.conversationsService.convertToLeadForTenant(id, dto, tenant);
  }
}
