import { ValidationError } from '../domain/projects.js';
import { AuthError } from '../domain/auth.js';
import { StageDocumentApplicabilityError } from '../domain/stageDocumentApplicability.js';
import { StageDocumentStatusError } from '../domain/stageDocumentStatus.js';
import {
  DuplicateProjectCodeError,
  ProjectAuthorizationError,
  ProjectApprovalError,
  ProjectManagerUserError,
  ProjectNotFoundError,
  ProjectOverviewDashboardQueryError,
  ProjectStageNotFoundError,
  ProjectStageAdvanceError
} from '../repositories/projectRepository.js';
import { OperationLogLimitError } from '../repositories/operationLogRepository.js';
import {
  StageDocumentNotFoundError,
  StageDocumentResponsibilityError,
  StageDocumentTaskQueryError
} from '../repositories/stageDocumentRepository.js';
import { StageDocumentAttachmentError } from '../repositories/stageDocumentAttachmentRepository.js';
import { UserManagementError } from '../repositories/userRepository.js';

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route not found: ${req.method} ${req.originalUrl}`
    }
  });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ValidationError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code || 'VALIDATION_ERROR',
        message: error.message,
        details: error.details
      }
    });
    return;
  }

  if (error instanceof DuplicateProjectCodeError) {
    res.status(error.statusCode).json({
      error: {
        code: 'PROJECT_CODE_EXISTS',
        message: 'Project code already exists',
        projectCode: error.projectCode
      }
    });
    return;
  }

  if (error instanceof AuthError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message
      }
    });
    return;
  }

  if (error instanceof ProjectNotFoundError) {
    res.status(error.statusCode).json({
      error: {
        code: 'PROJECT_NOT_FOUND',
        message: 'Project not found',
        projectId: error.projectId
      }
    });
    return;
  }

  if (error instanceof ProjectStageNotFoundError) {
    res.status(error.statusCode).json({
      error: {
        code: 'PROJECT_STAGE_NOT_FOUND',
        message: 'Project stage not found',
        projectId: error.projectId,
        stageId: error.stageId
      }
    });
    return;
  }

  if (error instanceof ProjectAuthorizationError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    });
    return;
  }

  if (error instanceof ProjectApprovalError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    });
    return;
  }

  if (error instanceof ProjectManagerUserError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    });
    return;
  }

  if (error instanceof StageDocumentNotFoundError) {
    res.status(error.statusCode).json({
      error: {
        code: 'STAGE_DOCUMENT_NOT_FOUND',
        message: 'Stage document not found',
        projectId: error.projectId,
        documentId: error.documentId
      }
    });
    return;
  }

  if (error instanceof StageDocumentStatusError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    });
    return;
  }

  if (error instanceof StageDocumentApplicabilityError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    });
    return;
  }

  if (error instanceof StageDocumentResponsibilityError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    });
    return;
  }

  if (error instanceof StageDocumentTaskQueryError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    });
    return;
  }

  if (error instanceof StageDocumentAttachmentError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    });
    return;
  }

  if (error instanceof ProjectStageAdvanceError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    });
    return;
  }

  if (error instanceof ProjectOverviewDashboardQueryError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    });
    return;
  }

  if (error instanceof OperationLogLimitError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message
      }
    });
    return;
  }

  if (error instanceof UserManagementError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    });
    return;
  }

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error'
    }
  });
}
