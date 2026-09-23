import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(){
 const app=await NestFactory.create(AppModule);
 app.enableCors({origin:true,credentials:true});
 app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));
 const config=new DocumentBuilder().setTitle('SIGET API').setDescription('API REST del Sistema Integral de Gestión de Equipos Tecnológicos').setVersion('1.0').addBearerAuth().build();
 SwaggerModule.setup('api/docs',app,SwaggerModule.createDocument(app,config));
 await app.listen(3000,'0.0.0.0');
}
bootstrap();
