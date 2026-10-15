import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Code2, ImagePlus, LoaderCircle, Save, Trash2, UserRound } from "lucide-react";
import { useAuth, type User } from "../../contexts/AuthContext";
import { getApiUrl } from "../../lib/api";
import api from "../../lib/api";
import { getErrorMessage } from "./team.utils";
import "./styles/member-profile-editor.css";

function splitValues(value: string) { return value.split(",").map((item) => item.trim()).filter(Boolean); }
export default function MemberProfileEditor() {
  const { user, updateUser } = useAuth();
  const [department, setDepartment] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
  const [techStack, setTechStack] = useState("");
  const [pictureData, setPictureData] = useState<string | undefined>(undefined);
  const [pictureError, setPictureError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setDepartment(user?.department ?? ""); setJobTitle(user?.job_title ?? ""); setBio(user?.bio ?? "");
    setSkills((user?.skills ?? []).join(", ")); setTechStack((user?.tech_stack ?? []).join(", ")); setPictureData(undefined);
  }, [user]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const payload: Record<string, unknown> = {
        department: department.trim() || null,
        job_title: jobTitle.trim() || null,
        bio: bio.trim() || null,
        skills: splitValues(skills),
        tech_stack: splitValues(techStack),
      };
      if (pictureData !== undefined) payload.profile_picture_data = pictureData || null;
      const response = await api.patch<User>("/api/v1/teammates/me/profile", payload);
      updateUser(response.data);
      setPictureData(undefined);
      if (response.data) {
        // Keep the page state in sync with the saved profile without a full reload.
        setDepartment(response.data.department ?? ""); setJobTitle(response.data.job_title ?? "");
        setBio(response.data.bio ?? ""); setSkills((response.data.skills ?? []).join(", "));
        setTechStack((response.data.tech_stack ?? []).join(", "));
      }
      setNotice("Your profile details have been saved.");
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setSaving(false); }
  }

  function handlePictureChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPictureError("");
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setPictureError("Choose a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > 512 * 1024) {
      setPictureError("Profile pictures must be 512 KB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setPictureData(reader.result);
      else setPictureError("The selected image could not be read.");
    };
    reader.onerror = () => setPictureError("The selected image could not be read.");
    reader.readAsDataURL(file);
  }

  const picturePreview = pictureData === undefined
    ? (user?.profile_picture_url ? getApiUrl(user.profile_picture_url) : "")
    : pictureData;

  return <section className="ts-panel ts-member-profile-editor"><header className="ts-member-profile-editor-heading"><span><UserRound size={18} /></span><div><h2>Your profile & tech stack</h2><p>Help your manager understand your skills and the tools you work with.</p></div></header>
    {error && <div className="ts-feedback ts-feedback-error"><AlertCircle size={15} /><span>{error}</span></div>}
    {notice && <div className="ts-feedback ts-feedback-success"><CheckCircle2 size={15} /><span>{notice}</span></div>}
    {pictureError && <div className="ts-feedback ts-feedback-error"><AlertCircle size={15} /><span>{pictureError}</span></div>}
    <form onSubmit={(event) => void submit(event)} className="ts-member-profile-editor-form">
      <div className="ts-member-picture-field ts-member-profile-editor-full">
        <div className="ts-member-picture-preview" aria-label="Profile picture preview">
          {picturePreview ? <img src={picturePreview} alt="Profile preview" crossOrigin={pictureData === undefined ? "use-credentials" : undefined} /> : <UserRound size={25} />}
        </div>
        <div className="ts-member-picture-actions">
          <strong>Profile picture</strong>
          <small>PNG, JPEG, or WebP · maximum 512 KB</small>
          <div className="ts-member-picture-buttons">
            <label className="ts-button-secondary ts-member-picture-select"><ImagePlus size={14} />Choose image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePictureChange} disabled={saving} /></label>
            {(picturePreview || pictureData === undefined && user?.profile_picture_url) && <button type="button" className="ts-button-secondary" onClick={() => { setPictureData(""); setPictureError(""); }} disabled={saving}><Trash2 size={14} />Remove</button>}
          </div>
        </div>
      </div>
      <label><span>Department</span><input value={department} maxLength={100} onChange={(event) => setDepartment(event.target.value)} placeholder="e.g. Engineering, Design" /></label>
      <label><span>Job title</span><input value={jobTitle} maxLength={120} onChange={(event) => setJobTitle(event.target.value)} placeholder="e.g. Frontend Developer" /></label>
      <label className="ts-member-profile-editor-full"><span>About you</span><textarea value={bio} maxLength={1000} rows={3} onChange={(event) => setBio(event.target.value)} placeholder="A short introduction, focus areas, or what you're currently learning..." /><small>{bio.length}/1000 characters</small></label>
      <label><span>Skills</span><textarea value={skills} rows={2} onChange={(event) => setSkills(event.target.value)} placeholder="React, TypeScript, UI design" /><small>Separate items with commas.</small></label>
      <label><span><Code2 size={13} /> Tech stack</span><textarea value={techStack} rows={2} onChange={(event) => setTechStack(event.target.value)} placeholder="React, FastAPI, PostgreSQL, Redis" /><small>Separate technologies with commas.</small></label>
      <div className="ts-member-profile-editor-footer"><p>Only enter skills and technologies you actually use or are learning.</p><button type="submit" className="ts-button-primary" disabled={saving}>{saving ? <LoaderCircle className="ts-task-spin" size={15} /> : <Save size={15} />}{saving ? "Saving..." : "Save profile"}</button></div>
    </form>
  </section>;
}
