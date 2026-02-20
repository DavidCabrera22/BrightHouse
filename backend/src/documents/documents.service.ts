import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './entities/document.entity';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
  ) {}

  create(createDocumentDto: CreateDocumentDto) {
    const document = this.documentRepository.create(createDocumentDto);
    return this.documentRepository.save(document);
  }

  findAll() {
    return this.documentRepository.find({ relations: ['project', 'unit', 'uploaded_by_user'] });
  }

  async findOne(id: string) {
    const document = await this.documentRepository.findOne({ 
      where: { id },
      relations: ['project', 'unit', 'uploaded_by_user'] 
    });
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }
    return document;
  }

  async findLatestByUnit(unitId: string) {
    return this.documentRepository.findOne({ 
      where: { unit_id: unitId },
      order: { created_at: 'DESC' },
      relations: ['project', 'unit']
    });
  }

  async update(id: string, updateDocumentDto: UpdateDocumentDto) {
    const document = await this.findOne(id);
    Object.assign(document, updateDocumentDto);
    return this.documentRepository.save(document);
  }

  async remove(id: string) {
    const document = await this.findOne(id);
    return this.documentRepository.remove(document);
  }
}
