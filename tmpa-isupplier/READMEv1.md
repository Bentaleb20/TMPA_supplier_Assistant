# TMPA iSupplier Project

## Description
The TMPA iSupplier project is designed to facilitate supplier interactions through a user-friendly frontend application and a powerful Rasa chatbot backend. This project allows suppliers to register, manage invoices, and receive assistance through a conversational interface.

## Table of Contents
- [Installation](#installation)
- [Usage](#usage)
- [Frontend](#frontend)
- [Backend](#backend)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

## Installation
To set up the project locally, follow these steps:

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd tmpa-isupplier
   ```

2. Install dependencies for the frontend:
   ```bash
   npm install
   ```

3. Navigate to the backend directory and install dependencies:
   ```bash
   cd ../tmpa-bot
   pip install -r requirements.txt
   ```

## Usage
To run the frontend application:
```bash
npm run dev
```

To run the Rasa chatbot:
```bash
rasa run
```

## Frontend
- **Technologies Used**: React, TypeScript, Tailwind CSS, Vite, lucide-react, framer-motion
- **Architecture**:
  - The frontend is structured using React components, utilizing hooks for state management and side effects.
  - The application initializes with `ReactDOM.createRoot` and renders the main `App` component within `React.StrictMode`, which helps identify potential problems in the application.
  - The UI includes a chat interface, sidebar for quick actions, and modals for help and settings.
- **Session Management**:
  - Session IDs are generated using the `newSessionId` function and stored in local storage to maintain user sessions across interactions.
  - The session ID is used to identify user interactions with the Rasa backend, ensuring continuity in conversations.
- **State Management**: 
  - React hooks such as `useState` and `useEffect` are used to manage component state and side effects, allowing for dynamic updates to the UI based on user interactions.
- **Key Features**:
  - Supplier registration
  - Password recovery
  - Invoice management
  - Voice input support using the Web Speech API

## Backend
- **Technologies Used**: Rasa
- **Architecture**:
  - The backend is built using Rasa, which provides natural language understanding and dialogue management.
  - The configuration files define the NLU pipeline, policies, and domain for handling various supplier intents.
- **Endpoints**:
  - The primary endpoint for user interactions is the Rasa webhook, which processes incoming messages and returns responses based on the defined intents and actions.
- **Key Features**:
  - Handles various supplier intents (registration, password recovery, invoice creation)
  - Provides FAQs and guided flows for user assistance

## Security
- **Frontend Security**:
  - Session management is handled using local storage, where a unique session ID is generated for each user session.
  - The application uses tokens for secure communication with the Rasa server, ensuring that only authorized requests are processed.

- **Backend Security**:
  - The Rasa backend is configured to require tokens for API access, adding an additional layer of security to the interactions.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any suggestions or improvements.

## License
This project is licensed under the MIT License.
