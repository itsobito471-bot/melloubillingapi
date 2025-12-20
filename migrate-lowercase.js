const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const users = await User.find({});
        console.log(`Found ${users.length} users to migrate.`);

        for (let user of users) {
            let updated = false;

            const lowercaseUsername = user.username.toLowerCase();
            const lowercaseEmail = user.email.toLowerCase();

            if (user.username !== lowercaseUsername) {
                user.username = lowercaseUsername;
                updated = true;
            }

            if (user.email !== lowercaseEmail) {
                user.email = lowercaseEmail;
                updated = true;
            }

            if (updated) {
                // We use findOneAndUpdate to avoid triggering pre-save hooks (like password hashing)
                // if we just want to update these fields. However, User.save() is safer if we want
                // to ensure schema validation, but we must be careful with the password.
                // Since this is a simple string case change and lowercase: true is now in schema,
                // save() will also work but let's be explicit and careful.

                await User.updateOne(
                    { _id: user._id },
                    { $set: { username: lowercaseUsername, email: lowercaseEmail } }
                );
                console.log(`Updated user: ${user._id} (${lowercaseUsername})`);
            }
        }

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
