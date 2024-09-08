from django.shortcuts import render
from django.http import JsonResponse
from .models import HighScore

def game_view(request):
    high_score = HighScore.objects.order_by('-score').first()  # Get the highest score
    context = {
        'high_score': high_score.score if high_score else 0,
    }
    return render(request, 'game/index.html', context)

def update_score(request):
    if request.method == "POST":
        score = int(request.POST.get('score'))
        player_name = request.POST.get('player_name', 'Anonymous')

        # Check if the new score is a high score
        high_score = HighScore.objects.order_by('-score').first()
        if not high_score or score > high_score.score:
            HighScore.objects.create(player_name=player_name, score=score)

        return JsonResponse({'message': 'Score updated successfully'})
    return JsonResponse({'error': 'Invalid request'}, status=400)

def high_score_view(request):
    high_score = HighScore.objects.order_by('-score').first()  # Get the highest score
    return render(request, 'game/high_score.html', {'high_score': high_score})
