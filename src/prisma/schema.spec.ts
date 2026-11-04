import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Prisma Schema Invariants', () => {
  const schemaPath = path.resolve(process.cwd(), 'prisma/schema.prisma');
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');

  it('should define PostgreSQL datasource and prisma-client generator', () => {
    expect(schemaContent).toContain('provider = "prisma-client"');
    expect(schemaContent).toContain('provider = "postgresql"');
    expect(schemaContent).toContain('output   = "../src/generated/prisma"');
  });

  it('should not contain separate status lookup tables', () => {
    const statusModels = [
      'model TenantStatus',
      'model SubscriptionStatus',
      'model RecordStatus',
      'model UserStatus',
      'model InvitationStatus',
    ];
    for (const model of statusModels) {
      expect(schemaContent).not.toContain(model);
    }
  });

  it('should define all Phase 1 core entities', () => {
    const coreEntities = [
      'model Tenant',
      'model Role',
      'model Permission',
      'model ApplicationModuleAction',
      'model Module',
      'model UserAccess',
      'model User',
      'model Invitation',
      'model Session',
      'model AuditLog',
    ];
    for (const entity of coreEntities) {
      expect(schemaContent).toContain(entity);
    }
  });

  it('should use database-generated integer IDs for core entities', () => {
    const autoincrementModels = [
      'model Tenant {',
      'model Role {',
      'model Permission {',
      'model ApplicationModuleAction {',
      'model Module {',
      'model UserAccess {',
      'model User {',
      'model Invitation {',
      'model Session {',
      'model AuditLog {',
    ];
    for (const modelHeader of autoincrementModels) {
      const modelBlock = schemaContent.split(modelHeader)[1]?.split('}')[0];
      expect(modelBlock).toBeDefined();
      expect(modelBlock).toMatch(/id\s+Int\s+@id\s+@default\(autoincrement\(\)\)/);
    }
  });

  it('should use direct integer status columns on entities without lookup foreign keys', () => {
    expect(schemaContent).toMatch(/status\s+Int\s+@default\(1\)/);
    expect(schemaContent).not.toContain('TenantStatus');
    expect(schemaContent).not.toContain('SubscriptionStatus');
    expect(schemaContent).not.toContain('RecordStatus');
    expect(schemaContent).not.toContain('UserStatus');
    expect(schemaContent).not.toContain('InvitationStatus');
  });

  it('should separate platform scope and tenant scope in Role and User', () => {
    // Role has scope field
    expect(schemaContent).toMatch(/scope\s+String\s+@db\.VarChar\(20\)/);

    // User has nullable tenant_id for platform Super Admin
    expect(schemaContent).toMatch(/tenant_id\s+Int\?\s+\/\/\s*NULL for platform operators/);
  });

  it('should include common audit columns on business models', () => {
    const auditedModels = [
      'model Tenant {',
      'model Role {',
      'model Permission {',
      'model ApplicationModuleAction {',
      'model Module {',
      'model UserAccess {',
      'model User {',
    ];
    for (const modelHeader of auditedModels) {
      const modelBlock = schemaContent.split(modelHeader)[1]?.split('}')[0];
      expect(modelBlock).toBeDefined();
      expect(modelBlock).toContain('created_at');
      expect(modelBlock).toContain('updated_at');
      expect(modelBlock).toContain('deleted_at');
    }
  });

  it('should define Module catalog and UserAccess for per-user permissions', () => {
    const modBlock = schemaContent.split('model Module {')[1]?.split('}')[0];
    expect(modBlock).toBeDefined();
    expect(modBlock).toMatch(/code\s+String\s+@unique/);
    expect(modBlock).toMatch(/name\s+String/);
    expect(modBlock).toMatch(/action\s+String\s+@db\.Text/);
    expect(modBlock).toMatch(/level\s+String/);

    const userAccessBlock = schemaContent.split('model UserAccess {')[1]?.split('}')[0];
    expect(userAccessBlock).toBeDefined();
    expect(userAccessBlock).toContain('user_id');
    expect(userAccessBlock).toContain('is_individual');
    expect(userAccessBlock).toMatch(/permission\s+String\s+@db\.Text/);
    expect(schemaContent).not.toContain('model RolePermission');
  });

  it('should define ApplicationModuleAction table for master action registry', () => {
    const actBlock = schemaContent.split('model ApplicationModuleAction {')[1]?.split('}')[0];
    expect(actBlock).toBeDefined();
    expect(actBlock).toMatch(/code\s+String\s+@unique/);
    expect(actBlock).toMatch(/name\s+String/);
    expect(actBlock).toMatch(/@@map\("application_module_actions"\)/);
  });

  it('should define all approved school management domain entities', () => {
    const domainEntities = [
      'model AcademicYear',
      'model Class',
      'model Section',
      'model Subject',
      'model AdmissionApplication',
      'model Student',
      'model StudentEnrollment',
      'model Guardian',
      'model StudentGuardian',
      'model Teacher',
      'model TeacherAssignment',
      'model AttendanceSession',
      'model AttendanceRecord',
      'model GradeScale',
      'model Exam',
      'model ExamSchedule',
      'model ExamMark',
      'model ReportCard',
    ];
    for (const entity of domainEntities) {
      expect(schemaContent).toContain(entity);
    }
  });

  it('should strictly exclude Fee Collection module per ADR-02 and user scope directive', () => {
    const feeModels = [
      'model Fee',
      'model FeeStructure',
      'model FeeHead',
      'model FeeInvoice',
      'model FeePayment',
      'model FeeReceipt',
      'model FeeDiscount',
    ];
    for (const model of feeModels) {
      expect(schemaContent).not.toContain(model);
    }
  });

  it('should ensure all domain entities contain tenant_id for tenant isolation', () => {
    const tenantScopedEntities = [
      'model AcademicYear {',
      'model Class {',
      'model Section {',
      'model Subject {',
      'model AdmissionApplication {',
      'model Student {',
      'model StudentEnrollment {',
      'model Guardian {',
      'model StudentGuardian {',
      'model Teacher {',
      'model TeacherAssignment {',
      'model AttendanceSession {',
      'model AttendanceRecord {',
      'model GradeScale {',
      'model Exam {',
      'model ExamSchedule {',
      'model ExamMark {',
      'model ReportCard {',
    ];
    for (const modelHeader of tenantScopedEntities) {
      const modelBlock = schemaContent.split(modelHeader)[1]?.split('}')[0];
      expect(modelBlock).toBeDefined();
      expect(modelBlock).toContain('tenant_id');
    }
  });

  it('should ensure all domain entities use database-generated integer IDs', () => {
    const autoincrementDomainModels = [
      'model AcademicYear {',
      'model Class {',
      'model Section {',
      'model Subject {',
      'model AdmissionApplication {',
      'model Student {',
      'model StudentEnrollment {',
      'model Guardian {',
      'model StudentGuardian {',
      'model Teacher {',
      'model TeacherAssignment {',
      'model AttendanceSession {',
      'model AttendanceRecord {',
      'model GradeScale {',
      'model Exam {',
      'model ExamSchedule {',
      'model ExamMark {',
      'model ReportCard {',
    ];
    for (const modelHeader of autoincrementDomainModels) {
      const modelBlock = schemaContent.split(modelHeader)[1]?.split('}')[0];
      expect(modelBlock).toBeDefined();
      expect(modelBlock).toMatch(/id\s+Int\s+@id\s+@default\(autoincrement\(\)\)/);
    }
  });
});
