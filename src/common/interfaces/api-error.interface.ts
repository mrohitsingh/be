export interface ApiErrorDetail {
  field?: string;
  issue: string;
}

export interface ApiErrorResponse {
  status: number;
  code: string;
  message: string;
  request_id: string;
  details: ApiErrorDetail[] | null;
}
