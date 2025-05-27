const { canAssignRole, canBan, canUnban, canDelete } = require('../utils/roles');
const { User } = require('../models');  

async function requireAssignPermission(req, res, next) {
  const actor = res.locals.currentUser;     
  const target = await User.findByPk(req.params.userId);

  if (!canAssignRole(actor.role, req.body.role)) {
    return res.status(403).json({ message: 'Insufficient permission to assign role.' });
  }
  next();
}

async function requireBanPermission(req, res, next) {
  const actor = res.locals.currentUser;
  const target = await User.findByPk(req.params.userId);

  if (!target || !canBan(actor.role, target.role)) {
    return res.status(403).json({ message: 'Insufficient permission to ban this user.' });
  }
  next();
}

async function requireUnbanPermission(req, res, next) {
  const actor = res.locals.currentUser;
  if (!canUnban(actor.role)) {
    return res.status(403).json({ message: 'Insufficient permission to unban.' });
  }
  next();
}

module.exports = { requireAssignPermission, requireBanPermission, requireUnbanPermission };
