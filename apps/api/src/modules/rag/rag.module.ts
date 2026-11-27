import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../platform/database/database.module';
import { RAG_ACCESS } from './application/rag.ports';
import { RagService } from './application/rag.service';
import { EnvChatLlmProvider } from './infrastructure/chat-llm.provider';
import { extractDocumentText } from './infrastructure/document-parser';
import { EnvEmbeddingProvider } from './infrastructure/embedding.provider';
import { DrizzleRagRepository } from './infrastructure/rag.repository';
import { RagController } from './presentation/rag.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [RagController],
  providers: [
    DrizzleRagRepository,
    {
      provide: RAG_ACCESS,
      inject: [DrizzleRagRepository],
      useFactory: (repo: DrizzleRagRepository) =>
        new RagService(repo, new EnvEmbeddingProvider(), new EnvChatLlmProvider(), { extract: extractDocumentText }),
    },
  ],
  exports: [RAG_ACCESS],
})
export class RagModule {}
