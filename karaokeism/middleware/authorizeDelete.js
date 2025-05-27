const { Post, Comment, User } = require('../models');
const { canDelete }           = require('../utils/roles');

function authorizeDelete(modelName) {
  return async function (req, res, next) {
    console.log(`[AuthorizeDelete V3 - ${new Date().toISOString()}] Attempting to delete ${modelName}`);
    console.log(`[AuthorizeDelete V3] Request Params:`, req.params);
    if (!res.locals.currentUser || !res.locals.currentUser.id) {
      console.error("[AuthorizeDelete V3] CRITICAL: currentUser or currentUser.id is missing in res.locals.");
      return res.status(401).json({ error: 'Unauthorized: User not properly identified.' });
    }
    const currentUserId = res.locals.currentUser.id;
    console.log(`[AuthorizeDelete V3] Current User ID: ${currentUserId}, Role: ${res.locals.currentUser.role}`);

    let resource;
    let resourceOwnerId; 

    if (modelName === 'post') {
      resource = await Post.findByPk(req.params.id, { 
        include: [{ model: User, as: 'author', required: true }] 
      });
      console.log(`[AuthorizeDelete V3] Fetched Post Resource (ID: ${req.params.id}):`, resource ? resource.toJSON() : 'null');
      if (resource) {
        resourceOwnerId = resource.AuthorID; 
        console.log(`[AuthorizeDelete V3] For Post, resource.AuthorID: ${resource.AuthorID}`);
      }
    } else { 
      const commentId = modelName === 'comment'
        ? req.params.commentId
        : req.params.replyId;
      resource = await Comment.findByPk(commentId, { 
        include: [{ model: User, as: 'author', required: true }] 
      });
      console.log(`[AuthorizeDelete V3] Fetched Comment/Reply Resource (ID: ${commentId}):`, resource ? resource.toJSON() : 'null');
      if (resource) {
        resourceOwnerId = resource.userId; 
        console.log(`[AuthorizeDelete V3] For Comment/Reply, resource.userId: ${resource.userId}`);
      }
    }
    
    if (!resource) {
      console.log(`[AuthorizeDelete V3] ${modelName} with ID ${req.params.id || req.params.commentId || req.params.replyId} not found.`);
      return res.status(404).json({ error: `${modelName.charAt(0).toUpperCase() + modelName.slice(1)} not found` });
    }

    if (!resource.author) { 
      console.error(`[AuthorizeDelete V3] Error: ${modelName} with ID ${resource.id} has no author associated, despite 'required: true'. This is unexpected. Resource data:`, resource.toJSON());
      return res.status(500).json({ error: 'Resource author information is missing or could not be loaded.' });
    }
    
    console.log(`[AuthorizeDelete V3] Determined resourceOwnerId: ${resourceOwnerId}`);
    console.log(`[AuthorizeDelete V3] resource.author (for roles):`, resource.author.toJSON());

    const ownerRole   = resource.author.role;
    const deleterRole = res.locals.currentUser.role;
    
    if (typeof resourceOwnerId === 'undefined') {
        console.error(`[AuthorizeDelete V3] Error: resourceOwnerId is undefined. Cannot perform ownership check.`);
        return res.status(500).json({ error: 'Could not determine resource owner ID.' });
    }

    const isOwner     = resourceOwnerId === currentUserId;

    console.log(`[AuthorizeDelete V3] isOwner check: ${resourceOwnerId} (owner) === ${currentUserId} (currentUser) --> ${isOwner}`);
    console.log(`[AuthorizeDelete V3] deleterRole: ${deleterRole}, ownerRole: ${ownerRole}`);
    
    let canDeleteByRole = false;
    if (typeof deleterRole !== 'undefined' && typeof ownerRole !== 'undefined') {
        canDeleteByRole = canDelete(deleterRole, ownerRole);
        console.log(`[AuthorizeDelete V3] canDelete(${deleterRole}, ${ownerRole}) result: ${canDeleteByRole}`);
    } else {
        console.log(`[AuthorizeDelete V3] Skipping role-based delete check because deleterRole (${deleterRole}) or ownerRole (${ownerRole}) is undefined.`);
    }

    if (isOwner || canDeleteByRole) {
      console.log(`[AuthorizeDelete V3] Permission GRANTED for ${modelName} ID ${resource.id}. isOwner: ${isOwner}, canDeleteByRole: ${canDeleteByRole}`);
      return next();
    }
    
    console.log(`[AuthorizeDelete V3] Permission DENIED for ${modelName} ID ${resource.id}. isOwner: ${isOwner}, canDeleteByRole: ${canDeleteByRole}`);
    return res.status(403).json({ error: 'Forbidden: You do not have permission to delete this resource.' });
  };
}

module.exports = authorizeDelete;