export type JobStatus = "Applied" | "OA" | "Interview" | "Offer" | "Rejected";

export const JOB_STATUSES: JobStatus[] = [
  "Applied",
  "OA",
  "Interview",
  "Offer",
  "Rejected",
];

export const STATUS_LABELS: Record<JobStatus, string> = {
  Applied: "Applied",
  OA: "OA (Online Assessment)",
  Interview: "Interview",
  Offer: "Offer",
  Rejected: "Rejected",
};

export interface JobCard {
  id: string;
  user_id: string;
  company_name: string;
  job_title: string;
  job_field: string | null;
  skills: string[];
  job_description: string | null;
  resume_url: string | null;
  status: JobStatus;
  interview_date: string | null; // ISO date string, only relevant when status === 'Interview'
  created_at: string;
  updated_at: string;
}

export type JobCardInput = Omit<
  JobCard,
  "id" | "user_id" | "created_at" | "updated_at"
>;

export interface JobFilters {
  search: string;
  status: JobStatus | "All";
  field: string | "All";
  skill: string | "All";
}
