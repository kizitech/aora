const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const bcrypt = require('bcryptjs');
const { prisma } = require('./database');
const logger = require('./logger');

// JWT Strategy
passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
  passReqToCallback: true
}, async (req, jwt_payload, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: jwt_payload.userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        avatarUrl: true,
        walletAddress: true,
        isVerified: true,
        emailVerified: true
      }
    });

    if (user) {
      return done(null, user);
    } else {
      return done(null, false);
    }
  } catch (error) {
    logger.error('JWT Strategy error:', error);
    return done(error, false);
  }
}));

// Local Strategy for email/password login
passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, async (email, password, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        username: true,
        passwordHash: true,
        role: true,
        avatarUrl: true,
        walletAddress: true,
        isVerified: true,
        emailVerified: true
      }
    });

    if (!user) {
      return done(null, false, { message: 'Invalid email or password' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return done(null, false, { message: 'Invalid email or password' });
    }

    // Remove password hash from user object
    const { passwordHash, ...userWithoutPassword } = user;
    return done(null, userWithoutPassword);
  } catch (error) {
    logger.error('Local Strategy error:', error);
    return done(error);
  }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        avatarUrl: true,
        walletAddress: true,
        isVerified: true,
        emailVerified: true
      }
    });

    done(null, user);
  } catch (error) {
    logger.error('Deserialize user error:', error);
    done(error);
  }
});

module.exports = passport;