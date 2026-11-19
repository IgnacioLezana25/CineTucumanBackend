import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { RolesGuard } from '../guards/roles.guard.js';
import { Roles } from './roles.decorator.js';

export const SoloAdministrador = () =>
  applyDecorators(UseGuards(JwtAuthGuard, RolesGuard), Roles('admin'));
