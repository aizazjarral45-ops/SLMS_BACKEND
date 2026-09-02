const { errorResponse } = require('../utils/apiResponse');

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Unauthorized', null, 401);
    }

    const roleName = req.user.role || 'student';
    if (allowedRoles.length && !allowedRoles.includes(roleName)) {
      return errorResponse(res, 'Forbidden', null, 403);
    }

    next();
  };
}

module.exports = { authorize };
