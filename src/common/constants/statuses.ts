export const RecordStatus = {
  ACTIVE: 1,
  INACTIVE: 2,
  ARCHIVED: 3,
} as const;
export type RecordStatus = (typeof RecordStatus)[keyof typeof RecordStatus];

export const AdmissionStatus = {
  DRAFT: 1,
  SUBMITTED: 2,
  UNDER_REVIEW: 3,
  WAITLISTED: 4,
  OFFERED: 5,
  ENROLLED: 6,
  REJECTED: 7,
  WITHDRAWN: 8,
} as const;
export type AdmissionStatus = (typeof AdmissionStatus)[keyof typeof AdmissionStatus];

export const StudentStatus = {
  ACTIVE: 1,
  ON_LEAVE: 2,
  SUSPENDED: 3,
  TRANSFERRED_OUT: 4,
  GRADUATED: 5,
  ARCHIVED: 6,
} as const;
export type StudentStatus = (typeof StudentStatus)[keyof typeof StudentStatus];

export const EnrollmentStatus = {
  CURRENT: 1,
  COMPLETED: 2,
  RETAINED: 3,
  WITHDRAWN: 4,
} as const;
export type EnrollmentStatus = (typeof EnrollmentStatus)[keyof typeof EnrollmentStatus];

export const AttendanceRecordStatus = {
  PRESENT: 1,
  ABSENT: 2,
  LATE: 3,
  EXCUSED: 4,
  HALF_DAY: 5,
} as const;
export type AttendanceRecordStatus =
  (typeof AttendanceRecordStatus)[keyof typeof AttendanceRecordStatus];

export const AttendanceSessionStatus = {
  OPEN: 1,
  SUBMITTED: 2,
  LOCKED: 3,
  REOPENED: 4,
} as const;
export type AttendanceSessionStatus =
  (typeof AttendanceSessionStatus)[keyof typeof AttendanceSessionStatus];

export const ExamStatus = {
  SCHEDULED: 1,
  ONGOING: 2,
  EVALUATION: 3,
  MODERATED: 4,
  PUBLISHED: 5,
  CANCELLED: 6,
} as const;
export type ExamStatus = (typeof ExamStatus)[keyof typeof ExamStatus];

export const ExamMarkStatus = {
  NOT_ENTERED: 1,
  DRAFT: 2,
  SUBMITTED: 3,
  APPROVED: 4,
} as const;
export type ExamMarkStatus = (typeof ExamMarkStatus)[keyof typeof ExamMarkStatus];

export const ReportCardStatus = {
  PENDING: 1,
  COMPILED: 2,
  PUBLISHED: 3,
  WITHHELD: 4,
} as const;
export type ReportCardStatus = (typeof ReportCardStatus)[keyof typeof ReportCardStatus];
