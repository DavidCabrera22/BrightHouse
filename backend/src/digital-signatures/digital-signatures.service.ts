import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DigitalSignature } from './entities/digital-signature.entity';
import { CreateDigitalSignatureDto } from './dto/create-digital-signature.dto';
import { UpdateDigitalSignatureDto } from './dto/update-digital-signature.dto';

@Injectable()
export class DigitalSignaturesService {
  constructor(
    @InjectRepository(DigitalSignature)
    private readonly signatureRepository: Repository<DigitalSignature>,
  ) {}

  create(createDto: CreateDigitalSignatureDto) {
    const signature = this.signatureRepository.create(createDto);
    return this.signatureRepository.save(signature);
  }

  findAll() {
    return this.signatureRepository.find({ relations: ['document', 'signed_by_user'] });
  }

  async findOne(id: string) {
    const signature = await this.signatureRepository.findOne({ 
      where: { id },
      relations: ['document', 'signed_by_user'] 
    });
    if (!signature) {
      throw new NotFoundException(`DigitalSignature with ID ${id} not found`);
    }
    return signature;
  }

  async update(id: string, updateDto: UpdateDigitalSignatureDto) {
    const signature = await this.findOne(id);
    Object.assign(signature, updateDto);
    return this.signatureRepository.save(signature);
  }

  async remove(id: string) {
    const signature = await this.findOne(id);
    return this.signatureRepository.remove(signature);
  }
}
