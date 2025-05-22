# Use official Node LTS image
FROM node:22

# Set working directory
WORKDIR /process

# Copy package.json files and install backend dependencies
COPY package*.json ./
RUN npm install

# Copy entire project
COPY . .

# Expose port (change if needed)
EXPOSE 5001
ENV HOST=0.0.0.0

# Start the server
CMD ["node", "server.js"]
