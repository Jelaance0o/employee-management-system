import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, Check, LoaderCircle, X } from "lucide-react";
import type { Project, Task, TaskFormValues, TaskPriority, TaskTeammate } from "../tasks.types";
import { EMPTY_TASK_FORM, TASK_PRIORITIES } from "../tasks.types";
import { getTaskErrorMessage } from "../tasks.utils";
import { createTask, getEligibleProjectAssignees, updateTask } from "../tasks.api";
import { Avatar } from "../../team/components/TeamBadges";

interface Props {
  task?: Task | null;
  projects: Project[];
  onClose: () => void;
  onSaved: (task: Task, created: boolean) => void;
}

export default function TaskFormDialog({ task, projects, onClose, onSaved }: Props) {
  const [values, setValues] = useState<TaskFormValues>(EMPTY_TASK_FORM);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [projectTeammates, setProjectTeammates] = useState<TaskTeammate[]>([]);
  const [loadingProjectTeammates, setLoadingProjectTeammates] = useState(false);
  const [teammateError, setTeammateError] = useState("");

  useEffect(() => {
    if (task) setValues({ project_id: String(task.project_id), title: task.title, description: task.description ?? "", priority: task.priority, assigned_to_id: task.assigned_to_id ? String(task.assigned_to_id) : "", due_date: task.due_date?.slice(0, 10) ?? "" });
    else setValues({ ...EMPTY_TASK_FORM, project_id: projects[0] ? String(projects[0].id) : "" });
  }, [task, projects]);

  useEffect(() => {
    let cancelled = false;
    const projectId = Number(values.project_id);
    setProjectTeammates([]);
    setTeammateError("");
    if (!Number.isInteger(projectId) || projectId <= 0) { setLoadingProjectTeammates(false); return; }

    setLoadingProjectTeammates(true);
    getEligibleProjectAssignees(projectId)
      .then((members) => { if (!cancelled) setProjectTeammates(members.filter((member) => member.is_active && member.role === "employee")); })
      .catch((err) => { if (!cancelled) setTeammateError(getTaskErrorMessage(err)); })
      .finally(() => { if (!cancelled) setLoadingProjectTeammates(false); });

    return () => { cancelled = true; };
  }, [values.project_id]);

  const selectedAssignee = projectTeammates.find((person) => String(person.id) === values.assigned_to_id);

  const setField = <K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) => setValues((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(""); setSaving(true);
    try {
      let saved: Task;
      if (task) {
        const updatePayload: Partial<Pick<Task, "title" | "description" | "priority" | "assigned_to_id" | "due_date">> = {
          title: values.title.trim(),
          description: values.description.trim() || null,
          priority: values.priority,
          due_date: values.due_date || null,
        };
        const nextAssigneeId = values.assigned_to_id ? Number(values.assigned_to_id) : null;
        if (nextAssigneeId !== task.assigned_to_id) {
          updatePayload.assigned_to_id = nextAssigneeId;
        }
        saved = await updateTask(task.id, updatePayload);
      } else {
        saved = await createTask(values);
      }
      onSaved(saved, !task);
    } catch (err) { setError(getTaskErrorMessage(err)); }
    finally { setSaving(false); }
  };

  return <div className="ts-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
    <section className="ts-dialog ts-task-dialog" role="dialog" aria-modal="true" aria-labelledby="ts-task-form-title">
      <header className="ts-dialog-header"><div className="ts-dialog-heading-copy"><h2 id="ts-task-form-title">{task ? "Edit task" : "Create a task"}</h2><p>{task ? "Update the task details." : "Add a task to a project and assign ownership."}</p></div><button type="button" className="ts-icon-button" onClick={onClose} disabled={saving} aria-label="Close dialog"><X size={18} /></button></header>
      <form className="ts-task-form" onSubmit={submit}>
        {error && <div className="ts-feedback ts-feedback-error ts-task-form-error"><AlertCircle size={16} /><span>{error}</span></div>}
        {!task && <label className="ts-task-field ts-task-field-full"><span>Project <b>*</b></span><select required value={values.project_id} onChange={(event) => { setField("project_id", event.target.value); setField("assigned_to_id", ""); }}><option value="">Select a project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>{projects.length === 0 && <small>You need access to a project before creating a task.</small>}</label>}
        <label className="ts-task-field ts-task-field-full"><span>Task title <b>*</b></span><input required minLength={2} maxLength={200} value={values.title} onChange={(event) => setField("title", event.target.value)} placeholder="e.g. Build login form" /></label>
        <label className="ts-task-field ts-task-field-full"><span>Description</span><textarea rows={4} maxLength={5000} value={values.description} onChange={(event) => setField("description", event.target.value)} placeholder="Describe the expected outcome..." /><small>{values.description.length}/5000 characters</small></label>
        <label className="ts-task-field"><span>Priority</span><select value={values.priority} onChange={(event) => setField("priority", event.target.value as TaskPriority)}>{TASK_PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority[0].toUpperCase() + priority.slice(1)}</option>)}</select></label>
        <label className="ts-task-field"><span>Due date</span><input type="date" value={values.due_date} onChange={(event) => setField("due_date", event.target.value)} /></label>
        <label className="ts-task-field ts-task-field-full"><span>Assignee</span><select value={values.assigned_to_id} onChange={(event) => setField("assigned_to_id", event.target.value)} disabled={loadingProjectTeammates || !values.project_id || Boolean(teammateError)}><option value="">{loadingProjectTeammates ? "Loading eligible teammates…" : "Unassigned"}</option>{projectTeammates.map((person) => <option key={person.id} value={person.id}>{person.full_name} — {person.email}</option>)}</select><small>{teammateError || (values.project_id && !loadingProjectTeammates && projectTeammates.length === 0 ? "No eligible teammates are assigned to this project. Add an active Member to assign a task." : "Only active Members assigned to this project can be selected.")}</small>{selectedAssignee && <div className="ts-task-assignee-preview"><Avatar name={selectedAssignee.full_name} profilePictureUrl={selectedAssignee.profile_picture_url} size="small" /><span><strong>{selectedAssignee.full_name}</strong><small>{selectedAssignee.email}</small></span></div>}</label>
        <footer className="ts-task-form-footer"><button type="button" className="ts-button-secondary" onClick={onClose} disabled={saving}>Cancel</button><button type="submit" className="ts-button-primary" disabled={saving || (!task && projects.length === 0)}>{saving ? <LoaderCircle className="ts-task-spin" size={16} /> : <Check size={16} />}{saving ? "Saving..." : task ? "Save changes" : "Create task"}</button></footer>
      </form>
    </section>
  </div>;
}
