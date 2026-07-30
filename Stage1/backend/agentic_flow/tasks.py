import sys
import asyncio
from celery import shared_task
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import AgenticWorkflow
from .compiler import ReactFlowCompiler


@shared_task
def execute_langgraph_pipeline(workflow_id, initial_input="Please provide an input."):
    print(f"🚀 Starting background execution for Workflow ID: {workflow_id}")

    # On Windows the async Redis channel layer needs the selector event loop.
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

    channel_layer = get_channel_layer()
    group_name = f"workflow_{workflow_id}"

    def send_sync(payload):
        async_to_sync(channel_layer.group_send)(group_name, {"type": "flow_execution_update", **payload})

    try:
        workflow = AgenticWorkflow.objects.get(id=workflow_id)
        send_sync({"message": "Starting Graph Compilation...", "status": "running"})

        compiler = ReactFlowCompiler(workflow.flow_data)
        app = compiler.compile()

        # Stream the graph node-by-node so the UI can light each one up live.
        async def run_and_stream():
            outputs = {}
            inputs = {"outputs": {"__initial__": initial_input}, "images": {}, "final_display": ""}
            async for chunk in app.astream(inputs, stream_mode="updates"):
                # chunk = { node_id: <that node's return dict> } (one or more per step)
                for node_id, delta in chunk.items():
                    if not isinstance(delta, dict):
                        continue
                    node_out = delta.get("outputs", {}) or {}
                    outputs.update(node_out)
                    val = node_out.get(node_id)
                    if val is None and node_out:
                        val = list(node_out.values())[-1]
                    await channel_layer.group_send(group_name, {
                        "type": "flow_execution_update",
                        "status": "node_done",
                        "node_id": node_id,
                        "message": f"[{node_id}] finished",
                        "output": {node_id: val} if val is not None else {},
                    })
            return outputs

        outputs_dict = asyncio.run(run_and_stream())
        print("✅ Execution Complete.")

        send_sync({"message": "Pipeline Execution Completed!", "status": "completed", "output": outputs_dict})
        return outputs_dict

    except Exception as e:
        error_msg = str(e)
        print(f"❌ Execution Failed: {error_msg}")
        send_sync({"message": f"Execution Failed: {error_msg}", "status": "failed", "output": None})
        return error_msg
