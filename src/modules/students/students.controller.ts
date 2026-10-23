import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { TenantId } from '../../common/decorators/tenant-id.decorator.js';
import { StudentsService } from './students.service.js';
import { QueryStudentsDto } from './dto/query-students.dto.js';
import { PromoteStudentsDto } from './dto/promote-students.dto.js';
import { LinkGuardianDto } from './dto/link-guardian.dto.js';

@Controller('students')
@UseGuards(TenantGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  listStudents(@TenantId() tenantId: number, @Query() query: QueryStudentsDto) {
    return this.studentsService.listStudents(tenantId, query);
  }

  @Get(':id')
  getStudent(
    @TenantId() tenantId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.studentsService.getStudent(tenantId, id);
  }

  @Post('promote')
  promoteStudents(
    @TenantId() tenantId: number,
    @Body() dto: PromoteStudentsDto,
  ) {
    return this.studentsService.promoteStudents(tenantId, dto);
  }

  @Post(':id/guardians')
  linkGuardian(
    @TenantId() tenantId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: LinkGuardianDto,
  ) {
    return this.studentsService.linkGuardian(tenantId, id, dto);
  }
}
