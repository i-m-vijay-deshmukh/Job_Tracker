"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchJobCards,
  createJobCard,
  updateJobCard,
  deleteJobCard,
  updateJobStatus,
} from "@/lib/jobs";
import { JobCard, JobCardInput, JobFilters, JobStatus } from "@/lib/types";
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import FilterBar from "@/components/FilterBar";
import JobCardItem from "@/components/JobCardItem";
import JobForm from "@/components/JobForm";
import ConfirmDialog from "@/components/ConfirmDialog";
import JobDetailModal from "@/components/JobDetailModal";
import ResumeTextModal from "@/components/ResumeTextModal";

const EMPTY_FILTERS: JobFilters = {
  search: "",
  status: "All",
  field: "All",
  skill: "All",
};

export default function DashboardPage() {
  const supabase = createClient();

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<JobFilters>(EMPTY_FILTERS);

  const [formOpen, setFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobCard | null>(null);
  const [deletingJob, setDeletingJob] = useState<JobCard | null>(null);
  const [viewingJob, setViewingJob] = useState<JobCard | null>(null);
  const [resumeModalOpen, setResumeModalOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserEmail(user?.email ?? user?.phone ?? null);

      try {
        const data = await fetchJobCards();
        setJobs(data);
      } catch (err: any) {
        setError(err.message ?? "Could not load your applications.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fields = useMemo(
    () =>
      Array.from(new Set(jobs.map((j) => j.job_field).filter(Boolean))) as string[],
    [jobs]
  );
  const skills = useMemo(
    () => Array.from(new Set(jobs.flatMap((j) => j.skills))),
    [jobs]
  );

  const filteredJobs = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return jobs.filter((job) => {
      const matchesSearch =
        !search ||
        job.job_title.toLowerCase().includes(search) ||
        job.company_name.toLowerCase().includes(search);
      const matchesStatus = filters.status === "All" || job.status === filters.status;
      const matchesField = filters.field === "All" || job.job_field === filters.field;
      const matchesSkill = filters.skill === "All" || job.skills.includes(filters.skill);
      return matchesSearch && matchesStatus && matchesField && matchesSkill;
    });
  }, [jobs, filters]);

  async function handleCreateOrUpdate(input: JobCardInput) {
    if (editingJob) {
      const updated = await updateJobCard(editingJob.id, input);
      setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
      setViewingJob((prev) => (prev?.id === updated.id ? updated : prev));
    } else {
      const created = await createJobCard(input);
      setJobs((prev) => [created, ...prev]);
    }
    setFormOpen(false);
    setEditingJob(null);
  }

  async function handleStatusChange(job: JobCard, status: JobStatus) {
    const updated = await updateJobStatus(
      job.id,
      status,
      job.interview_date ?? undefined,
      job.oa_date ?? undefined
    );
    setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
    setViewingJob((prev) => (prev?.id === updated.id ? updated : prev));
  }

  async function handleDelete() {
    if (!deletingJob) return;
    await deleteJobCard(deletingJob.id);
    setJobs((prev) => prev.filter((j) => j.id !== deletingJob.id));
    setViewingJob((prev) => (prev?.id === deletingJob.id ? null : prev));
    setDeletingJob(null);
  }

  return (
    <div className="min-h-screen">
      <Navbar
        userEmail={userEmail}
        onAddNew={() => {
          setEditingJob(null);
          setFormOpen(true);
        }}
        onOpenResumeText={() => setResumeModalOpen(true)}
      />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-sm">
            <SearchBar
              value={filters.search}
              onChange={(search) => setFilters((f) => ({ ...f, search }))}
            />
          </div>
          <FilterBar
            filters={filters}
            fields={fields}
            skills={skills}
            onChange={setFilters}
          />
        </div>

        <p className="mt-4 text-sm text-ink/40">
          {filteredJobs.length} application{filteredJobs.length === 1 ? "" : "s"}
        </p>

        {loading ? (
          <div className="flex justify-center py-24 text-ink/40">
            <Loader2 className="animate-spin" />
          </div>
        ) : error ? (
          <div className="mt-6 rounded-card border border-status-rejected/20 bg-status-rejected/5 px-4 py-3 text-sm text-status-rejected">
            {error}
          </div>
        ) : filteredJobs.length === 0 ? (
          <EmptyState hasAnyJobs={jobs.length > 0} />
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredJobs.map((job) => (
              <JobCardItem
                key={job.id}
                job={job}
                onView={() => setViewingJob(job)}
                onEdit={() => {
                  setEditingJob(job);
                  setFormOpen(true);
                }}
                onDelete={() => setDeletingJob(job)}
                onStatusChange={(status) => handleStatusChange(job, status)}
              />
            ))}
          </div>
        )}
      </main>

      {viewingJob && !formOpen && !deletingJob && (
        <JobDetailModal
          job={viewingJob}
          onClose={() => setViewingJob(null)}
          onEdit={() => {
            setEditingJob(viewingJob);
            setFormOpen(true);
          }}
          onDelete={() => setDeletingJob(viewingJob)}
        />
      )}

      {formOpen && (
        <JobForm
          initial={editingJob}
          existingJobs={jobs}
          onCancel={() => {
            setFormOpen(false);
            setEditingJob(null);
          }}
          onSubmit={handleCreateOrUpdate}
        />
      )}

      {deletingJob && (
        <ConfirmDialog
          title="Delete this application?"
          description={`This removes ${deletingJob.job_title} at ${deletingJob.company_name} for good. You can't undo this.`}
          onConfirm={handleDelete}
          onCancel={() => setDeletingJob(null)}
        />
      )}

      {resumeModalOpen && (
        <ResumeTextModal onClose={() => setResumeModalOpen(false)} />
      )}
    </div>
  );
}

function EmptyState({ hasAnyJobs }: { hasAnyJobs: boolean }) {
  return (
    <div className="mt-6 flex flex-col items-center rounded-card border border-dashed border-ink/15 py-20 text-center">
      <Inbox className="text-ink/25" size={28} />
      <p className="mt-3 font-display text-base font-medium">
        {hasAnyJobs ? "No applications match these filters" : "No applications yet"}
      </p>
      <p className="mt-1 max-w-xs text-sm text-ink/50">
        {hasAnyJobs
          ? "Try clearing a filter or search term."
          : "Add your first application to start tracking it here."}
      </p>
    </div>
  );
}