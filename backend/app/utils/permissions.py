"""
Single source of truth for role-based access control.

All permission decisions happen here on the server.
The /api/admin/current-user endpoint sends the computed permissions
dict to the frontend so the UI can hide/show navigation — but every
API route enforces the same rules independently via @permission_required,
so a client that tampers with its own JS state still gets 403s.
"""

VALID_ROLES = frozenset({"admin", "developer", "manager", "auditor", "staff", "none"})

# ---------------------------------------------------------------------------
# Permission matrix  —  edit ONLY this dict to change who can do what.
# ---------------------------------------------------------------------------
ROLE_PERMISSIONS: dict[str, dict[str, bool]] = {
    "developer": {
        "dashboard":            True,
        "requests":             True,
        "transactions":         True,
        "documents":            True,
        "logs":                 True,
        "settings":             True,
        "developers":           True,
        "view_request_details": True,
    },
    "admin": {
        "dashboard":            True,
        "requests":             True,
        "transactions":         True,
        "documents":            True,
        "logs":                 True,
        "settings":             True,
        "developers":           False,
        "view_request_details": True,
    },
    "manager": {
        "dashboard":            True,
        "requests":             True,
        "transactions":         False,
        "documents":            True,
        "logs":                 True,
        "settings":             False,
        "developers":           False,
        "view_request_details": True,
    },
    "auditor": {
        "dashboard":            True,
        "requests":             False,
        "transactions":         True,
        "documents":            False,
        "logs":                 False,
        "settings":             False,
        "developers":           False,
        "view_request_details": True,
    },
    "staff": {
        "dashboard":            True,
        "requests":             True,
        "transactions":         False,
        "documents":            False,
        "logs":                 False,
        "settings":             False,
        "developers":           False,
        "view_request_details": True,
    },
    "none": {
        "dashboard":            False,
        "requests":             False,
        "transactions":         False,
        "documents":            False,
        "logs":                 False,
        "settings":             False,
        "developers":           False,
        "view_request_details": False,
    },
}


def normalize_role(role: str | None) -> str:
    """Return a safe, lowercased role string. Falls back to 'none'."""
    if not role:
        return "none"
    normalized = role.strip().lower()
    return normalized if normalized in VALID_ROLES else "none"


def get_permissions(role: str) -> dict[str, bool]:
    """Return the full permission dict for a role."""
    return ROLE_PERMISSIONS.get(normalize_role(role), ROLE_PERMISSIONS["none"])


def has_permission(role: str, feature: str) -> bool:
    """Return True if the role has access to the given feature."""
    return get_permissions(role).get(feature, False)