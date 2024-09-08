from django.urls import path
from . import views

urlpatterns = [
    path('game/', views.game_view, name='game'),
    path('update_score/', views.update_score, name='update_score'),
    path('', views.high_score_view, name='high_score'),
]
