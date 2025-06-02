# Use official Node LTS image
FROM node:22

# Install ffmpeg
RUN apt-get update && apt-get install -y ffmpeg

# Set working directory
WORKDIR /process

# Copy package.json files and install backend dependencies
COPY package*.json ./
RUN npm install

# Copy entire project
COPY . .

# Set the env var for Google Cloud auth
ENV GOOGLE_APPLICATION_CREDENTIALS=/process/amazing-smile-461122-a4-02117ea0206d.json

# Expose port (change if needed)
EXPOSE 5001
ENV HOST=0.0.0.0

# Start the server
CMD ["node", "server.js"]
