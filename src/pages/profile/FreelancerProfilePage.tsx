import { useState, useEffect } from "react";
import { Share2, MessageCircle, Rocket, Star, GraduationCap, Award, X } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { FREELANCER_PROFILE } from "@/constants/mockData";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { CLIENT_NAV, FREELANCER_NAV } from "@/constants/nav";
import { formatCurrency } from "@/utils/formatters";
import { userService } from "@/services/user.service";
import type { UserExperience, UserEducation, UserCertification, UserLanguage, UserPortfolio } from "@/types";
import { cn } from "@/utils/cn";

export default function FreelancerProfilePage() {
  const { user, updateUser } = useAuth();
  const { notify } = useNotification();
  const navItems = user?.role === "client" ? CLIENT_NAV : FREELANCER_NAV;
  const p = FREELANCER_PROFILE;

  const isSelf = user?.role === "freelancer";
  const fullName = isSelf ? user.fullName : p.fullName;
  const title = isSelf ? (user.title || "AI Research Developer") : p.title;
  const location = isSelf ? (user.location || "Bangalore, India") : p.location;
  const avatarUrl = isSelf ? (user.avatar || user.avatarUrl || p.avatarUrl) : p.avatarUrl;
  const about = isSelf ? (user.bio || "") : p.about;
  const skills = isSelf ? (user.skills || []) : p.expertise;
  const hourlyRate = isSelf ? (user.hourlyRate || p.hourlyRate * 80) : p.hourlyRate * 80;

  const portfolio = isSelf ? (user.portfolio || []) : p.portfolio;
  const experience = isSelf ? (user.experience || []) : p.experience;
  const education = isSelf ? (user.education || []) : p.education;
  const certifications = isSelf ? (user.certifications || []) : p.certifications;
  const languages = isSelf ? (user.languages || []) : p.languages;

  // Edit Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [modalTab, setModalTab] = useState<"basic" | "experience" | "education" | "certifications" | "languages" | "portfolio">("basic");
  
  // Basic info states
  const [editFullName, setEditFullName] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editHourlyRate, setEditHourlyRate] = useState<number>(0);
  const [editBio, setEditBio] = useState("");
  const [editSkills, setEditSkills] = useState("");
  
  // Array lists states
  const [editExperience, setEditExperience] = useState<UserExperience[]>([]);
  const [editEducation, setEditEducation] = useState<UserEducation[]>([]);
  const [editCertifications, setEditCertification] = useState<UserCertification[]>([]);
  const [editLanguages, setEditLanguages] = useState<UserLanguage[]>([]);
  const [editPortfolio, setEditPortfolio] = useState<UserPortfolio[]>([]);
  const [saving, setSaving] = useState(false);

  // Sub-items add forms states
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

  // Sync edits
  useEffect(() => {
    if (user) {
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
    }
  }, [user, showEditModal]);

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
        setShowEditModal(false);
      }
    } catch (err: any) {
      notify(err.message || "Failed to save profile.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout navItems={navItems} tagline="Freelance Hub" searchPlaceholder="Search AI Experts...">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 h-40 rounded-3xl bg-gradient-to-br from-brand-600 via-violet-500 to-brand-400" />

        <div className="mb-6 -mt-16 flex flex-col items-start gap-5 rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card sm:flex-row sm:items-end">
          <Avatar src={avatarUrl} name={fullName} size="xl" className="ring-4 ring-white" />
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold text-ink-900">{fullName}</h1>
            <p className="text-sm text-ink-500">{title}</p>
            <p className="text-xs text-ink-400">{location}</p>
          </div>
          <div className="flex gap-2">
            {isSelf ? (
              <Button onClick={() => setShowEditModal(true)}>
                Edit Profile
              </Button>
            ) : (
              <>
                <Button icon={<Rocket className="h-4 w-4" />} iconPosition="left">
                  Hire Me
                </Button>
                <Button variant="outline" icon={<MessageCircle className="h-4 w-4" />} iconPosition="left">
                  Message
                </Button>
              </>
            )}
            <Button variant="outline" aria-label="Share profile">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
              <h2 className="mb-3 text-lg font-bold text-ink-900">About</h2>
              <p className="text-sm leading-relaxed text-ink-600">{about}</p>
            </div>

            <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-ink-900">Portfolio</h2>
                <a href="#" className="text-sm font-semibold text-brand-600">
                  View All
                </a>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {portfolio.length === 0 ? (
                  <p className="text-xs text-ink-400 py-4 col-span-2 text-center">No portfolio items added yet. Click Edit Profile to add some!</p>
                ) : (
                  portfolio.map((item: any, idx: number) => (
                    <div key={idx} className="rounded-2xl border border-surface-border p-3 bg-surface-muted/30">
                      {item.imageUrl && (
                        <img src={item.imageUrl} alt={item.title} className="mb-2 aspect-video w-full rounded-xl object-cover" />
                      )}
                      <p className="text-sm font-semibold text-ink-900">{item.title}</p>
                      <p className="text-xs text-ink-600 mt-1">{item.description}</p>
                      {item.url && (
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-brand-600 font-bold hover:underline block mt-2">
                          Visit Project →
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
              <h2 className="mb-4 text-lg font-bold text-ink-900">Experience</h2>
              <div className="space-y-5">
                {experience.length === 0 ? (
                  <p className="text-xs text-ink-400 py-2">No experience history listed.</p>
                ) : (
                  experience.map((exp: any, idx: number) => (
                    <div key={idx} className="flex gap-4">
                      <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-600" />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-ink-900">{exp.role}</p>
                          <span className="text-xs font-semibold text-brand-600">{exp.period}</span>
                        </div>
                        <p className="text-sm text-ink-500">{exp.company}</p>
                        <p className="mt-1 text-sm text-ink-600">{exp.description}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
                <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-ink-900">
                  <GraduationCap className="h-5 w-5 text-brand-600" /> Education
                </h2>
                {education.length === 0 ? (
                  <p className="text-xs text-ink-400 py-2">No education history listed.</p>
                ) : (
                  education.map((ed: any, idx: number) => (
                    <div key={idx} className="mb-3">
                      <p className="text-sm font-semibold text-ink-900">{ed.degree}</p>
                      <p className="text-xs text-ink-500 font-bold">{ed.institution}</p>
                      <p className="text-[10px] text-ink-400">{ed.period}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
                <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-ink-900">
                  <Award className="h-5 w-5 text-brand-600" /> Certifications
                </h2>
                {certifications.length === 0 ? (
                  <p className="text-xs text-ink-400 py-2">No certifications listed.</p>
                ) : (
                  certifications.map((c: any, idx: number) => (
                    <div key={idx} className="mb-3">
                      <p className="text-sm font-semibold text-ink-900">{c.name}</p>
                      <p className="text-xs text-ink-400">{c.issuedDate}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
              <p className="text-2xl font-extrabold text-ink-900">
                {formatCurrency(hourlyRate)} <span className="text-sm font-medium text-ink-400">/hr</span>
              </p>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between text-ink-500">
                  <span>Availability</span>
                  <Badge tone="success">Available Now</Badge>
                </div>
                <div className="flex justify-between text-ink-500">
                  <span>Response Time</span>
                  <span className="font-semibold text-ink-900">{p.responseTime}</span>
                </div>
                <div className="flex justify-between text-ink-500">
                  <span>Last Active</span>
                  <span className="font-semibold text-ink-900">{p.lastActive}</span>
                </div>
              </div>
              <Button fullWidth className="mt-5" icon={<Rocket className="h-4 w-4" />} iconPosition="left">
                Book Project
              </Button>
            </div>

            <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
              <h3 className="mb-3 font-bold text-ink-900">Expertise</h3>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill: string) => (
                  <Badge key={skill} tone="neutral">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-bold text-ink-900">Client Reviews</h3>
                <span className="flex items-center gap-1 text-sm font-bold text-ink-900">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {p.rating.toFixed(1)}
                </span>
              </div>
              <div className="space-y-4">
                {p.reviews.map((r) => (
                  <div key={r.id}>
                    <p className="text-sm font-semibold text-ink-900">{r.reviewerName}</p>
                    <p className="text-xs text-ink-400">{r.reviewerTitle}</p>
                    <p className="mt-1 text-sm italic text-ink-600">"{r.comment}"</p>
                  </div>
                ))}
              </div>
              <a href="#" className="mt-4 block text-sm font-semibold text-brand-600">
                Read All {p.reviewCount} Reviews
              </a>
            </div>

            <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
              <h3 className="mb-3 font-bold text-ink-900">Languages</h3>
              <div className="space-y-2 text-sm">
                {languages.length === 0 ? (
                  <p className="text-xs text-ink-400 py-2">No languages listed.</p>
                ) : (
                  languages.map((lang: any, idx: number) => (
                    <div key={idx} className="flex justify-between">
                      <span className="text-ink-700">{lang.name}</span>
                      <Badge tone="neutral">{lang.level}</Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-surface-border bg-surface-card p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute right-4 top-4 text-ink-400 hover:text-ink-900 transition-colors"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>

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

            <form onSubmit={handleSave} className="space-y-4 pt-2">
              
              {/* BASIC INFO TAB */}
              {modalTab === "basic" && (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Full Name"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      required
                    />
                    <Input
                      label="Professional Title"
                      value={editTitle}
                      placeholder="e.g. AI Research Lead"
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                    <Input
                      label="Location"
                      value={editLocation}
                      placeholder="e.g. Bangalore, India"
                      onChange={(e) => setEditLocation(e.target.value)}
                    />
                    <Input
                      label="Hourly Rate (₹/hr)"
                      type="number"
                      value={editHourlyRate}
                      onChange={(e) => setEditHourlyRate(Number(e.target.value))}
                    />
                  </div>

                  <Input
                    label="Skills (Comma-separated, e.g. React, Node, Python, PyTorch)"
                    value={editSkills}
                    onChange={(e) => setEditSkills(e.target.value)}
                  />

                  <Textarea
                    label="About / Summary"
                    value={editBio}
                    rows={4}
                    onChange={(e) => setEditBio(e.target.value)}
                  />
                </div>
              )}

              {/* EXPERIENCE TAB */}
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

              {/* EDUCATION TAB */}
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

              {/* CERTIFICATIONS TAB */}
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

              {/* LANGUAGES TAB */}
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

              {/* PORTFOLIO TAB */}
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
                <Button variant="outline" type="button" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={saving}>
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
