import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { createRagNoteSchema, idSchema, sendChatMessageSchema } from '@pyneath/contracts';
import { body, principal } from '../../../platform/http/request';
import { RAG_ACCESS, type RagAccess } from '../application/rag.ports';
import { RagNotFoundError } from '../application/rag.service';
import { MAX_RAG_FILE_BYTES, UnsupportedRagFileError } from '../infrastructure/document-parser';

@Controller('api/v1/me/rag')
export class RagController {
  constructor(@Inject(RAG_ACCESS) private readonly rag: RagAccess) {}

  @Get('documents')
  async listDocuments(@Req() req: Request) {
    return { documents: await this.rag.listDocuments(principal(req).id) };
  }

  @Post('notes')
  async createNote(@Req() req: Request) {
    const document = await this.rag.ingestNote(principal(req).id, body(createRagNoteSchema, req));
    return { document };
  }

  @Post('files')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_RAG_FILE_BYTES } }))
  async uploadFile(@Req() req: Request, @UploadedFile() file?: { originalname: string; buffer: Buffer }) {
    if (!file) throw new BadRequestException('File is required');
    try {
      const document = await this.rag.ingestFile(principal(req).id, file.originalname, file.buffer);
      return { document };
    } catch (error) {
      if (error instanceof UnsupportedRagFileError) throw new BadRequestException(error.message);
      throw error;
    }
  }

  @Delete('documents/:id')
  @HttpCode(204)
  async deleteDocument(@Req() req: Request, @Param('id') rawId: string) {
    const id = idSchema.parse(rawId);
    try {
      await this.rag.removeDocument(principal(req).id, id);
    } catch (error) {
      if (error instanceof RagNotFoundError) throw new NotFoundException('Document not found');
      throw error;
    }
  }

  @Post('sync')
  async syncInternal(@Req() req: Request) {
    return this.rag.syncInternalContext(principal(req).id);
  }

  @Get('threads')
  async listThreads(@Req() req: Request) {
    return { threads: await this.rag.listThreads(principal(req).id) };
  }

  @Get('threads/:id/messages')
  async listMessages(@Req() req: Request, @Param('id') rawId: string) {
    const id = idSchema.parse(rawId);
    try {
      return { messages: await this.rag.listMessages(principal(req).id, id) };
    } catch (error) {
      if (error instanceof RagNotFoundError) throw new NotFoundException('Thread not found');
      throw error;
    }
  }

  @Post('chat')
  async chat(@Req() req: Request) {
    try {
      return await this.rag.chat(principal(req).id, body(sendChatMessageSchema, req));
    } catch (error) {
      if (error instanceof RagNotFoundError) throw new NotFoundException('Thread not found');
      throw error;
    }
  }
}
