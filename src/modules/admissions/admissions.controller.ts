import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { TenantId } from '../../common/decorators/tenant-id.decorator.js';
import { AdmissionsService } from './admissions.service.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { UpdateApplicationStatusDto } from './dto/update-status.dto.js';
import { FinalizeAdmissionDto } from './dto/finalize-admission.dto.js';

@Controller('admissions')
@UseGuards(TenantGuard)
export class AdmissionsController {
  constructor(private readonly admissionsService: AdmissionsService) {}

  @Post('applications')
  createApplication(
    @TenantId() tenantId: number,
    @Body() dto: CreateApplicationDto,
  ) {
    return this.admissionsService.createApplication(tenantId, dto);
  }

  @Get('applications')
  listApplications(
    @TenantId() tenantId: number,
    @Query('status') status?: string,
  ) {
    const parsedStatus = status ? parseInt(status, 10) : undefined;
    return this.admissionsService.listApplications(tenantId, parsedStatus);
  }

  @Patch('applications/:id/status')
  updateStatus(
    @TenantId() tenantId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.admissionsService.updateStatus(tenantId, id, dto.status);
  }

  @Post('applications/:id/finalize')
  finalize(
    @TenantId() tenantId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: FinalizeAdmissionDto,
  ) {
    return this.admissionsService.finalizeAdmission(tenantId, id, dto);
  }
}
