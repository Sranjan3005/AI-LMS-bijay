from django.core.management.base import BaseCommand
from agentic_flow.compiler import ReactFlowCompiler

class Command(BaseCommand):
    help = 'Tests the LangGraph compiler with a mock React Flow JSON'

    def handle(self, *args, **options):
        self.stdout.write("--- Starting Compiler Test ---\n")

        # This mocks what the frontend React Flow will send us!
        mock_flow_data = {
            "nodes": [
                {"id": "node-1", "type": "textInput"},
                {"id": "node-2", "type": "customizer"},
                {"id": "node-3", "type": "display"}
            ],
            "edges": [
                {"source": "node-1", "target": "node-2"},
                {"source": "node-2", "target": "node-3"}
            ]
        }

        self.stdout.write("1. Compiling Graph...")
        compiler = ReactFlowCompiler(mock_flow_data)
        app = compiler.compile()
        
        self.stdout.write("2. Invoking Graph with initial state...\n")
        
        # We simulate the student typing this into the text input node
        initial_state = {"input_text": "Explain how black holes work"}
        
        # Run the LangGraph application!
        result = app.invoke(initial_state)

        self.stdout.write("\n--- Execution Complete ---")
        self.stdout.write(f"Final Output Captured: {result.get('final_display')}")
