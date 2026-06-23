package nhi.credential_lifecycle

import rego.v1

default allow := false

allow if {
	not credential_expired
	not is_static_secret
	not rotation_overdue
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
