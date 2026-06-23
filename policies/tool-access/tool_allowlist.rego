package nhi.tool_access

import rego.v1

default allow := false

allow if {
	agent_permissions := data.policy_data.tool_permissions[input.agent.id]
	input.request.tool in agent_permissions.allowed_tools
}

denial_reasons contains reason if {
	not data.policy_data.tool_permissions[input.agent.id]
	reason := {
		"policy": "tool_allowlist",
		"violation": "AGENT_NOT_REGISTERED",
		"message": sprintf("Agent '%s' is not registered in tool permissions", [input.agent.id]),
		"owasp_asi": "ASI02",
		"owasp_nhi": "NHI5",
		"zero_trust_tier": "Foundation",
	}
}

denial_reasons contains reason if {
	agent_permissions := data.policy_data.tool_permissions[input.agent.id]
	not input.request.tool in agent_permissions.allowed_tools
	reason := {
		"policy": "tool_allowlist",
		"violation": "TOOL_NOT_ALLOWED",
		"message": sprintf("Agent '%s' is not authorized to invoke tool '%s'. Allowed: %v", [input.agent.id, input.request.tool, agent_permissions.allowed_tools]),
		"owasp_asi": "ASI02",
		"owasp_nhi": "NHI5",
		"zero_trust_tier": "Foundation",
	}
}
