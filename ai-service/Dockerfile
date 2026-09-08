# BlogForge AI service — FastAPI + LangChain RAG.
# Internal only: this image is never published to a host port. The Node API
# reaches it over the private compose network and nothing else can.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py ./
COPY app ./app

RUN useradd --create-home --uid 10001 aiservice
USER aiservice

EXPOSE 8010

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8010/health', timeout=5).status==200 else 1)"

# Bind 0.0.0.0 *inside the container only* — the port is not published, so the
# only thing that can dial it is another container on the same network.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8010"]
