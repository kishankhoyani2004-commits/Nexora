import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import User from "../models/User.js";

// serializeUser / deserializeUser are required by Passport even when using
// session:false — omitting them causes a runtime error on some versions.
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// ── Google Strategy ──────────────────────────────────────────────────────────
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL || "http://localhost:5000"}/api/auth/google/callback`,
        scope: ["profile", "email"],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email =
            profile.emails?.[0]?.value ?? `google-${profile.id}@gmail.com`;
          const avatar = profile.photos?.[0]?.value ?? "";

          // 1. Look up by googleId first, then by email (account linking)
          let user = await User.findOne({ googleId: profile.id });
          if (!user) user = await User.findOne({ email });

          if (!user) {
            // Brand-new user — no role assigned yet → they'll be sent to /role-select
            user = await User.create({
              fullName: profile.displayName || "Google User",
              email,
              googleId: profile.id,
              avatar,
              provider: "google",
              verified: true,
              // role left undefined intentionally
            });
          } else {
            // Existing user — sync any missing fields
            let dirty = false;
            if (!user.googleId) { user.googleId = profile.id; dirty = true; }
            if (!user.avatar && avatar) { user.avatar = avatar; dirty = true; }
            if (user.provider === "local") { user.provider = "google"; dirty = true; }
            if (dirty) await user.save();
          }

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
}

// ── GitHub Strategy ──────────────────────────────────────────────────────────
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL || "http://localhost:5000"}/api/auth/github/callback`,
        scope: ["user:email"],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email =
            profile.emails?.[0]?.value ?? `${profile.username ?? profile.id}@users.noreply.github.com`;
          const avatar = profile.photos?.[0]?.value ?? "";

          // 1. Look up by githubId, then by email
          let user = await User.findOne({ githubId: profile.id });
          if (!user) user = await User.findOne({ email });

          if (!user) {
            // Brand-new user — no role assigned yet → they'll be sent to /role-select
            user = await User.create({
              fullName: profile.displayName || profile.username || "GitHub User",
              email,
              githubId: String(profile.id),
              githubUsername: profile.username ?? null,
              avatar,
              provider: "github",
              verified: true,
              // role left undefined intentionally
            });
          } else {
            let dirty = false;
            if (!user.githubId) { user.githubId = String(profile.id); dirty = true; }
            if (!user.githubUsername && profile.username) { user.githubUsername = profile.username; dirty = true; }
            if (!user.avatar && avatar) { user.avatar = avatar; dirty = true; }
            if (user.provider === "local") { user.provider = "github"; dirty = true; }
            if (dirty) await user.save();
          }

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
}

export default passport;
