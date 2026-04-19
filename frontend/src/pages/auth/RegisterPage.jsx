import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { HiOutlineAcademicCap, HiOutlineEye, HiOutlineEyeSlash } from 'react-icons/hi2';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';
import { getDefaultRouteForRole, getPasswordStrength } from '../../utils/auth';

const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required'),
    lastName: z.string().trim().min(1, 'Last name is required'),
    email: z.string().email('Enter a valid email address'),
    role: z.enum(['student', 'teacher'], {
      errorMap: () => ({ message: 'Select whether you are a student or teacher' }),
    }),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must include at least 1 uppercase letter')
      .regex(/\d/, 'Password must include at least 1 number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerAccount } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      role: 'student',
      password: '',
      confirmPassword: '',
    },
  });

  const passwordStrength = useMemo(
    () => getPasswordStrength(watch('password')),
    [watch('password')]
  );

  const onSubmit = async (values) => {
    try {
      const nextUser = await registerAccount({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        role: values.role,
        password: values.password,
      });
      toast.success(
        values.role === 'teacher'
          ? 'Teacher account created. Admins have been notified to verify it.'
          : 'Student account created successfully.'
      );
      navigate(getDefaultRouteForRole(nextUser.role), { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to create account');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card w-full max-w-md p-8 shadow-gentle">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <HiOutlineAcademicCap className="text-3xl" />
          </div>
          <p className="mt-4 font-heading text-2xl font-bold">EduFlow</p>
          <p className="mt-2 text-sm text-slate-500">
            Create your account, choose your role, and we will take you straight to the right workspace.
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="firstName">
                First Name
              </label>
              <input id="firstName" className="input" {...register('firstName')} />
              {errors.firstName ? (
                <p className="mt-2 text-sm text-danger">{errors.firstName.message}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="lastName">
                Last Name
              </label>
              <input id="lastName" className="input" {...register('lastName')} />
              {errors.lastName ? (
                <p className="mt-2 text-sm text-danger">{errors.lastName.message}</p>
              ) : null}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="register-email">
              Email
            </label>
            <input id="register-email" type="email" className="input" {...register('email')} />
            {errors.email ? <p className="mt-2 text-sm text-danger">{errors.email.message}</p> : null}
          </div>

          <div>
            <span className="mb-2 block text-sm font-medium text-slate-700">I am joining as</span>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700 transition hover:border-primary/40 hover:bg-primary/5">
                <input type="radio" value="student" className="mt-1 h-4 w-4 text-primary" {...register('role')} />
                <span>
                  <span className="block font-semibold text-slate-900">Student</span>
                  <span className="mt-1 block text-slate-500">
                    Join courses, submit assignments, and track progress.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700 transition hover:border-primary/40 hover:bg-primary/5">
                <input type="radio" value="teacher" className="mt-1 h-4 w-4 text-primary" {...register('role')} />
                <span>
                  <span className="block font-semibold text-slate-900">Teacher</span>
                  <span className="mt-1 block text-slate-500">
                    Build courses, manage lessons, and review student work.
                  </span>
                </span>
              </label>
            </div>
            {errors.role ? <p className="mt-2 text-sm text-danger">{errors.role.message}</p> : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="register-password">
              Password
            </label>
            <div className="relative">
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                className="input pr-12"
                {...register('password')}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-3 inline-flex items-center text-slate-400"
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <HiOutlineEyeSlash className="text-xl" /> : <HiOutlineEye className="text-xl" />}
              </button>
            </div>
            <div className="mt-3" data-testid="password-strength">
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className={`h-2 rounded-full transition-all ${passwordStrength.color} ${passwordStrength.width}`}
                />
              </div>
              <p className="mt-2 text-sm text-slate-500">Strength: {passwordStrength.label}</p>
            </div>
            {errors.password ? (
              <p className="mt-2 text-sm text-danger">{errors.password.message}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                className="input pr-12"
                {...register('confirmPassword')}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-3 inline-flex items-center text-slate-400"
                onClick={() => setShowConfirmPassword((value) => !value)}
              >
                {showConfirmPassword ? (
                  <HiOutlineEyeSlash className="text-xl" />
                ) : (
                  <HiOutlineEye className="text-xl" />
                )}
              </button>
            </div>
            {errors.confirmPassword ? (
              <p className="mt-2 text-sm text-danger">{errors.confirmPassword.message}</p>
            ) : null}
          </div>

          <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:text-primary-hover">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
