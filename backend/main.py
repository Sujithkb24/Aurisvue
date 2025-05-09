from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import requests
from pydantic import BaseModel

app = FastAPI()

# CORS setup for allowing requests from your React frontend (localhost:5173)
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Adjust based on your frontend URL
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods
    allow_headers=["*"],  # Allows all headers
)

class TranscriptRequest(BaseModel):
    videoId: str

@app.post("/api/transcript")
async def get_transcript(request: TranscriptRequest):
    video_id = request.videoId
    print(f"Received videoId: {video_id}")  # Debug print
    url = f"https://www.youtube.com/watch?v={video_id}"

    
    try:
        print(f"Fetching transcript from URL: {url}")  # Debug print
        response = requests.get(url)
        response.raise_for_status()
        print("Received transcript response")  # Debug print
        
        # Parse XML response to get the transcript text
        from xml.etree import ElementTree as ET
        root = ET.fromstring(response.content)

        transcript = ""
        for elem in root.findall("body"):
            for s in elem.findall("p"):
                text = s.text
                if text:
                    transcript += text + "\n"

        if not transcript:
            raise HTTPException(status_code=404, detail="No transcript available for this video.")
        
        return {"transcript": transcript.strip()}

    except requests.exceptions.RequestException as err:
        print(f"Error fetching transcript: {err}")  # Debug print
        raise HTTPException(status_code=500, detail=str(err))
