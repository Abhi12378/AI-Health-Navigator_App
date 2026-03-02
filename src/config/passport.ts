import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

let googleStrategyConfigured = false;

export function ensureGoogleStrategyConfigured() {
  if (googleStrategyConfigured) {
    return true;
  }

  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackURL = process.env.GOOGLE_CALLBACK_URL || `${process.env.APP_BASE_URL || 'http://localhost:3000'}/auth/google/callback`;

  if (!clientID || !clientSecret) {
    console.warn('Google OAuth credentials missing. Google Sign-In will not work.');
    return false;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
        scope: ['profile', 'email'],
      },
      (accessToken, refreshToken, profile, done) => {
        return done(null, profile);
      }
    )
  );

  googleStrategyConfigured = true;
  return true;
}

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user: any, done) => {
  done(null, user);
});

export default passport;
