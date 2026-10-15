import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Clock3, LoaderCircle, MessageSquareText, Send, ShieldAlert, X } from "lucide-react";
import api from "../../../lib/api";
import type { Task } from "../tasks.types";
import { getTaskErrorMessage } from "../tasks.utils";
import "../styles/task-reports.css";

type ReportType = "progress" | "blocker" | "issue" | "question";
type ReportStatus = "open" | "acknowledged" | "resolved";
interface TaskReport {
  id: number;
  task_id: number;
  project_id: number | null;
  task_title: string | null;
  project_name: string | null;
  submitted_by_id: number;
  submitted_by_name: string | null;
  project_manager_name: string | null;
  report_type: ReportType;
  message: string;
  status: ReportStatus;
  manager_response: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}
interface Props { tasks: Task[]; userId: number | undefined; role: string | undefined; }
const TYPE_LABELS: Record<ReportType, string> = { progress: "Progress update", blocker: "Blocker", issue: "Technical issue", question: "Question" };
function formatDate(value: string) { return new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }); }

export default function TaskReportsPanel({ tasks, userId, role }: Props) {
  const isMember = role === "employee";
  const canReview = role === "admin" || role === "project_manager";
  const [reports, setReports] = useState<TaskReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [taskId, setTaskId] = useState("");
  const [reportType, setReportType] = useState<ReportType>("blocker");
  const [message, setMessage] = useState("");
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [busyReportId, setBusyReportId] = useState<number | null>(null);
  const assignedTasks = useMemo(() => tasks.filter((task) => task.assigned_to_id === userId), [tasks, userId]);

  const loadReports = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await api.get<TaskReport[]>("/api/v1/task-reports", { params: { limit: 100, offset: 0 } });
      setReports(response.data);
    } catch (err) { setError(getTaskErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void loadReports(); }, [loadReports]);

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!taskId || message.trim().length < 5) { setError("Choose a task and provide at least 5 characters of detail."); return; }
    setSubmitting(true); setError(""); setNotice("");
    try {
      await api.post<TaskReport>(`/api/v1/tasks/${Number(taskId)}/reports`, { report_type: reportType, message: message.trim() });
      setMessage(""); setNotice("Your update was sent to the project manager.");
      await loadReports();
    } catch (err) { setError(getTaskErrorMessage(err)); }
    finally { setSubmitting(false); }
  }

  async function updateReport(report: TaskReport, status?: ReportStatus) {
    setBusyReportId(report.id); setError(""); setNotice("");
    try {
      const payload: { status?: ReportStatus; manager_response?: string | null } = {};
      if (status) payload.status = status;
      if (responses[report.id] !== undefined) payload.manager_response = responses[report.id].trim() || null;
      const response = await api.patch<TaskReport>(`/api/v1/task-reports/${report.id}`, payload);
      setReports((current) => current.map((item) => item.id === report.id ? response.data : item));
      setResponses((current) => { const next = { ...current }; delete next[report.id]; return next; });
      setNotice("Report updated successfully.");
    } catch (err) { setError(getTaskErrorMessage(err)); }
    finally { setBusyReportId(null); }
  }

  return <section className="ts-panel ts-task-reports-panel">
    <header className="ts-task-reports-heading"><div className="ts-task-reports-heading-icon"><MessageSquareText size={19} /></div><div><h2>{isMember ? "Task updates & help requests" : "Member reports"}</h2><p>{isMember ? "Send a progress review, report a blocker, or ask your manager for help." : "Review task progress, respond to blockers, and close resolved issues."}</p></div><span className="ts-task-reports-count">{reports.length}</span></header>
    {error && <div className="ts-feedback ts-feedback-error ts-task-report-feedback"><AlertCircle size={15} /><span>{error}</span><button type="button" className="ts-icon-button" onClick={() => setError("")} aria-label="Dismiss error"><X size={14} /></button></div>}
    {notice && <div className="ts-feedback ts-feedback-success ts-task-report-feedback"><CheckCircle2 size={15} /><span>{notice}</span><button type="button" className="ts-icon-button" onClick={() => setNotice("")} aria-label="Dismiss message"><X size={14} /></button></div>}

    {isMember && <form className="ts-task-report-form" onSubmit={(event) => void submitReport(event)}>
      <label><span>Which task is this about?</span><select required value={taskId} onChange={(event) => setTaskId(event.target.value)}><option value="">Select one of your tasks</option>{assignedTasks.map((task) => <option key={task.id} value={task.id}>{task.title} · #{task.id}</option>)}</select></label>
      <label><span>Type of update</span><select value={reportType} onChange={(event) => setReportType(event.target.value as ReportType)}>{Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="ts-task-report-message"><span>Details for your manager</span><textarea required minLength={5} maxLength={3000} rows={3} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="What have you completed, what is blocking you, or what help do you need?" /><small>{message.length}/3000 characters · Your report will be linked to the selected task.</small></label>
      <div className="ts-task-report-submit-row"><p><ShieldAlert size={14} /> Be specific so your manager can help faster.</p><button type="submit" className="ts-button-primary" disabled={submitting || assignedTasks.length === 0}>{submitting ? <LoaderCircle className="ts-task-spin" size={15} /> : <Send size={15} />}{submitting ? "Sending..." : "Send to manager"}</button></div>
      {assignedTasks.length === 0 && <p className="ts-task-report-empty-note">You need an assigned task before you can submit a task-specific report.</p>}
    </form>}

    <div className="ts-task-report-list-heading"><h3>{isMember ? "Your submitted reports" : "Reports needing attention"}</h3><button type="button" className="ts-task-report-refresh" onClick={() => void loadReports()} disabled={loading}><Clock3 size={14} /> Refresh</button></div>
    {loading ? <div className="ts-task-report-state"><LoaderCircle className="ts-task-spin" size={20} /> Loading reports...</div> : reports.length === 0 ? <div className="ts-task-report-state"><MessageSquareText size={23} /><strong>No reports yet</strong><span>{isMember ? "Your task updates and help requests will appear here." : "Member progress updates and blockers will appear here."}</span></div> : <div className="ts-task-report-list">{reports.map((report) => <article key={report.id} className="ts-task-report-card">
      <div className="ts-task-report-card-top"><div className="ts-task-report-card-title"><span className={`ts-task-report-type type-${report.report_type}`}>{TYPE_LABELS[report.report_type]}</span><strong>{report.task_title || `Task #${report.task_id}`}</strong><span>{report.project_name || "Project"}</span></div><span className={`ts-task-report-status status-${report.status}`}>{report.status}</span></div>
      <p className="ts-task-report-message-text">{report.message}</p>
      <div className="ts-task-report-meta"><span>{isMember ? "Sent" : `From ${report.submitted_by_name || "Member"}`} · {formatDate(report.created_at)}</span>{report.project_manager_name && <span>Manager: {report.project_manager_name}</span>}</div>
      {report.manager_response && <div className="ts-task-manager-response"><strong>Manager response</strong><p>{report.manager_response}</p></div>}
      {canReview && report.status !== "resolved" && <div className="ts-task-report-review"><textarea aria-label={`Response to report ${report.id}`} rows={2} maxLength={3000} value={responses[report.id] ?? report.manager_response ?? ""} onChange={(event) => setResponses((current) => ({ ...current, [report.id]: event.target.value }))} placeholder="Write a response or next step..." /><div><button type="button" className="ts-button-secondary" disabled={busyReportId === report.id} onClick={() => void updateReport(report, "acknowledged")}>{busyReportId === report.id ? <LoaderCircle className="ts-task-spin" size={14} /> : null}Acknowledge</button><button type="button" className="ts-button-primary" disabled={busyReportId === report.id} onClick={() => void updateReport(report, "resolved")}>{busyReportId === report.id ? <LoaderCircle className="ts-task-spin" size={14} /> : <CheckCircle2 size={14} />}Resolve</button><button type="button" className="ts-task-report-save-response" disabled={busyReportId === report.id || responses[report.id] === undefined} onClick={() => void updateReport(report)}>{busyReportId === report.id ? "Saving..." : "Save response"}</button></div></div>}
    </article>)}</div>}
  </section>;
}
