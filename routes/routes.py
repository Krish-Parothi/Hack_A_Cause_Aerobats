from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import base64
import os
import cv2
import numpy as np
import sqlite3
import math
from ultralytics import YOLO
from pydantic import BaseModel

class FacilityCreate(BaseModel):
    name: str
    lat: float
    lng: float

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
model_path = os.path.join(BASE_DIR, "Model", "runs", "yolov8_custom4", "weights", "best.pt")

if os.path.exists(model_path):
    model = YOLO(model_path)
else:
    # Fallback if their custom model isn't at the exact path
    model = YOLO("yolov8n.pt")

DB_NAME = "smart_san.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS facilities
                 (id INTEGER PRIMARY KEY, name TEXT, lat REAL, lng REAL, score INTEGER, grade TEXT, status TEXT)''')
    
    c.execute("SELECT COUNT(*) FROM facilities")
    if c.fetchone()[0] == 0:
        facilities = [
            (1, "Zero Mile Public Toilet", 21.1458, 79.0882, 92, "A", "open"),
            (2, "Sitabuldi Restroom", 21.1412, 79.0849, 63, "C", "open"),
            (3, "Empress Mall Facility", 21.1501, 79.0912, 81, "B", "open"),
            (4, "Mahal Public Toilet", 21.1389, 79.0921, 22, "F", "closed"),
            (5, "Ganeshpeth Facility", 21.1371, 79.0836, 44, "D", "open"),
        ]
        c.executemany("INSERT INTO facilities VALUES (?, ?, ?, ?, ?, ?, ?)", facilities)
        conn.commit()
    conn.close()

init_db()

@app.get("/facilities")
def get_facilities():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM facilities")
    rows = [dict(row) for row in c.fetchall()]
    conn.close()
    return rows

@app.post("/facilities")
def create_facility(fac: FacilityCreate):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("INSERT INTO facilities (name, lat, lng, score, grade, status) VALUES (?, ?, ?, ?, ?, ?)",
              (fac.name, fac.lat, fac.lng, 100, "A", "open"))
    conn.commit()
    new_id = c.lastrowid
    
    # Fetch the newly created record to return it
    conn.row_factory = sqlite3.Row
    c.execute("SELECT * FROM facilities WHERE id = ?", (new_id,))
    new_fac = dict(c.fetchone())
    
    conn.close()
    return new_fac

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0 # Radius of earth in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

@app.get("/facilities/nearby/{facility_id}")
def get_nearby_facilities(facility_id: int):
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    c.execute("SELECT * FROM facilities WHERE id = ?", (facility_id,))
    target_row = c.fetchone()
    if not target_row:
        conn.close()
        return []
        
    target = dict(target_row)
    
    c.execute("SELECT * FROM facilities WHERE id != ? AND status = 'open'", (facility_id,))
    others = [dict(row) for row in c.fetchall()]
    conn.close()

    for o in others:
        o['distance'] = haversine(target['lat'], target['lng'], o['lat'], o['lng'])
    
    others = sorted(others, key=lambda x: (x['distance']))[:3]
    others = sorted(others, key=lambda x: x['score'], reverse=True)
    return others

PENALTY_MAP = {
    "clogged_sink": -15,
    "dirt-floor": -10,
    "dirty": -20,
    "mold_or_mildew": -10,
    "tissue_trash": -5,
    "urine_stain": -15,
    "bottle": -10,
    "cup": -8,
    "trash": -15
}

def score_to_grade(score: int) -> str:
    if score >= 90: return "A"
    if score >= 75: return "B"
    if score >= 60: return "C"
    if score >= 40: return "D"
    return "F"

@app.post("/score/{facility_id}")
@app.post("/detect/{facility_id}")
async def detect(facility_id: int, file: UploadFile = File(...)):
    contents = await file.read()
    np_arr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    results = model(img, conf=0.3)
    detected_img = results[0].plot()

    _, buffer = cv2.imencode(".jpg", detected_img)
    encoded_img = base64.b64encode(buffer).decode("utf-8")

    detections = []
    penalties = 0

    if len(results) > 0:
        for box in results[0].boxes:
            cls_id = int(box.cls[0].item())
            class_name = model.names[cls_id]
            
            if class_name in PENALTY_MAP:
                penalties += PENALTY_MAP[class_name]
            else:
                penalties -= 5
                
            detections.append({
                "class": class_name,
                "confidence": float(box.conf[0].item()),
                "bbox": box.xyxy[0].tolist()
            })

    final_score = max(0, 100 + penalties)
    grade = score_to_grade(final_score)

    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("UPDATE facilities SET score = ?, grade = ? WHERE id = ?", (final_score, grade, facility_id))
    conn.commit()
    conn.close()

    return JSONResponse({
        "score": final_score,
        "grade": grade,
        "method": "YOLOv8 Custom",
        "image_base64": encoded_img,
        "detections": detections,
        "total_detections": len(detections)
    })