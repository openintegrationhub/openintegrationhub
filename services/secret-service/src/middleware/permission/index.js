// const { ADMIN, SERVICE_ACCOUNT } = require('../../constant').ROLE;
// const { MISSING_PERMISSION } = require('../../constant').ERROR_CODE;

// const allRequiredElemsExistsInArray = (array, requiredElems) => {
//     let hit = 0;

//     for (let i = 0; i < requiredElems.length; i += 1) {
//         if (array.indexOf(requiredElems[i]) >= 0) {
//             hit += 1;
//         }
//     }

//     return hit === requiredElems.length;
// };

// module.exports = {

//     hasPermissions: ({ user, requiredPermissions }) => {
//         if (!Array.isArray(requiredPermissions)) {
//             requiredPermissions = [requiredPermissions];
//         }

//         const { role, permissions, currentContext } = user;

//         if (role === ADMIN
//             || (
//                 role === SERVICE_ACCOUNT
//                 && permissions.length
//                 && allRequiredElemsExistsInArray(permissions, requiredPermissions)
//             )
//             || (
//                 currentContext
//                 && currentContext.permissions.length
//                 && allRequiredElemsExistsInArray(currentContext.permissions, requiredPermissions)
//             )
//         ) {
//             return true;
//         }

//         return false;
//     },

//     /**
//      * @param {Array} requiredPermissions
//      * */
//     can: requiredPermissions => async (req, res, next) => {
//         const userHasPermissions = module.exports.hasPermissions({
//             requiredPermissions,
//             user: req.user,
//         });
//         if (userHasPermissions) {
//             return next();
//         }
//         return next({
//             status: 403,
//             message: MISSING_PERMISSION,
//             details: JSON.stringify(requiredPermissions),
//         });
//     },
// };
