# API Endpoints Reference

## Base URL Configuration

- **Host**: `http://localhost:8082` (configured via `PORT` in `.env`, default `3000`)
- **Global Prefix**: `/api/v1` (configured via `API_PREFIX` in `.env`)
- **Base URL**: `http://localhost:8082/api/v1`

---

## Global Headers

| Header | Type | Description | Required |
| :--- | :--- | :--- | :--- |
| `Content-Type` | `string` | `application/json` for requests with payloads | Yes (for POST/PATCH) |
| `x-tenant-id` | `integer` | Target school/tenant ID (positive integer, e.g. `1`) | Yes (all protected routes) |

---

## Quick Reference Summary

| Method | Full Endpoint URL | Description | Tenant Context |
| :--- | :--- | :--- | :--- |
| `GET` | `http://localhost:8082/api/v1` | Root hello check | No |
| `GET` | `http://localhost:8082/api/v1/health` | Health and uptime check | No |
| `POST` | `http://localhost:8082/api/v1/academic/years` | Create academic year | Yes (`x-tenant-id`) |
| `GET` | `http://localhost:8082/api/v1/academic/years` | List academic years | Yes (`x-tenant-id`) |
| `POST` | `http://localhost:8082/api/v1/academic/classes` | Create class | Yes (`x-tenant-id`) |
| `GET` | `http://localhost:8082/api/v1/academic/classes` | List classes | Yes (`x-tenant-id`) |
| `POST` | `http://localhost:8082/api/v1/academic/sections` | Create section in a class | Yes (`x-tenant-id`) |
| `POST` | `http://localhost:8082/api/v1/academic/subjects` | Create subject in a class | Yes (`x-tenant-id`) |
| `GET` | `http://localhost:8082/api/v1/academic/subjects` | List subjects (filter by class) | Yes (`x-tenant-id`) |
| `POST` | `http://localhost:8082/api/v1/admissions/applications` | Submit admission application | Yes (`x-tenant-id`) |
| `GET` | `http://localhost:8082/api/v1/admissions/applications` | List applications (filter by status) | Yes (`x-tenant-id`) |
| `PATCH` | `http://localhost:8082/api/v1/admissions/applications/:id/status` | Update application status | Yes (`x-tenant-id`) |
| `POST` | `http://localhost:8082/api/v1/admissions/applications/:id/finalize` | Finalize admission & create student | Yes (`x-tenant-id`) |
| `GET` | `http://localhost:8082/api/v1/students` | List/query students | Yes (`x-tenant-id`) |
| `GET` | `http://localhost:8082/api/v1/students/:id` | Get student details by ID | Yes (`x-tenant-id`) |
| `POST` | `http://localhost:8082/api/v1/students/promote` | Bulk promote students | Yes (`x-tenant-id`) |
| `POST` | `http://localhost:8082/api/v1/students/:id/guardians` | Link guardian to a student | Yes (`x-tenant-id`) |
| `GET` | `http://localhost:8082/api/v1/attendance/sheet` | Get daily attendance sheet | Yes (`x-tenant-id`) |
| `POST` | `http://localhost:8082/api/v1/attendance/submit` | Submit section attendance records | Yes (`x-tenant-id`) |
| `PATCH` | `http://localhost:8082/api/v1/attendance/sessions/:id/lock` | Lock or unlock attendance session | Yes (`x-tenant-id`) |
| `POST` | `http://localhost:8082/api/v1/examinations/grade-scales` | Create grade scale | Yes (`x-tenant-id`) |
| `GET` | `http://localhost:8082/api/v1/examinations/grade-scales` | List grade scales | Yes (`x-tenant-id`) |
| `POST` | `http://localhost:8082/api/v1/examinations/exams` | Create exam | Yes (`x-tenant-id`) |
| `POST` | `http://localhost:8082/api/v1/examinations/schedules` | Create exam timetable/schedule | Yes (`x-tenant-id`) |
| `POST` | `http://localhost:8082/api/v1/examinations/marks/submit` | Submit marks for an exam schedule | Yes (`x-tenant-id`) |
| `POST` | `http://localhost:8082/api/v1/examinations/report-cards/compile` | Compile report cards for an exam | Yes (`x-tenant-id`) |
| `POST` | `http://localhost:8082/api/v1/examinations/exams/:id/publish` | Publish exam results | Yes (`x-tenant-id`) |
| `GET` | `http://localhost:8082/api/v1/examinations/exams/:examId/report-cards/:enrollmentId` | Retrieve student report card | Yes (`x-tenant-id`) |

---

## Detailed Endpoint Specifications

### 1. Root & Health

#### `GET http://localhost:8082/api/v1`
- **Description**: Basic root hello response.
- **Headers**: None required.
- **Response**: `"Hello World!"`

#### `GET http://localhost:8082/api/v1/health`
- **Description**: Health check endpoint.
- **Headers**: None required.
- **Response**:
```json
{
  "status": "ok",
  "timestamp": "2026-10-22T18:30:00.000Z"
}
```

---

### 2. Academic Module

All endpoints require `x-tenant-id: <id>`.

#### `POST http://localhost:8082/api/v1/academic/years`
- **Description**: Create an academic year.
- **Request Body**:
```json
{
  "name": "2026-2027",
  "start_date": "2026-06-01T00:00:00.000Z",
  "end_date": "2027-04-30T00:00:00.000Z",
  "is_current": true
}
```

#### `GET http://localhost:8082/api/v1/academic/years`
- **Description**: Retrieve all academic years for tenant.

#### `POST http://localhost:8082/api/v1/academic/classes`
- **Description**: Create an academic class/grade.
- **Request Body**:
```json
{
  "name": "Grade 10",
  "numeric_grade": 10
}
```

#### `GET http://localhost:8082/api/v1/academic/classes`
- **Description**: List all classes for tenant.

#### `POST http://localhost:8082/api/v1/academic/sections`
- **Description**: Create a section within a class.
- **Request Body**:
```json
{
  "class_id": 1,
  "name": "A",
  "capacity": 40
}
```

#### `POST http://localhost:8082/api/v1/academic/subjects`
- **Description**: Define a subject for a class.
- **Request Body**:
```json
{
  "class_id": 1,
  "name": "Mathematics",
  "code": "MATH10"
}
```

#### `GET http://localhost:8082/api/v1/academic/subjects`
- **Description**: List subjects, optionally filtered by class.
- **Query Parameters**:
  - `class_id` *(optional, integer)*: Filter subjects belonging to a class.
  - Example: `http://localhost:8082/api/v1/academic/subjects?class_id=1`

---

### 3. Admissions Module

All endpoints require `x-tenant-id: <id>`.

#### `POST http://localhost:8082/api/v1/admissions/applications`
- **Description**: Submit a new student application.
- **Request Body**:
```json
{
  "academic_year_id": 1,
  "class_id": 1,
  "first_name": "John",
  "last_name": "Doe",
  "date_of_birth": "2010-05-15T00:00:00.000Z",
  "gender": 1,
  "parent_name": "Robert Doe",
  "parent_email": "robert.doe@example.com",
  "parent_phone": "+1234567890"
}
```

#### `GET http://localhost:8082/api/v1/admissions/applications`
- **Description**: Query applications.
- **Query Parameters**:
  - `status` *(optional, integer)*: Filter by application status enum/code.
  - Example: `http://localhost:8082/api/v1/admissions/applications?status=1`

#### `PATCH http://localhost:8082/api/v1/admissions/applications/:id/status`
- **Description**: Transition application review status.
- **Path Parameters**: `id` (application ID)
- **Request Body**:
```json
{
  "status": 2
}
```

#### `POST http://localhost:8082/api/v1/admissions/applications/:id/finalize`
- **Description**: Finalize an approved admission application into an active student enrollment.
- **Path Parameters**: `id` (application ID)
- **Request Body**:
```json
{
  "section_id": 1,
  "admission_number": "ADM-2026-001",
  "roll_number": 1
}
```

---

### 4. Students Module

All endpoints require `x-tenant-id: <id>`.

#### `GET http://localhost:8082/api/v1/students`
- **Description**: Search and list students.
- **Query Parameters**:
  - `search` *(optional, string)*
  - `class_id` *(optional, integer)*
  - `section_id` *(optional, integer)*
  - `academic_year_id` *(optional, integer)*
  - `status` *(optional, integer)*
  - `page` *(optional, integer, default: 1)*
  - `limit` *(optional, integer, default: 20)*
  - Example: `http://localhost:8082/api/v1/students?class_id=1&section_id=2&page=1&limit=20`

#### `GET http://localhost:8082/api/v1/students/:id`
- **Description**: Retrieve student profile details, enrollments, and guardians.
- **Path Parameters**: `id` (student ID)

#### `POST http://localhost:8082/api/v1/students/promote`
- **Description**: Promote a list of student enrollments to the next class/academic year.
- **Request Body**:
```json
{
  "target_academic_year_id": 2,
  "target_class_id": 2,
  "target_section_id": 3,
  "enrollment_ids": [10, 11, 12]
}
```

#### `POST http://localhost:8082/api/v1/students/:id/guardians`
- **Description**: Link a guardian contact to a student.
- **Path Parameters**: `id` (student ID)
- **Request Body**:
```json
{
  "guardian_id": 5,
  "relationship": "Father",
  "is_primary": true
}
```

---

### 5. Attendance Module

All endpoints require `x-tenant-id: <id>`.

#### `GET http://localhost:8082/api/v1/attendance/sheet`
- **Description**: Retrieve student attendance roll sheet for a section on a given date.
- **Query Parameters**:
  - `section_id` *(required, integer)*
  - `date` *(required, string, format: `YYYY-MM-DD`)*
  - Example: `http://localhost:8082/api/v1/attendance/sheet?section_id=1&date=2026-10-23`

#### `POST http://localhost:8082/api/v1/attendance/submit`
- **Description**: Submit or update attendance records for a section session.
- **Request Body**:
```json
{
  "section_id": 1,
  "date": "2026-10-23T00:00:00.000Z",
  "records": [
    {
      "enrollment_id": 101,
      "status": 1,
      "remarks": "Present"
    },
    {
      "enrollment_id": 102,
      "status": 2,
      "remarks": "Sick leave"
    }
  ]
}
```

#### `PATCH http://localhost:8082/api/v1/attendance/sessions/:id/lock`
- **Description**: Lock or unlock an attendance session to prevent further edits.
- **Path Parameters**: `id` (session ID)
- **Request Body**:
```json
{
  "is_locked": true
}
```

---

### 6. Examinations Module

All endpoints require `x-tenant-id: <id>`.

#### `POST http://localhost:8082/api/v1/examinations/grade-scales`
- **Description**: Configure a grade scale system.
- **Request Body**:
```json
{
  "name": "Standard 10-Point Scale",
  "tiers": [
    { "name": "A+", "min_percentage": 90, "max_percentage": 100, "grade_point": 10.0 },
    { "name": "A", "min_percentage": 80, "max_percentage": 89.99, "grade_point": 9.0 },
    { "name": "B", "min_percentage": 70, "max_percentage": 79.99, "grade_point": 8.0 }
  ]
}
```

#### `GET http://localhost:8082/api/v1/examinations/grade-scales`
- **Description**: List all defined grade scales.

#### `POST http://localhost:8082/api/v1/examinations/exams`
- **Description**: Create an exam cycle/term.
- **Request Body**:
```json
{
  "academic_year_id": 1,
  "name": "Mid-Term Examination 2026",
  "start_date": "2026-11-01T00:00:00.000Z",
  "end_date": "2026-11-15T00:00:00.000Z"
}
```

#### `POST http://localhost:8082/api/v1/examinations/schedules`
- **Description**: Schedule an exam paper for a subject/class.
- **Request Body**:
```json
{
  "exam_id": 1,
  "class_id": 1,
  "subject_id": 1,
  "exam_date": "2026-11-02T09:00:00.000Z",
  "max_marks": 100,
  "passing_marks": 35
}
```

#### `POST http://localhost:8082/api/v1/examinations/marks/submit`
- **Description**: Submit student marks for a scheduled exam paper.
- **Request Body**:
```json
{
  "exam_schedule_id": 1,
  "marks": [
    { "enrollment_id": 101, "marks_obtained": 88.5, "is_absent": false },
    { "enrollment_id": 102, "marks_obtained": 0, "is_absent": true }
  ]
}
```

#### `POST http://localhost:8082/api/v1/examinations/report-cards/compile`
- **Description**: Compile and aggregate grades/report cards for students across an exam.
- **Request Body**:
```json
{
  "exam_id": 1,
  "class_id": 1,
  "grade_scale_id": 1
}
```

#### `POST http://localhost:8082/api/v1/examinations/exams/:id/publish`
- **Description**: Publish exam results, locking marks and releasing report cards.
- **Path Parameters**: `id` (exam ID)

#### `GET http://localhost:8082/api/v1/examinations/exams/:examId/report-cards/:enrollmentId`
- **Description**: Retrieve compiled report card for a specific student enrollment.
- **Path Parameters**:
  - `examId`: ID of the exam
  - `enrollmentId`: ID of the student enrollment
