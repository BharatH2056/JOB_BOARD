'use strict';

/**
 * middleware/requireVerified.js
 * ─────────────────────────────
 * Guards employer-only routes that need emailVerified = true.
 * Must be placed AFTER authenticate + requireRole('employer') in the chain,
 * since it relies on req.user.id to fetch the live DB record.
 *
 * Chain example:
 *   router.post('/jobs',
 *     authenticate,
 *     requireRole('employer'),
 *     requireVerified,
 *     createJobHandler
 *   );
 *
 * Why a DB lookup?
 * The JWT payload only carries { id, role }. emailVerified can change after
 * the token is issued (employer verifies email while the old token is live),
 * so we always read the current value from the database.
 */

const User = require('../models/User');

const requireVerified = async (req, res, next) => {
  try {
    // Lean query — only fetch the single field we need
    const user = await User.findById(req.user.id).select('emailVerified').lean();

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        message:
          'Email verification required. Please verify your email before posting jobs.',
      });
    }

    return next();
  } catch (err) {
    return next(err);
  }
};

module.exports = requireVerified;
