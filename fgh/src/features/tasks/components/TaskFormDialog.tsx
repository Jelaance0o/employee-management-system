import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, Check, LoaderCircle, X } from "lucide-react";
import type { Project, Task, TaskFormValues, TaskPriority, TaskTeammate } from "../tasks.types";
import { EMPTY_TASK_FORM, TASK_PRIORITIES } from "../tasks.types";
import { getTaskErrorMessage } from "../tasks.utils";
import { createTask, updateTask } from "../tasks.api";

interface Props {
  task?: Task | null;
  projects: Project[];
  teammates: TaskTeammate[];
  role: string | undefined;
  onClose: () => void;
  onSaved: (task: Task, created: boolean) => void;
}

export default function TaskFormDialog({ task, projects, teammates, role, onClose, onSaved }: Props) {
  const [values, setValues] = useState<TaskFormValues>(EMPTY_TASK_FORM);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(task);
  const isAdmin = role === "admin";

  useEffect(() => {
    if (task) setValues({ project_id: String(task.project_id), title: task.title, description: task.description ?? "", priority: task.priority, assigned_to_id: task.assigned_to_id ? String(task.assigned_to_id) : "", due_date: task.due_date?.slice(0, 10) ?? "" });
    else setValues({ ...EMPTY_TASK_FORM, project_id: projects[0] ? String(projects[0].id) : "" });
  }, [task, projects]);

  const setField = <K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) => setValues((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(""); setSaving(true);
    try {
      let saved: Task;
      if (task) {
        saved = await updateTask(task.id, {
          title: values.title.trim(),
          description: values.description.trim() || null,
          priority: values.priority,
          assigned_to_id: values.assigned_to_id ? Number(values.assigned_to_id) : null,
          due_date: values.due_date || null,
        });
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
        {!task && <label className="ts-task-field ts-task-field-full"><span>Project <b>*</b></span><select required value={values.project_id} onChange={(event) => setField("project_id", event.target.value)}><option value="">Select a project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>{projects.length === 0 && <small>You need access to a project before creating a task.</small>}</label>}
        <label className="ts-task-field ts-task-field-full"><span>Task title <b>*</b></span><input required minLength={2} maxLength={200} value={values.title} onChange={(event) => setField("title", event.target.value)} placeholder="e.g. Build login form" /></label>
        <label className="ts-task-field ts-task-field-full"><span>Description</span><textarea rows={4} maxLength={5000} value={values.description} onChange={(event) => setField("description", event.target.value)} placeholder="Describe the expected outcome..." /><small>{values.description.length}/5000 characters</small></label>
        <label className="ts-task-field"><span>Priority</span><select value={values.priority} onChange={(event) => setField("priority", event.target.value as TaskPriority)}>{TASK_PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority[0].toUpperCase() + priority.slice(1)}</option>)}</select></label>
        <label className="ts-task-field"><span>Due date</span><input type="date" value={values.due_date} onChange={(event) => setField("due_date", event.target.value)} /></label>
        <label className="ts-task-field ts-task-field-full"><span>Assignee</span>{isAdmin ? <select value={values.assigned_to_id} onChange={(event) => setField("assigned_to_id", event.target.value)}><option value="">Unassigned</option>{teammates.filter((person) => person.is_active).map((person) => <option key={person.id} value={person.id}>{person.full_name} — {person.email}</option>)}</select> : <input type="number" min="1" value={values.assigned_to_id} onChange={(event) => setField("assigned_to_id", event.target.value)} placeholder="Enter teammate ID (optional)" />}<small>{isAdmin ? "The assignee must be active and belong to the selected project's team." : "Enter a teammate ID who belongs to this project, or leave blank. The server validates membership."}</small></label>
        <footer className="ts-task-form-footer"><button type="button" className="ts-button-secondary" onClick={onClose} disabled={saving}>Cancel</button><button type="submit" className="ts-button-primary" disabled={saving || (!task && projects.length === 0)}>{saving ? <LoaderCircle className="ts-task-spin" size={16} /> : <Check size={16} />}{saving ? "Saving..." : task ? "Save changes" : "Create task"}</button></footer>
      </form>
    </section>
  </div>;
}
