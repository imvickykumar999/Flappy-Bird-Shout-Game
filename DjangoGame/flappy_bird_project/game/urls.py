from django.urls import path
from . import views
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('game/', views.game_view, name='game'),
    path('update_score/', views.update_score, name='update_score'),
    path('', views.high_score_view, name='high_score'),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
