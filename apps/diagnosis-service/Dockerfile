FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Generate gRPC stubs at build time so the image is self-contained.
# Output lands in src/ — PYTHONPATH below makes them importable as top-level modules.
RUN python -m grpc_tools.protoc \
    -I proto \
    --python_out=src \
    --grpc_python_out=src \
    proto/diagnosis.proto

ENV PYTHONPATH=/app/src
EXPOSE 8000 50051

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
