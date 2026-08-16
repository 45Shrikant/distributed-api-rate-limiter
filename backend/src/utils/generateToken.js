import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

// Generates a signed JSON Web Token encoding client identity, role, and subscription plan.
// In our distributed rate-limiting architecture, embedding 'plan' and 'userId' inside the JWT
// allows edge and middleware layers to immediately classify the user's rate-limit tier
// without querying the persistent MongoDB database on every single incoming API request.
export const generateToken = ({ userId, role, plan }) => {
  return jwt.sign(
    {
      userId: userId.toString(),
      role,
      plan,
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN,
    }
  );
};
