package nhi.credential_lifecycle_test

import rego.v1
import data.nhi.credential_lifecycle

test_allow_valid_credential if {
	credential_lifecycle.allow with input as {
		"credential": {
			"type": "jwt",
			"issued_at": "2099-01-01T00:00:00Z",
			"expires_at": "2099-12-31T23:59:59Z",
			"is_static": false,
			"last_rotated": "2099-01-01T00:00:00Z",
			"rotation_max_age_hours": 24,
		},
	}
}

test_deny_expired_credential if {
	not credential_lifecycle.allow with input as {
		"credential": {
			"type": "jwt",
			"issued_at": "2020-01-01T00:00:00Z",
			"expires_at": "2020-01-01T01:00:00Z",
			"is_static": false,
			"last_rotated": "2099-01-01T00:00:00Z",
			"rotation_max_age_hours": 24,
		},
	}
}

test_deny_static_secret if {
	not credential_lifecycle.allow with input as {
		"credential": {
			"type": "jwt",
			"issued_at": "2099-01-01T00:00:00Z",
			"expires_at": "2099-12-31T23:59:59Z",
			"is_static": true,
			"last_rotated": "2099-01-01T00:00:00Z",
			"rotation_max_age_hours": 24,
		},
	}
}

test_denial_reason_expired if {
	reasons := credential_lifecycle.denial_reasons with input as {
		"credential": {
			"type": "jwt",
			"issued_at": "2020-01-01T00:00:00Z",
			"expires_at": "2020-01-01T01:00:00Z",
			"is_static": false,
			"last_rotated": "2099-01-01T00:00:00Z",
			"rotation_max_age_hours": 24,
		},
	}
	some reason in reasons
	reason.violation == "CREDENTIAL_EXPIRED"
}

test_denial_reason_static if {
	reasons := credential_lifecycle.denial_reasons with input as {
		"credential": {
			"type": "jwt",
			"issued_at": "2099-01-01T00:00:00Z",
			"expires_at": "2099-12-31T23:59:59Z",
			"is_static": true,
			"last_rotated": "2099-01-01T00:00:00Z",
			"rotation_max_age_hours": 24,
		},
	}
	some reason in reasons
	reason.violation == "STATIC_SECRET_DETECTED"
}

test_deny_rotation_overdue if {
	not credential_lifecycle.allow with input as {
		"credential": {
			"type": "jwt",
			"issued_at": "2020-01-01T00:00:00Z",
			"expires_at": "2099-12-31T23:59:59Z",
			"is_static": false,
			"last_rotated": "2020-01-01T00:00:00Z",
			"rotation_max_age_hours": 24,
		},
	}
}
