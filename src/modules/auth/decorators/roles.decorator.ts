import { SetMetadata } from '@nestjs/common';

export const CLAVE_DE_ROLES = 'roles';

export const Roles = (...roles: string[]) => SetMetadata(CLAVE_DE_ROLES, roles);
