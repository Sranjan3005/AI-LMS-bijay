from locust import HttpUser, task, between
import json

class StudentUser(HttpUser):
    # Simulate a user clicking around every 2 to 5 seconds
    wait_time = between(2, 5)

    def on_start(self):
        # We generated a valid JWT token for your primary user from the Django shell
        self.token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzgyNTA4NzMzLCJpYXQiOjE3ODI1MDUxMzMsImp0aSI6IjcyYzZhZGIwNGIzMDRhMzFiYjQ0ZTFlNmQwNTk2OGRiIiwidXNlcl9pZCI6IjkifQ.h6VuyBIFpF9upcccOqxWxXm0CDOLpzPg-x5AS9lFdjE"
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.token}" 
        }

    @task(3)
    def test_prediction_engine_instant(self):
        """
        Simulates a student hitting the lightning-fast native predict endpoint.
        This tests how many instant predictions the Django web server can handle.
        """
        payload = {
            "experiment_id": "1", # Real ID of your most recent Greenhouse experiment
            "features": {"sunlight_hrs": 8.5, "water_ml": 45.0}
        }
        # Assuming you temporarily disable auth on the endpoint to test it, 
        # or you pass the Authorization header above.
        self.client.post(
            "/api/v1/regression/predict/", 
            data=json.dumps(payload),
            headers=self.headers,
            name="Predict Native (Instant)"
        )

    @task(1)
    def test_prediction_engine_training(self):
        """
        Simulates a student clicking 'Run Model' to trigger background Celery training.
        This tests how well your Celery queue handles a massive spike in workloads.
        """
        payload = {
            "scenario_id": "1ddd80e4-0f3f-4f89-82d7-ec7c2f69b621", # Replace with real scenario ID
            "variant_name": "perfect",
            "student_prompt": ""
        }
        
        # Fire the task to Celery
        with self.client.post("/api/v1/regression/run/", data=json.dumps(payload), headers=self.headers, catch_response=True, name="Dispatch Celery Training") as response:
            if response.status_code == 202:
                task_id = response.json().get('task_id')
                # Optionally, you could simulate the polling here!
            else:
                response.failure(f"Failed to dispatch: {response.status_code}")
