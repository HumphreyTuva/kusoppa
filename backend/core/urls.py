from django.urls import include, path
from rest_framework.routers import DefaultRouter, SimpleRouter

from . import staff, views

public = DefaultRouter()
public.register("events", views.EventViewSet, basename="event")
public.register("briefs", views.BriefViewSet, basename="brief")
public.register("board", views.BoardViewSet, basename="board")
public.register("contact", views.ContactViewSet, basename="contact")

manage = SimpleRouter()
manage.register("events", staff.ManageEventViewSet, basename="m-event")
manage.register("briefs", staff.ManageBriefViewSet, basename="m-brief")
manage.register("board", staff.ManageBoardViewSet, basename="m-board")
manage.register("messages", staff.ManageMessageViewSet, basename="m-message")
manage.register("links", staff.ManageLinkViewSet, basename="m-link")
manage.register("semesters", staff.SemesterViewSet, basename="m-semester")
manage.register("payments", staff.PaymentViewSet, basename="m-payment")
manage.register("members", staff.MemberViewSet, basename="m-member")
manage.register("users", staff.UserViewSet, basename="m-user")

urlpatterns = [
    path("auth/register/", views.RegisterView.as_view()),
    path("auth/login/", views.LoginView.as_view()),
    path("auth/google/", views.GoogleAuthView.as_view()),
    path("auth/logout/", views.LogoutView.as_view()),
    path("auth/me/", views.MeView.as_view()),
    path("auth/password-reset/", views.ResetRequestView.as_view()),
    path("auth/password-reset/confirm/", views.ResetConfirmView.as_view()),
    path("membership/info/", views.InfoView.as_view()),
    path("membership/pay/", views.PayView.as_view()),
    path("manage/overview/", staff.OverviewView.as_view()),
    path("manage/settings/", staff.SettingsView.as_view()),
    path("manage/audit/", staff.AuditView.as_view()),
    path("manage/import/preview/", staff.ImportPreviewView.as_view()),
    path("manage/import/apply/", staff.ImportApplyView.as_view()),
    path("manage/import/batches/", staff.BatchListView.as_view()),
    path("manage/import/batches/<int:pk>/undo/", staff.BatchUndoView.as_view()),
    path("manage/export/", staff.ExportView.as_view()),
    path("manage/", include(manage.urls)),
] + public.urls
