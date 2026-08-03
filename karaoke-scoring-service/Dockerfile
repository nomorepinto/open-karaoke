# ==============================================================================
# Dockerfile for AWS Lambda Deployment (Container Image Packaging)
# Base Image: Official AWS Lambda Python 3.11 Base Image
# ==============================================================================
FROM public.ecr.aws/lambda/python:3.11

# Install OS deps + static ffmpeg (not in default AL2 Lambda repos)
RUN yum update -y && \
    yum install -y libsndfile gcc gcc-c++ make tar xz curl && \
    curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz -o /tmp/ffmpeg.tar.xz && \
    tar -xJf /tmp/ffmpeg.tar.xz -C /tmp && \
    cp /tmp/ffmpeg-*-amd64-static/ffmpeg /usr/local/bin/ffmpeg && \
    cp /tmp/ffmpeg-*-amd64-static/ffprobe /usr/local/bin/ffprobe && \
    chmod +x /usr/local/bin/ffmpeg /usr/local/bin/ffprobe && \
    /usr/local/bin/ffmpeg -version && \
    rm -rf /tmp/ffmpeg* && \
    yum clean all

# Copy dependency requirements
COPY requirements.txt ${LAMBDA_TASK_ROOT}/

# Install Python packages directly into Task Root
RUN pip install --default-timeout=1000 --no-cache-dir -r requirements.txt

# Copy application source code into Task Root
COPY app/ ${LAMBDA_TASK_ROOT}/app/

# Set Python path to include task root
ENV PYTHONPATH=${LAMBDA_TASK_ROOT}

# Point to Mangum handler object inside app/main.py
CMD [ "app.main.handler" ]
