package nhi.tool_access_test

import rego.v1
import data.nhi.tool_access

test_allow_registered_agent_with_permitted_tool if {
	tool_access.allow with input as {
		"agent": {"id": "agent-alpha"},
		"request": {"tool": "file_read"},
	}
		with data.policy_data.tool_permissions as {
			"agent-alpha": {"allowed_tools": ["file_read", "db_query"]},
		}
}

test_deny_unregistered_agent if {
	not tool_access.allow with input as {
		"agent": {"id": "unknown-agent"},
		"request": {"tool": "file_read"},
	}
		with data.policy_data.tool_permissions as {
			"agent-alpha": {"allowed_tools": ["file_read"]},
		}
}

test_deny_tool_not_in_allowlist if {
	not tool_access.allow with input as {
		"agent": {"id": "agent-beta"},
		"request": {"tool": "api_call"},
	}
		with data.policy_data.tool_permissions as {
			"agent-beta": {"allowed_tools": ["file_read"]},
		}
}

test_denial_reason_unregistered_agent if {
	reasons := tool_access.denial_reasons with input as {
		"agent": {"id": "unknown-agent"},
		"request": {"tool": "file_read"},
	}
		with data.policy_data.tool_permissions as {
			"agent-alpha": {"allowed_tools": ["file_read"]},
		}
	count(reasons) > 0
	some reason in reasons
	reason.violation == "AGENT_NOT_REGISTERED"
}

test_denial_reason_tool_not_allowed if {
	reasons := tool_access.denial_reasons with input as {
		"agent": {"id": "agent-beta"},
		"request": {"tool": "api_call"},
	}
		with data.policy_data.tool_permissions as {
			"agent-beta": {"allowed_tools": ["file_read"]},
		}
	count(reasons) > 0
	some reason in reasons
	reason.violation == "TOOL_NOT_ALLOWED"
}
