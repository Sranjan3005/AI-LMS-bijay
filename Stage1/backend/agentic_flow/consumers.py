import json
from channels.generic.websocket import AsyncWebsocketConsumer

class AgenticFlowConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # We join a specific group based on the workflow ID
        self.workflow_id = self.scope['url_route']['kwargs']['workflow_id']
        self.group_name = f"workflow_{self.workflow_id}"

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()
        await self.send(text_data=json.dumps({"message": "Connected to Execution Stream!", "status": "connected"}))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    # Receive message from room group (Sent by Celery)
    async def flow_execution_update(self, event):
        # Send message down to the Frontend WebSocket
        await self.send(text_data=json.dumps({
            'message': event.get('message'),
            'node_id': event.get('node_id'),
            'status': event.get('status'),
            'output': event.get('output')
        }))
