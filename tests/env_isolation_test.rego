package nhi.environment_isolation_test

import rego.v1
import data.nhi.environment_isolation

test_allow_same_environment if {
	environment_isolation.allow with input as {
		"agent": {"id": "agent-alpha", "environment": "production"},
		"request": {"target_environment": "production"},
	}
		with data.policy_data.environment_map as {
			"agent-alpha": ["production"],
		}
}

test_deny_cross_environment if {
	not environment_isolation.allow with input as {
		"agent": {"id": "agent-beta", "environment": "development"},
		"request": {"target_environment": "production"},
	}
		with data.policy_data.environment_map as {
			"agent-beta": ["development"],
		}
}

test_deny_nhi_reuse_across_environments if {
	not environment_isolation.allow with input as {
		"agent": {"id": "agent-delta", "environment": "development"},
		"request": {"target_environment": "development"},
	}
		with data.policy_data.environment_map as {
			"agent-delta": ["development", "production"],
		}
}

test_denial_reason_cross_environment if {
	reasons := environment_isolation.denial_reasons with input as {
		"agent": {"id": "agent-beta", "environment": "development"},
		"request": {"target_environment": "production"},
	}
		with data.policy_data.environment_map as {
			"agent-beta": ["development"],
		}
	some reason in reasons
	reason.violation == "CROSS_ENVIRONMENT_ACCESS"
}

test_denial_reason_nhi_reuse if {
	reasons := environment_isolation.denial_reasons with input as {
		"agent": {"id": "agent-delta", "environment": "development"},
		"request": {"target_environment": "development"},
	}
		with data.policy_data.environment_map as {
			"agent-delta": ["development", "production"],
		}
	some reason in reasons
	reason.violation == "NHI_REUSE_ACROSS_ENVIRONMENTS"
}
