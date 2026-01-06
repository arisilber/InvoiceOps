# Server Scripts

Utility scripts for managing the InvoiceOps application.

## Create User

Creates a new user account in the database. This is the recommended way to create users in production since registration is disabled.

### Usage

```bash
npm run create-user <email> <password> <name>
```

### Example

```bash
npm run create-user admin@example.com securepassword123 "Admin User"
```

### Direct Usage

```bash
node server/scripts/create-user.js admin@example.com securepassword123 "Admin User"
```

### Requirements

- Email must be unique (not already registered)
- Password must be at least 6 characters
- Name is required

### Notes

- The script will check if the user already exists
- Passwords are automatically hashed using bcrypt
- The user can immediately log in after creation
- Make sure your `.env` file is configured with database credentials

