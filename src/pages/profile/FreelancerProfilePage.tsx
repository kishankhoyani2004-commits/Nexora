import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Share2, MessageCircle, Rocket, Star, GraduationCap, Award, Mail, Calendar, Briefcase, PlusCircle } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProfileEditModal } from "@/components/profile/ProfileEditModal";
import { FREELANCER_PROFILE } from "@/constants/mockData";
import { useAuth } from "@/context/AuthContext";
import { CLIENT_NAV, FREELANCER_NAV } from "@/constants/nav";
import { ROUTES } from "@/constants/routes";
import { formatCurrency } from "@/utils/formatters";
import { userService } from "@/services/user.service";
import { reviewService } from "@/services/review.service";

export default function FreelancerProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: targetId } = useParams<{ id?: string }>();
  const navItems = user?.role === "client" ? CLIENT_NAV : FREELANCER_NAV;
  const p = FREELANCER_PROFILE;

  const myId = user?.id || user?._id;
  const isOwnProfile = !targetId || targetId === myId;
  const viewingOther = !!targetId && !isOwnProfile;

  // ── Fetch the real profile of another user when viewing via /profile/:id ──
  const { data: viewedUser, isLoading: viewedUserLoading } = useQuery({
    queryKey: ["user-profile", targetId],
    queryFn: async () => {
      const res = await userService.getById(targetId!);
      return (res.data as any).user ?? (res.data as any).data;
    },
    enabled: viewingOther,
  });

  // Previously `isSelf` required role === "freelancer", so a client viewing
  // their OWN profile fell through to freelancer mock data below and got
  // "Hire Me / Message" buttons on their own page instead of an edit option.
  // Any authenticated user viewing their own profile is "self", regardless
  // of role.
  const isSelf = isOwnProfile;
  // Real data source: the logged-in user (self) or the fetched target user (viewing other).
  const source: any = viewingOther ? viewedUser : isSelf ? user : null;

  // The profile being displayed belongs to a client (own profile or someone
  // else's) — freelancer-only concepts (hourly rate, portfolio, skills,
  // experience/education/certifications, "hire me") don't apply to it.
  const viewedRole: string = source?.role || (isSelf ? user?.role : undefined) || "freelancer";
  const isClientProfile = viewedRole === "client";

  const fullName = source ? (source.fullName || (isClientProfile ? "Client" : "Freelancer")) : p.fullName;
  const title = source ? (source.title || (isClientProfile ? "Client" : "Freelancer")) : p.title;
  const location = source ? (source.location || "Remote") : p.location;
  const avatarUrl = source ? (source.avatar || source.avatarUrl || "") : p.avatarUrl;
  const about = source ? (source.bio || "") : p.about;
  const skills = source ? (source.skills || []) : p.expertise;
  const hourlyRate = isClientProfile ? 0 : source ? (source.hourlyRate || (isSelf ? p.hourlyRate * 80 : 0)) : p.hourlyRate * 80;

  const portfolio = source ? (source.portfolio || []) : p.portfolio;
  const experience = source ? (source.experience || []) : p.experience;
  const education = source ? (source.education || []) : p.education;
  const certifications = source ? (source.certifications || []) : p.certifications;
  const languages = source ? (source.languages || []) : p.languages;

  // Real reviews for this profile — the Review collection is now maintained by
  // the Reviews & Ratings module (create/edit auto-recomputes User.rating too).
  const profileUserId: string | undefined = viewingOther ? targetId : source ? myId : undefined;
  const { data: reviewsRes } = useQuery({
    queryKey: ["profile-reviews", profileUserId],
    queryFn: async () => (await reviewService.listForUser(profileUserId!)).data,
    enabled: !!profileUserId,
  });

  const reviews = source ? (reviewsRes?.data || []) : p.reviews;
  const rating = source ? (source.rating ?? 0) : p.rating;
  const reviewCount = source ? (source.reviewCount ?? reviews.length) : p.reviewCount;
  const responseTime = source ? "—" : p.responseTime;
  const lastActive = source ? "—" : p.lastActive;

  // Edit Modal state — the form fields themselves now live in the shared
  // ProfileEditModal (see src/components/profile/ProfileEditModal.tsx), used
  // by this page and by the Services/Skills/Certifications pages alike.
  const [showEditModal, setShowEditModal] = useState(false);
  const [modalTab, setModalTab] = useState<"basic" | "experience" | "education" | "certifications" | "languages" | "portfolio">("basic");

  if (viewingOther && viewedUserLoading) {
    return (
      <DashboardLayout navItems={navItems} tagline="Freelance Hub" searchPlaceholder="Search AI Experts...">
        <div className="flex h-64 items-center justify-center text-ink-400">Loading profile…</div>
      </DashboardLayout>
    );
  }

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
                {/* "Hire Me" only makes sense on a freelancer's profile — a
                    client isn't available to be hired. */}
                {!isClientProfile && (
                  <Button icon={<Rocket className="h-4 w-4" />} iconPosition="left">
                    Hire Me
                  </Button>
                )}
                <Button
                  variant="outline"
                  icon={<MessageCircle className="h-4 w-4" />}
                  iconPosition="left"
                  onClick={() => {
                    if (!viewingOther || !targetId) return;
                    navigate(
                      `${ROUTES.MESSAGES}?to=${targetId}&name=${encodeURIComponent(fullName)}&avatar=${encodeURIComponent(avatarUrl || "")}`
                    );
                  }}
                >
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
              {about ? (
                <p className="text-sm leading-relaxed text-ink-600">{about}</p>
              ) : (
                <p className="text-sm text-ink-400">
                  {isSelf ? "Add a summary about yourself or your company from Edit Profile." : "No summary provided yet."}
                </p>
              )}
            </div>

            {/* Portfolio, Experience, Education & Certifications are freelancer-only
                concepts — a client's profile has none of this. */}
            {!isClientProfile && (
              <>
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
              </>
            )}
          </div>

          <div className="space-y-6">
            {isClientProfile ? (
              <>
                {/* Client details — email, member since, location — replace the
                    freelancer rate/availability card, which has no meaning here. */}
                <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
                  <h3 className="mb-3 font-bold text-ink-900">Company Details</h3>
                  <div className="space-y-3 text-sm">
                    {source?.email && (
                      <div className="flex items-center gap-2 text-ink-600">
                        <Mail className="h-4 w-4 text-ink-400 shrink-0" />
                        <span className="truncate">{source.email}</span>
                      </div>
                    )}
                    {source?.createdAt && (
                      <div className="flex items-center gap-2 text-ink-600">
                        <Calendar className="h-4 w-4 text-ink-400 shrink-0" />
                        <span>Member since {new Date(source.createdAt).toLocaleDateString([], { month: "long", year: "numeric" })}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-surface-border">
                      <span className="text-ink-500">Account Type</span>
                      <Badge tone="info">Client</Badge>
                    </div>
                  </div>
                </div>

                {isSelf && (
                  <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
                    <h3 className="mb-3 font-bold text-ink-900">Quick Actions</h3>
                    <div className="space-y-2">
                      <Button fullWidth icon={<PlusCircle className="h-4 w-4" />} iconPosition="left" onClick={() => navigate(ROUTES.POST_JOB)}>
                        Post a New Job
                      </Button>
                      <Button fullWidth variant="outline" icon={<Briefcase className="h-4 w-4" />} iconPosition="left" onClick={() => navigate(ROUTES.CLIENT_MY_JOBS)}>
                        My Job Posts
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
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
                      <span className="font-semibold text-ink-900">{responseTime}</span>
                    </div>
                    <div className="flex justify-between text-ink-500">
                      <span>Last Active</span>
                      <span className="font-semibold text-ink-900">{lastActive}</span>
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
                    {reviewCount > 0 && (
                      <span className="flex items-center gap-1 text-sm font-bold text-ink-900">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <div className="space-y-4">
                    {reviews.length === 0 ? (
                      <p className="text-xs text-ink-400 py-2">No reviews yet.</p>
                    ) : (
                      reviews.slice(0, 5).map((r: any) => (
                        <div key={r.id} className="border-b border-surface-border last:border-0 pb-3 last:pb-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-ink-900">{r.reviewer?.fullName || r.reviewerName || "Anonymous"}</p>
                            <span className="flex items-center gap-0.5 text-xs font-bold text-ink-700">
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {r.rating}
                            </span>
                          </div>
                          {r.createdAt && <p className="text-[10px] text-ink-400">{new Date(r.createdAt).toLocaleDateString()}</p>}
                          {r.comment && <p className="mt-1 text-sm italic text-ink-600">"{r.comment}"</p>}
                        </div>
                      ))
                    )}
                  </div>
                  {reviewCount > reviews.slice(0, 5).length && (
                    <p className="mt-4 text-xs text-ink-400">+{reviewCount - 5} more reviews</p>
                  )}
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
              </>
            )}
          </div>
        </div>
      </div>


      <ProfileEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        initialTab={modalTab}
      />
    </DashboardLayout>
  );
}
