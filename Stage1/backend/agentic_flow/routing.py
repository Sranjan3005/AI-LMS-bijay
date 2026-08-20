from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/agentic/(?P<workflow_id>[\w-]+)/$', consumers.AgenticFlowConsumer.as_asgi()),
]
