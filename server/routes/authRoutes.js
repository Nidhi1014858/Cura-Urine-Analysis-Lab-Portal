import { Router } from 'express';
import { signup, login, getMe, updatePassword, updateProfile } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const authRouter = Router();

authRouter.post('/signup', asyncHandler(signup));
authRouter.post('/login', asyncHandler(login));
authRouter.get('/me', protect, asyncHandler(getMe));
authRouter.patch('/password', protect, asyncHandler(updatePassword));

export const userRouter = Router();
userRouter.patch('/:id', protect, asyncHandler(updateProfile));

export default authRouter;
