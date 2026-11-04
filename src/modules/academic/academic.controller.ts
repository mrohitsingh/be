import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { TenantId } from '../../common/decorators/tenant-id.decorator.js';
import { AcademicService } from './academic.service.js';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto.js';
import { CreateClassDto } from './dto/create-class.dto.js';
import { CreateSectionDto } from './dto/create-section.dto.js';
import { CreateSubjectDto } from './dto/create-subject.dto.js';

@Controller('academic')
@UseGuards(TenantGuard)
export class AcademicController {
  constructor(private readonly academicService: AcademicService) {}

  @Post('years')
  createYear(
    @TenantId() tenantId: number,
    @Body() dto: CreateAcademicYearDto,
  ) {
    return this.academicService.createAcademicYear(tenantId, dto);
  }

  @Get('years')
  listYears(@TenantId() tenantId: number) {
    return this.academicService.listAcademicYears(tenantId);
  }

  @Post('classes')
  createClass(@TenantId() tenantId: number, @Body() dto: CreateClassDto) {
    return this.academicService.createClass(tenantId, dto);
  }

  @Get('classes')
  listClasses(@TenantId() tenantId: number) {
    return this.academicService.listClasses(tenantId);
  }

  @Post('sections')
  createSection(@TenantId() tenantId: number, @Body() dto: CreateSectionDto) {
    return this.academicService.createSection(tenantId, dto);
  }

  @Post('subjects')
  createSubject(@TenantId() tenantId: number, @Body() dto: CreateSubjectDto) {
    return this.academicService.createSubject(tenantId, dto);
  }

  @Get('subjects')
  listSubjects(
    @TenantId() tenantId: number,
    @Query('class_id') classId?: string,
  ) {
    const parsedClassId = classId ? parseInt(classId, 10) : undefined;
    return this.academicService.listSubjects(tenantId, parsedClassId);
  }
}
