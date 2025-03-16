FROM node:18-alpine

WORKDIR /frontend

# Copy package.json and package-lock.json first for better layer caching
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Expose port 5173 (Vite's default dev server port)
EXPOSE 5173

# Start the development server with hot reloading
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"] 