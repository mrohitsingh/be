import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { TenantId } from '../../common/decorators/tenant-id.decorator.js';
import { ExaminationsService } from './examinations.service.js';
import { CreateGradeScaleDto } from './dto/create-grade-scale.dto.js';
import { CreateExamDto } from './dto/create-exam.dto.js';
import { CreateExamScheduleDto } from './dto/create-schedule.dto.js';
import { SubmitMarksDto } from './dto/submit-marks.dto.js';
import { CompileReportCardsDto } from './dto/compile-report-cards.dto.js';

@Controller('examinations')
@UseGuards(TenantGuard)
export class ExaminationsController {
  constructor(private readonly examinationsService: ExaminationsService) {}

  @Post('grade-scales')
  createGradeScale(
    @TenantId() tenantId: number,
    @Body() dto: CreateGradeScaleDto,
  ) {
    return this.examinationsService.createGradeScale(tenantId, dto);
  }

  @Get('grade-scales')
  listGradeScales(@TenantId() tenantId: number) {
    return this.examinationsService.listGradeScales(tenantId);
  }

  @Post('exams')
  createExam(@TenantId() tenantId: number, @Body() dto: CreateExamDto) {
    return this.examinationsService.createExam(tenantId, dto);
  }

  @Post('schedules')
  createSchedule(
    @TenantId() tenantId: number,
    @Body() dto: CreateExamScheduleDto,
  ) {
    return this.examinationsService.createSchedule(tenantId, dto);
  }

  @Post('marks/submit')
  submitMarks(@TenantId() tenantId: number, @Body() dto: SubmitMarksDto) {
    return this.examinationsService.submitMarks(tenantId, dto);
  }

  @Post('report-cards/compile')
  compileReportCards(
    @TenantId() tenantId: number,
    @Body() dto: CompileReportCardsDto,
  ) {
    return this.examinationsService.compileReportCards(tenantId, dto);
  }

  @Post('exams/:id/publish')
  publishExam(
    @TenantId() tenantId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.examinationsService.publishExam(tenantId, id);
  }

  @Get('exams/:examId/report-cards/:enrollmentId')
  getReportCard(
    @TenantId() tenantId: number,
    @Param('examId', ParseIntPipe) examId: number,
    @Param('enrollmentId', ParseIntPipe) enrollmentId: number,
  ) {
    return this.examinationsService.getReportCard(tenantId, examId, enrollmentId);
  }
}
