package nhi.delegation_test

import rego.v1
import data.nhi.delegation

test_allow_valid_delegation if {
	delegation.allow with input as {
		"delegation": {
			"chain": [
				{"agent_id": "orchestrator-1", "scopes": ["file_read", "db_query"]},
				{"agent_id": "agent-alpha", "scopes": ["file_read"]},
			],
			"max_depth": 3,
		},
	}
}

test_deny_chain_too_deep if {
	not delegation.allow with input as {
		"delegation": {
			"chain": [
				{"agent_id": "a1", "scopes": ["file_read"]},
				{"agent_id": "a2", "scopes": ["file_read"]},
				{"agent_id": "a3", "scopes": ["file_read"]},
				{"agent_id": "a4", "scopes": ["file_read"]},
			],
			"max_depth": 3,
		},
	}
}

test_deny_privilege_escalation if {
	not delegation.allow with input as {
		"delegation": {
			"chain": [
				{"agent_id": "orchestrator", "scopes": ["file_read"]},
				{"agent_id": "sub-agent", "scopes": ["file_read", "db_query"]},
			],
			"max_depth": 5,
		},
	}
}

test_denial_reason_chain_depth if {
	reasons := delegation.denial_reasons with input as {
		"delegation": {
			"chain": [
				{"agent_id": "a1", "scopes": ["file_read"]},
				{"agent_id": "a2", "scopes": ["file_read"]},
				{"agent_id": "a3", "scopes": ["file_read"]},
				{"agent_id": "a4", "scopes": ["file_read"]},
			],
			"max_depth": 3,
		},
	}
	some reason in reasons
	reason.violation == "CHAIN_DEPTH_EXCEEDED"
}

test_denial_reason_privilege_escalation if {
	reasons := delegation.denial_reasons with input as {
		"delegation": {
			"chain": [
				{"agent_id": "orchestrator", "scopes": ["file_read"]},
				{"agent_id": "sub-agent", "scopes": ["file_read", "db_query"]},
			],
			"max_depth": 5,
		},
	}
	some reason in reasons
	reason.violation == "PRIVILEGE_ESCALATION"
}

test_allow_empty_chain if {
	delegation.allow with input as {
		"delegation": {
			"chain": [],
			"max_depth": 3,
		},
	}
}
