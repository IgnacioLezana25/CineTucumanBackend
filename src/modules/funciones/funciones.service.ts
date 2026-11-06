import { Injectable } from '@nestjs/common';
import { CreateFuncionDto } from './dto/create-funcion.dto.js';
import { UpdateFuncionDto } from './dto/update-funcion.dto.js';

@Injectable()
export class FuncionesService {
  create(createFuncionDto: CreateFuncionDto) {
    return 'This action adds a new funcion';
  }

  findAll() {
    return `This action returns all funciones`;
  }

  findOne(id: number) {
    return `This action returns a #${id} funcion`;
  }

  update(id: number, updateFuncionDto: UpdateFuncionDto) {
    return `This action updates a #${id} funcion`;
  }

  remove(id: number) {
    return `This action removes a #${id} funcion`;
  }
}
