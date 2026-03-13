from fastapi import APIRouter, Response
router = APIRouter()

@router.get('/metrics')
def metrics():
    # Prometheus metrics stub
    return Response('app_up 1\n', media_type='text/plain')
