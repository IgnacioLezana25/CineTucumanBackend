import { SetMetadata } from '@nestjs/common';
import { Rol } from '../auth.types.js';

export const CLAVE_DE_ROLES = 'roles';

export const Roles = (...roles: Rol[]) => SetMetadata(CLAVE_DE_ROLES, roles);
