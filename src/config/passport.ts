import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

let googleStrategyConfigured = false;

function firstDefinedEnv(keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return undefined;
}

export function getGoogleConfigStatus() {
  const clientID = firstDefinedEnv([
    'GOOGLE_CLIENT_ID',
    'GOOGLE_OAUTH_CLIENT_ID',
    'GOOGLE_AUTH_CLIENT_ID',
  ]);
  const clientSecret = firstDefinedEnv([
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_OAUTH_CLIENT_SECRET',
    'GOOGLE_AUTH_CLIENT_SECRET',
  ]);
  const callbackURL = process.env.GOOGLE_CALLBACK_URL || `${process.env.APP_BASE_URL || 'http://localhost:3000'}/auth/google/callback`;

  return {
    clientID,
    clientSecret,
    callbackURL,
    missing: [
      ...(clientID ? [] : ['GOOGLE_CLIENT_ID']),
      ...(clientSecret ? [] : ['GOOGLE_CLIENT_SECRET']),
    ],
  };
}

export function ensureGoogleStrategyConfigured() {
  if (googleStrategyConfigured) {
    return true;
  }

  const { clientID, clientSecret, callbackURL, missing } = getGoogleConfigStatus();

  if (!clientID || !clientSecret) {
    console.warn(`Google OAuth credentials missing (${missing.join(', ')}). Google Sign-In will not work.`);
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
