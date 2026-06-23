package nhi.environment_isolation

import rego.v1

default allow := false

allow if {
	not cross_environment_access
	not nhi_reuse_detected
}

cross_environment_access if {
	input.agent.environment != input.request.target_environment
}

nhi_reuse_detected if {
	agent_envs := data.policy_data.environment_map[input.agent.id]
	count(agent_envs) > 1
}

denial_reasons contains reason if {
	cross_environment_access
	reason := {
		"policy": "environment_isolation",
		"violation": "CROSS_ENVIRONMENT_ACCESS",
		"message": sprintf("Agent in '%s' attempted to access tool in '%s'", [input.agent.environment, input.request.target_environment]),
		"owasp_asi": "ASI08",
		"owasp_nhi": "NHI8",
		"zero_trust_tier": "Enterprise",
	}
}

denial_reasons contains reason if {
	nhi_reuse_detected
	reason := {
		"policy": "environment_isolation",
		"violation": "NHI_REUSE_ACROSS_ENVIRONMENTS",
		"message": sprintf("Agent '%s' is registered in multiple environments: %v", [input.agent.id, data.policy_data.environment_map[input.agent.id]]),
		"owasp_asi": "ASI08",
		"owasp_nhi": "NHI9",
		"zero_trust_tier": "Enterprise",
	}
}
