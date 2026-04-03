import type {
  ComplianceProvider,
  ComplianceSubmission,
  ComplianceSubmissionStatus
} from "@hotel-crm/shared/compliance";

type AdapterResult = {
  status: ComplianceSubmissionStatus;
  submittedAt: string | null;
  errorMessage: string;
};

type ComplianceAdapter = {
  submit(submission: ComplianceSubmission): AdapterResult;
};

const manualAdapter: ComplianceAdapter = {
  submit() {
    return {
      status: "submitted",
      submittedAt: new Date().toISOString(),
      errorMessage: ""
    };
  }
};

const mockMvdAdapter: ComplianceAdapter = {
  submit(submission) {
    if (submission.attemptCount === 0 && submission.entityId.includes("glamp")) {
      return {
        status: "failed",
        submittedAt: null,
        errorMessage: "Mock MVD gateway: temporary transport error, retry the submission."
      };
    }

    return {
      status: "submitted",
      submittedAt: new Date().toISOString(),
      errorMessage: ""
    };
  }
};

const mockRosstatAdapter: ComplianceAdapter = {
  submit(submission) {
    if (submission.attemptCount === 0 && submission.entityId.includes("hostel")) {
      return {
        status: "failed",
        submittedAt: null,
        errorMessage: "Mock Rosstat gateway: report rejected for transient schema sync, retry once."
      };
    }

    return {
      status: "submitted",
      submittedAt: new Date().toISOString(),
      errorMessage: ""
    };
  }
};

export function resolveComplianceAdapter(provider: ComplianceProvider): ComplianceAdapter {
  switch (provider) {
    case "mock_mvd_gateway":
      return mockMvdAdapter;
    case "mock_rosstat_gateway":
      return mockRosstatAdapter;
    case "manual":
    default:
      return manualAdapter;
  }
}
