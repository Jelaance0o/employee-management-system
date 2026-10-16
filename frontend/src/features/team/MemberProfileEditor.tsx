import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Code2, LoaderCircle, Save, UserRound, Camera } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../lib/api";
import AuthenticatedProfileImage from "../../components/AuthenticatedProfileImage";
import { getErrorMessage } from "./team.utils";
import "./styles/member-profile-editor.css";

function splitValues(value: string) { return value.split(",").map((item) => item.trim()).filter(Boolean); }
export default function MemberProfileEditor() {
  const { user } = useAuth();
  const [department, setDepartment] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
  const [techStack, setTechStack] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pictureUrl, setPictureUrl] = useState<string | null>(user?.profile_picture_url ?? null);
  const [pictureSaving, setPictureSaving] = useState(false);

  useEffect(() => {
    setDepartment(user?.department ?? ""); setJobTitle(user?.job_title ?? ""); setBio(user?.bio ?? "");
    setSkills((user?.skills ?? []).join(", ")); setTechStack((user?.tech_stack ?? []).join(", "));
  }, [user]);

  useEffect(() => { setPictureUrl(user?.profile_picture_url ?? null); }, [user?.profile_picture_url]);

  async function uploadPicture(file?: File) {
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) { setError("Choose a PNG, JPEG, WebP, or GIF image."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Profile images must be 5 MB or smaller."); return; }
    setPictureSaving(true); setError(""); setNotice("");
    try {
      await api.put("/api/v1/teammates/me/picture", file, { headers: { "Content-Type": file.type } });
      setPictureUrl(`/api/v1/teammates/me/picture?v=${Date.now()}`);
      setNotice("Profile picture updated.");
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setPictureSaving(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const response = await api.patch<typeof user>("/api/v1/teammates/me/profile", {
        department: department.trim() || null,
        job_title: jobTitle.trim() || null,
        bio: bio.trim() || null,
        skills: splitValues(skills),
        tech_stack: splitValues(techStack),
      });
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

  return <section className="ts-panel ts-member-profile-editor"><header className="ts-member-profile-editor-heading"><span><UserRound size={18} /></span><div><h2>Your profile & tech stack</h2><p>Help your manager understand your skills and the tools you work with.</p></div></header>
    <div className="ts-profile-picture-row"><div className="ts-profile-picture-preview"><><span>{user?.full_name?.trim().charAt(0).toUpperCase() || "U"}</span>{pictureUrl && <AuthenticatedProfileImage src={pictureUrl} alt="Your profile" refreshKey={pictureUrl.includes("?") ? Number(pictureUrl.split("?")[1].split("=")[1]) || 0 : 0} />}</></div><div className="ts-profile-picture-copy"><strong>Profile picture</strong><p>PNG, JPEG, WebP, or GIF · up to 5 MB</p><label className="ts-button-secondary ts-profile-picture-button"><Camera size={15} />{pictureSaving ? "Uploading..." : "Choose image"}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={pictureSaving} onChange={(event) => { void uploadPicture(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label></div></div>
    {error && <div className="ts-feedback ts-feedback-error"><AlertCircle size={15} /><span>{error}</span></div>}
    {notice && <div className="ts-feedback ts-feedback-success"><CheckCircle2 size={15} /><span>{notice}</span></div>}
    <form onSubmit={(event) => void submit(event)} className="ts-member-profile-editor-form">
      <label><span>Department</span><input value={department} maxLength={100} onChange={(event) => setDepartment(event.target.value)} placeholder="e.g. Engineering, Design" /></label>
      <label><span>Job title</span><input value={jobTitle} maxLength={120} onChange={(event) => setJobTitle(event.target.value)} placeholder="e.g. Frontend Developer" /></label>
      <label className="ts-member-profile-editor-full"><span>About you</span><textarea value={bio} maxLength={1000} rows={3} onChange={(event) => setBio(event.target.value)} placeholder="A short introduction, focus areas, or what you're currently learning..." /><small>{bio.length}/1000 characters</small></label>
      <label><span>Skills</span><textarea value={skills} rows={2} onChange={(event) => setSkills(event.target.value)} placeholder="React, TypeScript, UI design" /><small>Separate items with commas.</small></label>
      <label><span><Code2 size={13} /> Tech stack</span><textarea value={techStack} rows={2} onChange={(event) => setTechStack(event.target.value)} placeholder="React, FastAPI, PostgreSQL, Redis" /><small>Separate technologies with commas.</small></label>
      <div className="ts-member-profile-editor-footer"><p>Only enter skills and technologies you actually use or are learning.</p><button type="submit" className="ts-button-primary" disabled={saving}>{saving ? <LoaderCircle className="ts-task-spin" size={15} /> : <Save size={15} />}{saving ? "Saving..." : "Save profile"}</button></div>
    </form>
  </section>;
}
