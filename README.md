# Nüslify

Nüslify is a Progressive Web App built with TypeScript, Node.js, Next.js, and tRPC. It is hosted on Vercel and uses SQL via Planetscale for its database.

## Getting Started

To run the project locally, use the following command:

`npm run dev`

To build the project for production, use the following command:

`npm run build`

This command will create a production-ready build of your application.

To start the production server, use the following command:

`npm run start`

This command will start the server from the production build.

To push the local database state to the remote database, use the following command:

`npm run db:push`

This command will update the remote database to match your local database state.

To open the Drizzle Studio, which provides a GUI for your database, use the following command:

`npm run db:studio`

This command will open Drizzle Studio in your default web browser.

## Environment Variables

The project uses environment variables for configuration. These are stored in a `.env` file. You need to create this file in the root directory of the project. An example how it should look like is in the `.env.example`.

## Architecture

The project has the following directory structure:

- `/pages`: Contains all the pages of the application.
- `/pages/api`: Contains all the cronjob, tRPC and NextAuth configurations.
- `/components`: Contains reusable components.
- `/lib`: Contains utility functions and libraries.
- `/styles`: Contains all the CSS styles.
- `/utils`: Contains the backend utilities
- `/server`: Contains the tRPC API Routes, Authentication, and Database connection.

### Progressive WebApp

- Frontend: TypeScript
- API: tRPC
- Backend: TypeScript, Node.js, Next.js
- Hosting: Vercel
- Database: SQL via Planetscale

## Termine

05.02 19:00: Abgabe vorbereiten (Meeting)
08.02: Vorstellen
