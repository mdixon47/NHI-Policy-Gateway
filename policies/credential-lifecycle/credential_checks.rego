package nhi.credential_lifecycle

import rego.v1

default allow := false

allow if {
	not credential_expired
	not is_static_secret
	not rotation_overdue
	not disallowed_credential_type
	not excessive_ttl
}

credential_expired if {
	time.parse_rfc3339_ns(input.credential.expires_at) < time.now_ns()
}

is_static_secret if {
	input.credential.is_static == true
}

is_static_secret if {
	input.credential.type == "api_key"
	not input.credential.expires_at
}

rotation_overdue if {
	last_rotated_ns := time.parse_rfc3339_ns(input.credential.last_rotated)
	age_hours := (time.now_ns() - last_rotated_ns) / (1000 * 1000 * 1000 * 3600)
	age_hours > input.credential.rotation_max_age_hours
}

# Only enforced when the central allowlist is defined in policy data.
disallowed_credential_type if {
	allowed := data.policy_data.credential_rules.allowed_credential_types
	not input.credential.type in allowed
}

# Only enforced when a maximum TTL is defined in policy data.
excessive_ttl if {
	max_ttl_hours := data.policy_data.credential_rules.max_ttl_hours
	issued_ns := time.parse_rfc3339_ns(input.credential.issued_at)
	expires_ns := time.parse_rfc3339_ns(input.credential.expires_at)
	ttl_hours := (expires_ns - issued_ns) / (1000 * 1000 * 1000 * 3600)
	ttl_hours > max_ttl_hours
}

denial_reasons contains reason if {
	credential_expired
	reason := {
		"policy": "credential_lifecycle",
		"violation": "CREDENTIAL_EXPIRED",
		"message": sprintf("Credential expired at %s", [input.credential.expires_at]),
		"owasp_asi": "ASI03",
		"owasp_nhi": "NHI4",
		"zero_trust_tier": "Foundation",
	}
}

denial_reasons contains reason if {
	is_static_secret
	reason := {
		"policy": "credential_lifecycle",
		"violation": "STATIC_SECRET_DETECTED",
		"message": "Static or non-expiring credentials are not permitted",
		"owasp_asi": "ASI03",
		"owasp_nhi": "NHI7",
		"zero_trust_tier": "Foundation",
	}
}

denial_reasons contains reason if {
	rotation_overdue
	reason := {
		"policy": "credential_lifecycle",
		"violation": "ROTATION_OVERDUE",
		"message": sprintf("Credential last rotated at %s, exceeds max age of %d hours", [input.credential.last_rotated, input.credential.rotation_max_age_hours]),
		"owasp_asi": "ASI03",
		"owasp_nhi": "NHI7",
		"zero_trust_tier": "Enterprise",
	}
}

denial_reasons contains reason if {
	disallowed_credential_type
	reason := {
		"policy": "credential_lifecycle",
		"violation": "DISALLOWED_CREDENTIAL_TYPE",
		"message": sprintf("Credential type '%s' is not permitted. Allowed: %v", [input.credential.type, data.policy_data.credential_rules.allowed_credential_types]),
		"owasp_asi": "ASI03",
		"owasp_nhi": "NHI7",
		"zero_trust_tier": "Enterprise",
	}
}

denial_reasons contains reason if {
	excessive_ttl
	reason := {
		"policy": "credential_lifecycle",
		"violation": "EXCESSIVE_TTL",
		"message": sprintf("Credential TTL exceeds maximum of %d hours", [data.policy_data.credential_rules.max_ttl_hours]),
		"owasp_asi": "ASI03",
		"owasp_nhi": "NHI4",
		"zero_trust_tier": "Enterprise",
	}
}
