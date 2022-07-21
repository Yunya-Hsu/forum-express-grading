const passport = require('../config/passport')

const authenticated = (req, res, next) => {
  return passport.authenticate('jwt', { session: false })(req, res, next)
}

const authenticatedAdmin = (req, res, next) => {
  if (req.user && req.user.isAdmin) return next()

  return res.status(403).json({ status: 'error', message: 'permission denied' })
}

module.exports = {
  authenticated,
  authenticatedAdmin
}
