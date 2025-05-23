# Use official Node LTS image
FROM node:22

# Set working directory inside container
WORKDIR /app

# Copy only package.json and package-lock.json for install efficiency
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy client source code
COPY . .

# Expose client port (3000)
EXPOSE 3000

# Set environment variable for React dev server
ENV PORT=3000
ENV HOST=0.0.0.0

# Start React dev server
CMD ["npm", "start"]