from rest_framework.permissions import BasePermission

STAFF = ("admin", "treasurer", "secretary")


def role_of(user):
    if not user or not user.is_authenticated:
        return None
    if user.is_superuser:
        return "admin"
    p = getattr(user, "profile", None)
    return p.role if p else None


def roles(*allowed):
    class RolePermission(BasePermission):
        def has_permission(self, request, view):
            return role_of(request.user) in allowed
    return RolePermission
