import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { TenantId } from '../../common/decorators/tenant-id.decorator.js';
import { AttendanceService } from './attendance.service.js';
import { GetAttendanceSheetDto } from './dto/get-attendance-sheet.dto.js';
import { SubmitAttendanceDto } from './dto/submit-attendance.dto.js';
import { UpdateSessionLockDto } from './dto/update-lock.dto.js';

@Controller('attendance')
@UseGuards(TenantGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('sheet')
  getSheet(
    @TenantId() tenantId: number,
    @Query() query: GetAttendanceSheetDto,
  ) {
    return this.attendanceService.getAttendanceSheet(tenantId, query);
  }

  @Post('submit')
  submit(
    @TenantId() tenantId: number,
    @Body() dto: SubmitAttendanceDto,
    @Req() req: any,
  ) {
    return this.attendanceService.submitAttendance(tenantId, dto, req.user?.id);
  }

  @Patch('sessions/:id/lock')
  setLock(
    @TenantId() tenantId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSessionLockDto,
  ) {
    return this.attendanceService.setSessionLock(tenantId, id, dto.is_locked);
  }
}
