# Admin Scripts

This directory contains utility scripts for managing the Epic Eats application.

## Make Admin User
Promotes an existing user to the `admin` role.

### Usage
Run this command from the `server` directory:

```bash
node scripts/makeAdmin.js <user_email>
```

### Example
```bash
cd "c:\Epic Eats\server"
node scripts/makeAdmin.js john@example.com
```

### Requirements
- Node.js installed
- MongoDB connection string in `../.env`
- User must already be registered in the database
