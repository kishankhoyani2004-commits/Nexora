import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { userService } from "@/services/user.service";
import type { UserExperience, UserEducation, UserCertification, UserLanguage, UserPortfolio } from "@/types";
import { cn } from "@/utils/cn";

export type ProfileEditTab = "basic" | "experience" | "education" | "certifications" | "languages" | "portfolio";

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Which tab the modal opens on — lets each profile page deep-link into
   *  the section it's actually showing (e.g. the Certifications page opens
   *  straight to the certifications tab instead of forcing Basic Info first). */
  initialTab?: ProfileEditTab;
}

/**
 * Shared across all profile pages (Portfolio, Services, Skills,
 * Certifications) — extracted from the page that used to hold all four so
 * every page can open the same editor instead of duplicating ~380 lines of
 * form JSX per page. A client's own profile only ever shows the Basic Info
 * tab, since experience/education/certifications/languages/portfolio are
 * freelancer-only concepts.
 */
export function ProfileEditModal({ isOpen, onClose, initialTab = "basic" }: ProfileEditModalProps) {
  const { user, updateUser } = useAuth();
  const { notify } = useNotification();
  const isClientProfile = user?.role === "client";

  const [modalTab, setModalTab] = useState<ProfileEditTab>(initialTab);

  const [editFullName, setEditFullName] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editHourlyRate, setEditHourlyRate] = useState<number>(0);
  const [editBio, setEditBio] = useState("");
  const [editSkills, setEditSkills] = useState("");

  const [editExperience, setEditExperience] = useState<UserExperience[]>([]);
  const [editEducation, setEditEducation] = useState<UserEducation[]>([]);
  const [editCertifications, setEditCertification] = useState<UserCertification[]>([]);
  const [editLanguages, setEditLanguages] = useState<UserLanguage[]>([]);
  const [editPortfolio, setEditPortfolio] = useState<UserPortfolio[]>([]);
  const [saving, setSaving] = useState(false);

  const [expRole, setExpRole] = useState("");
  const [expCompany, setExpCompany] = useState("");
  const [expPeriod, setExpPeriod] = useState("");
  const [expDesc, setExpDesc] = useState("");

  const [eduDegree, setEduDegree] = useState("");
  const [eduInst, setEduInst] = useState("");
  const [eduPeriod, setEduPeriod] = useState("");

  const [certName, setCertName] = useState("");
  const [certDate, setCertDate] = useState("");

  const [langName, setLangName] = useState("");
  const [langLevel, setLangLevel] = useState("Fluent");

  const [portTitle, setPortTitle] = useState("");
  const [portDesc, setPortDesc] = useState("");
  const [portUrl, setPortUrl] = useState("");
  const [portImageUrl, setPortImageUrl] = useState("");

  // Re-sync from the real user record (and jump to the requested tab)
  // every time the modal opens.
  useEffect(() => {
    if (user && isOpen) {
      setEditFullName(user.fullName || "");
      setEditTitle(user.title || "");
      setEditLocation(user.location || "");
      setEditHourlyRate(user.hourlyRate || 0);
      setEditBio(user.bio || "");
      setEditSkills(user.skills ? user.skills.join(", ") : "");
      setEditExperience(user.experience || []);
      setEditEducation(user.education || []);
      setEditCertification(user.certifications || []);
      setEditLanguages(user.languages || []);
      setEditPortfolio(user.portfolio || []);
      setModalTab(initialTab);
    }
  }, [user, isOpen, initialTab]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      setSaving(true);
      const skillsArray = editSkills.split(",").map((s) => s.trim()).filter(Boolean);
      const res = await userService.updateProfile(user.id || user._id || "", {
        fullName: editFullName,
        title: editTitle,
        location: editLocation,
        hourlyRate: Number(editHourlyRate),
        bio: editBio,
        skills: skillsArray,
        experience: editExperience,
        education: editEducation,
        certifications: editCertifications,
        languages: editLanguages,
        portfolio: editPortfolio,
      });
      const updatedUser = (res.data as any).user || res.data.data;
      if (updatedUser) {
        updateUser(updatedUser);
        notify("Profile updated successfully.", "success");
        onClose();
      }
    } catch (err: any) {
      notify(err.message || "Failed to save profile.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-surface-border bg-surface-card p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-ink-400 hover:text-ink-900 transition-colors"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {!isClientProfile && (
          <div className="flex gap-2 border-b border-surface-border pb-2 overflow-x-auto text-[10px] sm:text-xs">
            {(["basic", "experience", "education", "certifications", "languages", "portfolio"] as const).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setModalTab(t)}
                className={cn(
                  "px-3 py-1 font-semibold rounded-lg capitalize shrink-0 transition-colors",
                  modalTab === t ? "bg-brand-50 text-brand-700 font-bold" : "text-ink-500 hover:bg-surface-muted"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 pt-2">

          {(isClientProfile || modalTab === "basic") && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Full Name"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  required
                />
                <Input
                  label="Location"
                  value={editLocation}
                  placeholder="e.g. Bangalore, India"
                  onChange={(e) => setEditLocation(e.target.value)}
                />
                {!isClientProfile && (
                  <>
                    <Input
                      label="Professional Title"
                      value={editTitle}
                      placeholder="e.g. AI Research Lead"
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                    <Input
                      label="Hourly Rate (₹/hr)"
                      type="number"
                      value={editHourlyRate || ""}
                      onChange={(e) => setEditHourlyRate(e.target.value === "" ? 0 : Number(e.target.value))}
                    />
                  </>
                )}
              </div>

              {!isClientProfile && (
                <Input
                  label="Skills (Comma-separated, e.g. React, Node, Python, PyTorch)"
                  value={editSkills}
                  onChange={(e) => setEditSkills(e.target.value)}
                />
              )}

              <Textarea
                label={isClientProfile ? "About Your Company" : "About / Summary"}
                value={editBio}
                rows={4}
                onChange={(e) => setEditBio(e.target.value)}
              />
            </div>
          )}

          {modalTab === "experience" && (
            <div className="space-y-4">
              <div className="space-y-2 max-h-48 overflow-y-auto border border-surface-border p-3 rounded-2xl bg-surface-muted/20">
                <h3 className="font-bold text-xs text-ink-900">Current Experience History</h3>
                {editExperience.length === 0 ? (
                  <p className="text-[10px] text-ink-500">No experiences listed yet.</p>
                ) : (
                  editExperience.map((exp, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-surface-card p-2 rounded-xl border border-surface-border">
                      <div className="text-[10px] min-w-0 flex-1 pr-2">
                        <p className="font-bold text-ink-900 truncate">{exp.role} at {exp.company}</p>
                        <p className="text-ink-400 truncate">{exp.period}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditExperience(editExperience.filter((_, i) => i !== idx))}
                        className="text-[10px] font-bold text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-surface-border pt-3 space-y-3">
                <h4 className="font-bold text-xs text-ink-900">Add New Experience</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="Role" value={expRole} placeholder="e.g. Lead Developer" onChange={(e) => setExpRole(e.target.value)} />
                  <Input label="Company" value={expCompany} placeholder="e.g. Nexora AI" onChange={(e) => setExpCompany(e.target.value)} />
                </div>
                <Input label="Period (e.g. 2022 - Present)" value={expPeriod} onChange={(e) => setExpPeriod(e.target.value)} />
                <Textarea label="Description" value={expDesc} rows={2} onChange={(e) => setExpDesc(e.target.value)} />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!expRole || !expCompany) {
                      notify("Role and Company are required.", "error");
                      return;
                    }
                    setEditExperience([...editExperience, { role: expRole, company: expCompany, period: expPeriod, description: expDesc }]);
                    setExpRole("");
                    setExpCompany("");
                    setExpPeriod("");
                    setExpDesc("");
                  }}
                >
                  + Add Experience
                </Button>
              </div>
            </div>
          )}

          {modalTab === "education" && (
            <div className="space-y-4">
              <div className="space-y-2 max-h-48 overflow-y-auto border border-surface-border p-3 rounded-2xl bg-surface-muted/20">
                <h3 className="font-bold text-xs text-ink-900">Current Education History</h3>
                {editEducation.length === 0 ? (
                  <p className="text-[10px] text-ink-500">No education entries listed yet.</p>
                ) : (
                  editEducation.map((edu, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-surface-card p-2 rounded-xl border border-surface-border">
                      <div className="text-[10px] min-w-0 flex-1 pr-2">
                        <p className="font-bold text-ink-900 truncate">{edu.degree}</p>
                        <p className="text-ink-400 truncate">{edu.institution} • {edu.period}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditEducation(editEducation.filter((_, i) => i !== idx))}
                        className="text-[10px] font-bold text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-surface-border pt-3 space-y-3">
                <h4 className="font-bold text-xs text-ink-900">Add New Education</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="Degree / Field" value={eduDegree} placeholder="e.g. B.S. in Computer Science" onChange={(e) => setEduDegree(e.target.value)} />
                  <Input label="Institution" value={eduInst} placeholder="e.g. Stanford University" onChange={(e) => setEduInst(e.target.value)} />
                </div>
                <Input label="Period (e.g. 2018 - 2022)" value={eduPeriod} onChange={(e) => setEduPeriod(e.target.value)} />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!eduDegree || !eduInst) {
                      notify("Degree and Institution are required.", "error");
                      return;
                    }
                    setEditEducation([...editEducation, { degree: eduDegree, institution: eduInst, period: eduPeriod }]);
                    setEduDegree("");
                    setEduInst("");
                    setEduPeriod("");
                  }}
                >
                  + Add Education
                </Button>
              </div>
            </div>
          )}

          {modalTab === "certifications" && (
            <div className="space-y-4">
              <div className="space-y-2 max-h-48 overflow-y-auto border border-surface-border p-3 rounded-2xl bg-surface-muted/20">
                <h3 className="font-bold text-xs text-ink-900">Current Certifications</h3>
                {editCertifications.length === 0 ? (
                  <p className="text-[10px] text-ink-500">No certifications added yet.</p>
                ) : (
                  editCertifications.map((c, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-surface-card p-2 rounded-xl border border-surface-border">
                      <div className="text-[10px] min-w-0 flex-1 pr-2">
                        <p className="font-bold text-ink-900 truncate">{c.name}</p>
                        <p className="text-ink-400 truncate">{c.issuedDate}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditCertification(editCertifications.filter((_, i) => i !== idx))}
                        className="text-[10px] font-bold text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-surface-border pt-3 space-y-3">
                <h4 className="font-bold text-xs text-ink-900">Add New Certification</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="Certification Name" value={certName} placeholder="e.g. AWS Certified Solutions Architect" onChange={(e) => setCertName(e.target.value)} />
                  <Input label="Issued Date" value={certDate} placeholder="e.g. Jan 2024" onChange={(e) => setCertDate(e.target.value)} />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!certName) {
                      notify("Certification Name is required.", "error");
                      return;
                    }
                    setEditCertification([...editCertifications, { name: certName, issuedDate: certDate }]);
                    setCertName("");
                    setCertDate("");
                  }}
                >
                  + Add Certification
                </Button>
              </div>
            </div>
          )}

          {modalTab === "languages" && (
            <div className="space-y-4">
              <div className="space-y-2 max-h-48 overflow-y-auto border border-surface-border p-3 rounded-2xl bg-surface-muted/20">
                <h3 className="font-bold text-xs text-ink-900">Current Languages</h3>
                {editLanguages.length === 0 ? (
                  <p className="text-[10px] text-ink-500">No languages listed.</p>
                ) : (
                  editLanguages.map((l, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-surface-card p-2 rounded-xl border border-surface-border">
                      <div className="text-[10px] min-w-0 flex-1 pr-2">
                        <p className="font-bold text-ink-900 truncate">{l.name}</p>
                        <p className="text-ink-400 truncate">{l.level}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditLanguages(editLanguages.filter((_, i) => i !== idx))}
                        className="text-[10px] font-bold text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-surface-border pt-3 space-y-3">
                <h4 className="font-bold text-xs text-ink-900">Add New Language</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="Language" value={langName} placeholder="e.g. English" onChange={(e) => setLangName(e.target.value)} />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-ink-400">Level</label>
                    <select
                      value={langLevel}
                      onChange={(e) => setLangLevel(e.target.value)}
                      className="w-full rounded-2xl border border-surface-border bg-surface-card px-4 py-3 text-xs outline-none focus:border-brand-500 text-ink-900 bg-surface-muted/50"
                    >
                      <option value="Native">Native</option>
                      <option value="Fluent">Fluent</option>
                      <option value="Conversational">Conversational</option>
                      <option value="Basic">Basic</option>
                    </select>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!langName) {
                      notify("Language Name is required.", "error");
                      return;
                    }
                    setEditLanguages([...editLanguages, { name: langName, level: langLevel }]);
                    setLangName("");
                    setLangLevel("Fluent");
                  }}
                >
                  + Add Language
                </Button>
              </div>
            </div>
          )}

          {modalTab === "portfolio" && (
            <div className="space-y-4">
              <div className="space-y-2 max-h-48 overflow-y-auto border border-surface-border p-3 rounded-2xl bg-surface-muted/20">
                <h3 className="font-bold text-xs text-ink-900">Current Portfolio Items</h3>
                {editPortfolio.length === 0 ? (
                  <p className="text-[10px] text-ink-500">No portfolio items added yet.</p>
                ) : (
                  editPortfolio.map((port, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-surface-card p-2 rounded-xl border border-surface-border">
                      <div className="text-[10px] min-w-0 flex-1 pr-2">
                        <p className="font-bold text-ink-900 truncate">{port.title}</p>
                        <p className="text-ink-400 truncate">{port.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditPortfolio(editPortfolio.filter((_, i) => i !== idx))}
                        className="text-[10px] font-bold text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-surface-border pt-3 space-y-3">
                <h4 className="font-bold text-xs text-ink-900">Add New Portfolio Item</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="Project Title" value={portTitle} placeholder="e.g. Chatbot App" onChange={(e) => setPortTitle(e.target.value)} />
                  <Input label="Project URL" value={portUrl} placeholder="e.g. https://github.com/..." onChange={(e) => setPortUrl(e.target.value)} />
                </div>
                <Input label="Image URL" value={portImageUrl} placeholder="e.g. https://..." onChange={(e) => setPortImageUrl(e.target.value)} />
                <Textarea label="Project Description" value={portDesc} rows={2} onChange={(e) => setPortDesc(e.target.value)} />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!portTitle || !portDesc) {
                      notify("Project Title and Description are required.", "error");
                      return;
                    }
                    setEditPortfolio([
                      ...editPortfolio,
                      {
                        title: portTitle,
                        description: portDesc,
                        url: portUrl,
                        imageUrl: portImageUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80",
                      },
                    ]);
                    setPortTitle("");
                    setPortDesc("");
                    setPortUrl("");
                    setPortImageUrl("");
                  }}
                >
                  + Add Portfolio Item
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saving}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
