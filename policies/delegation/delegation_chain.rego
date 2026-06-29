package nhi.delegation

import rego.v1

default allow := false

allow if {
	not chain_too_deep
	not privilege_escalation_detected
}

chain_too_deep if {
	count(input.delegation.chain) > input.delegation.max_depth
}

privilege_escalation_detected if {
	some i
	i > 0
	parent := input.delegation.chain[i - 1]
	child := input.delegation.chain[i]
	some scope in child.scopes
	not scope in parent.scopes
}

denial_reasons contains reason if {
	chain_too_deep
	reason := {
		"policy": "delegation_chain",
		"violation": "CHAIN_DEPTH_EXCEEDED",
		"message": sprintf("Delegation chain depth %d exceeds maximum %d", [count(input.delegation.chain), input.delegation.max_depth]),
		"owasp_asi": "ASI08",
		"owasp_nhi": "NHI5",
		"zero_trust_tier": "Enterprise",
	}
}

denial_reasons contains reason if {
	privilege_escalation_detected
	reason := {
		"policy": "delegation_chain",
		"violation": "PRIVILEGE_ESCALATION",
		"message": "An agent in the delegation chain acquired scopes not held by its delegator",
		"owasp_asi": "ASI08",
		"owasp_nhi": "NHI9",
		"zero_trust_tier": "Enterprise",
	}
}
