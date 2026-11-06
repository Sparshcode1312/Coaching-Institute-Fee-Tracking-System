import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/index.js';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';

/**
 * Enforces role-based authorization.
 * e.g., requireRole('accounts_executive', 'super_admin')
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required to verify permissions.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access denied. Role '${req.user.role}' is not authorized to perform this operation.`
        )
      );
    }

    next();
  };
};

/**
 * Enforces multi-centre data isolation for Accounts Executives.
 * Ensures an accounts executive cannot view or modify students or ledgers belonging to an unauthorized centre.
 */
export const requireCentreAccess = (extractCentreId: (req: Request) => string | undefined) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required.'));
    }

    // Super Admin has global multi-centre visibility
    if (req.user.role === 'super_admin') {
      return next();
    }

    // Parents do not use centre-level authorization; they use student-level relationship checks
    if (req.user.role === 'parent') {
      return next();
    }

    const targetCentreId = extractCentreId(req);
    if (!targetCentreId) {
      return next(new ForbiddenError('Centre identifier is required for centre-level authorization.'));
    }

    const assigned = req.user.assignedCentres || [];
    if (!assigned.includes(targetCentreId)) {
      return next(
        new ForbiddenError(`Access denied. You are not assigned to centre '${targetCentreId}'.`)
      );
    }

    next();
  };
};

