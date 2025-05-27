const ROLE_LEVEL = {
  user:          1,
  moderator:     2,
  supermoderator:3,
  admin:         4,
};

function canDelete(deleterRole, ownerRole) {
  const d = ROLE_LEVEL[deleterRole]   || 0;
  const o = ROLE_LEVEL[ownerRole]     || 0;
  // Can delete if deleter is strictly higher level
  return d > o;
}

function isPrivileged(role) {
  return ROLE_LEVEL[role] >= ROLE_LEVEL.moderator;
}

function canAssignRole(actorRole, targetRole) {
  const actorLevel  = ROLE_LEVEL[actorRole]  || 0;
  const targetLevel = ROLE_LEVEL[targetRole] || 0;
  // actor must be admin, and can’t assign someone to a higher level than themselves
  return actorLevel === ROLE_LEVEL.admin && targetLevel <= actorLevel;
}

function canBan(actorRole, targetRole) {
  const actorLevel  = ROLE_LEVEL[actorRole]  || 0;
  const targetLevel = ROLE_LEVEL[targetRole] || 0;
  // Only moderators and above can ban, and only if they outrank the target
  return actorLevel >= ROLE_LEVEL.moderator && actorLevel > targetLevel;
}

function canUnban(actorRole) {
  // Moderators and above can unban
  return ROLE_LEVEL[actorRole] >= ROLE_LEVEL.moderator;
}

module.exports = {
  ROLE_LEVEL,
  canDelete,
  isPrivileged,
  canAssignRole,
  canBan,
  canUnban
};