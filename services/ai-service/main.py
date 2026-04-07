from fastapi import FastAPI
from pydantic import BaseModel
import numpy as np

app = FastAPI()

class AnalysisRequest(BaseModel):
    prices: list[float]

@app.post("/analyze")
async def analyze(request: AnalysisRequest):
    prices = np.array(request.prices)
    # Mock analysis logic
    rsi = 35.5
    prediction = "up"
    confidence = 0.85
    
    return {
        "rsi": rsi,
        "prediction": prediction,
        "confidence": confidence,
        "macd": {"histogram": 0.05}
    }

@app.get("/health")
async def health():
    return {"status": "ok"}
