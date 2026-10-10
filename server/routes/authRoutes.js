import { Router } from 'express';
import { signup, login, getMe, updatePassword, updateProfile } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const authRouter = Router();

authRouter.post('/signup', signup);
authRouter.post('/login', login);
authRouter.get('/me', protect, getMe);
authRouter.patch('/password', protect, updatePassword);

export const userRouter = Router();
userRouter.patch('/:id', protect, updateProfile);

export default authRouter;
