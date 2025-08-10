## Weather Alert System

This project implements a full-stack weather alert system integrating with the Tomorrow.io API.

---

### Quick Start
To run the entire application (backend API, web frontend, mobile web, database, Redis, Kafka):

```bash
./run-all.sh
```

This single command will:
- Start all Docker services in the background.
- Install Node.js dependencies for both web and mobile.
- Start the React web frontend.
- Start the Expo mobile web app.

Once started, access the applications:
- **Web App:** [http://localhost:3000](http://localhost:3000)
- **Mobile Web App:** [http://localhost:8081](http://localhost:8081)
- **API Health Check:** [http://localhost:4000/health](http://localhost:4000/health)

To stop all services:

```bash
./run-all.sh --stop
```

---

### Submission Guide & Detailed Documentation
For a comprehensive overview of the project, including:
- In-depth setup and testing instructions
- Architectural decisions and best practices
- How scaling and API rate limits (429 errors) are handled
- Details on the mobile app
- Troubleshooting tips and command cheat-sheet

Please refer to the [SUBMISSION_GUIDE.md](SUBMISSION_GUIDE.md) file.
