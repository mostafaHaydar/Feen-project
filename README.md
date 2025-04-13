# Feen 
**Feen** is an open-source platform designed to help families reunite with lost members. The name "Feen" translates to "Where" in Arabic, symbolizing the search for lost individuals. This project provides a web interface where users can report missing or found people, and the system will attempt to match individuals based on facial recognition technology.

## Project Overview

Feen is built with the vision to help people in their most difficult times by providing a simple and effective way to search for missing individuals. It is designed to be easily accessible to everyone, and contributions from developers are encouraged.

## Key Features
- **Lost and Found Reports**: Users can report missing persons or found persons, and the system will attempt to find matches.
- **Facial Recognition**: The core functionality relies on facial recognition technology to match lost and found individuals.
- **Arabic Language Support**: The platform currently only supports Arabic language for its user interface.
- **Open Source**: This project is open to contributions from developers to help fix bugs, add features, and improve the system.

## Technologies Used

### Frontend:
- **HTML**: Basic structure and layout of the website.
- **CSS**: Styling and design for the user interface.
- **JavaScript**: For adding interactivity and connecting the frontend to the backend.
- **Arabic Language**: The website is built with Arabic as the primary language and does not support other languages at the moment.

### Backend:
- **Cloudflare Workers**: Used for serverless architecture to handle backend functionality.
- **Neon**: A serverless database for storing reports and user data.
- **Prisma ORM**: Object-relational mapping tool used to interact with the database.

### Main Functionality:
- **Facial Recognition**: The website uses facial recognition technology to match lost persons with found persons based on image reports.
- **Lost and Found Reports**: Users can add reports for both lost and found persons, and the system will search for matches across both types.

## Project Structure

When you visit the GitHub repository, you'll find several folders and files, including:
- **Frontend**: Contains the visual part of the website using HTML, CSS, and JavaScript.
- **Cloudflare Workers**: Handles the backend logic and interactions with the serverless database.
- **Neon Database**: The serverless database used to store user data and reports.

## How to Contribute

We welcome contributions from other developers! Whether you're looking to fix bugs, add features, or improve the platform, you're encouraged to get involved. 

### Steps to contribute:
1. Fork the repository.
2. Create a branch for your feature or bugfix.
3. Make your changes and commit them.
4. Open a pull request to the main branch.

### Setting up the development environment

If you're a developer who wants to contribute, please follow these steps to set up the project:

1. **Install required packages**:
   Run `npm install` to install all the necessary dependencies for the project.

2. **Add `.dev.vars` and `.env` files**:
   - Create a `.dev.vars` file in the root directory of the project and add the following variables:
     ```env
     JWT_SECRET_KEY=""
     DATABASE_URL=""
     LOST_PHOTOS="lost-photos"
     FOUND_PHOTOS="found-photos"
     ENV="development"
     FACE_PLUS_PLUS_KEY=""
     FACE_PLUS_PLUS_SECRET=""
     ```

   - Create a `.env` file in the root directory of the project and add the following variables:
     ```env
     DATABASE_URL=""
     DIRECT_DATABASE_URL=""
     ```

3. After setting up these environment files, you're ready to start contributing to the project!
