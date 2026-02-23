from ultralytics import YOLO
import os

def train():
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    DATA_PATH = os.path.join(BASE_DIR, "data.yaml")

    model = YOLO("yolov8s.pt")

    model.train(
        data=DATA_PATH,
        epochs=50,
        imgsz=640,
        batch=16,
        device=0,
        project="runs",
        name="yolov8_custom"
    )

if __name__ == "__main__":
    train()