import subprocess
from fastapi import FastAPI, UploadFile, File, Form
import google.generativeai as genai
import os
import tempfile
from pydantic import BaseModel
from dotenv import load_dotenv

import base64
from fastapi.middleware.cors import CORSMiddleware
import shutil
import uuid
import time

load_dotenv()

genai.configure(api_key = os.environ.get("GEMINI_API_KEY")) #type: ignore

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

def model_selection(prompt: str) -> str:
    model = genai.GenerativeModel( # type: ignore
        model_name='gemini-2.5-flash'
    )
    system_instruction = """Interpret the prompt given and determine the best model to use, output only a single word from YOLO, TIMESERIES, MOBILENET """
    response = model.generate_content(f"{system_instruction}\nPrompt: {prompt}")
    return response.text.strip().upper()


def get_agent_prompt(intent: str) -> tuple[str, str]:
    if intent == "YOLO":
        return ("yolo-sandbox", "Write a Python script using 'ultralytics' to load 'yolov8n.pt'. DATA PATH: '/app/data/input.jpg'. OUTPUT PATH: '/app/data/output.jpg'. Output ONLY raw Python code. save the annotated image to the output path.")
    elif intent == "MOBILENET":
        return ("mobilenet-sandbox", "Write a Python script to classify the image at '/app/data/input.jpg'. You MUST load the model using EXACTLY: 'from torchvision.models import mobilenet_v2, MobileNet_V2_Weights; model = mobilenet_v2(weights=MobileNet_V2_Weights.DEFAULT)'. Print the top 3 class names. Output ONLY raw Python code.")
    else:
        return ("data-sandbox", "Write a Python script using 'pandas' and 'sklearn.linear_model' to perform time-series forecasting on the CSV at '/app/data/input.csv'. Save a plot to '/app/data/output.jpg'. Output ONLY raw Python code.")


@app.post("/ai-build")
async def run_dynamic_ai(prompt: str = Form(...), file: UploadFile = File(...)):
    intent = model_selection(prompt)
    container_name, container_instruction = get_agent_prompt(intent)
    model = genai.GenerativeModel( # type: ignore
        model_name='gemini-2.5-flash'
    )

    response = model.generate_content(f"{container_instruction}\nPrompt: {prompt}")
    
    generated_code = response.text.strip()
    
    if generated_code.startswith("```python"):
        generated_code = generated_code[9:-3].strip()
    elif generated_code.startswith("```"):
        generated_code = generated_code[3:-3].strip()
        
    run_id = str(uuid.uuid4())
    run_dir = os.path.abspath(f"./runs/{run_id}")
    os.makedirs(run_dir, exist_ok=True)
    
    try:
        filename = "input.jpg" if intent in ["YOLO", "MOBILENET"] else "input.csv"
        input_image_path = os.path.join(run_dir, filename)
        with open(input_image_path, "wb") as f:
            f.write(await file.read())
            
        script_path = os.path.join(run_dir, "script.py")
        with open(script_path, "w") as f:
            f.write(generated_code)
            
        docker_cmd = [
            "docker", "run", "--rm",
            "--cpus", "1.0",
            "--memory", "512m",
            "--network", "none",
            "-v", f"{run_dir}:/app/data",
            container_name,
            "python", "/app/data/script.py"
        ]
        
        result = subprocess.run(docker_cmd, capture_output=True, text=True)

        time.sleep(3)

        output_image_base64 = None
        output_image_path = os.path.join(run_dir, "output.jpg")
        if os.path.exists(output_image_path):
            with open(output_image_path, "rb") as img_file:
                output_image_base64 = base64.b64encode(img_file.read()).decode('utf-8')
        
        return {
            "intent": intent,
            "generated_code": generated_code,
            "output": result.stdout,
            "error": result.stderr,
            "image_base64": output_image_base64
        }
    finally:
        shutil.rmtree(run_dir, ignore_errors=True)
        
@app.get("/")
def read_root():
    return {"message": "Server is running"}

