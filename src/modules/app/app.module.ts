import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { UsersModule } from '../users/users.module.js';
import { PeliculasModule } from '../peliculas/peliculas.module.js';
import { FuncionesModule } from '../funciones/funciones.module.js';
import { SucursalesModule } from '../sucursales/sucursales.module.js';
import { ProductosModule } from '../productos/productos.module.js';
import { OrdenesModule } from '../ordenes/ordenes.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UsersModule,
    PeliculasModule,
    FuncionesModule,
    SucursalesModule,
    ProductosModule,
    OrdenesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
