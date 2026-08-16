import { registerUser, loginUser, getUserById } from '../services/authService.js';
import { HTTP_STATUS } from '../utils/constants.js';

// Handles user registration
export const register = async (req, res, next) => {
  try {
    const { name, email, password, role, plan } = req.body;
    const result = await registerUser({ name, email, password, role, plan });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Handles user login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await loginUser({ email, password });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Returns profile of the currently authenticated client
export const getMe = async (req, res, next) => {
  try {
    const user = await getUserById(req.user.userId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};
